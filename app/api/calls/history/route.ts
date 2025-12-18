import { NextRequest, NextResponse } from 'next/server'
import { withAuthGET } from '@/lib/middleware/auth'
import CallLog from '@/lib/db/models/CallLog'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'

async function handler(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const userId = req.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status')
    const conversationId = searchParams.get('conversationId')

    const userObjectId = new Types.ObjectId(userId)

    // Build query
    const query: any = {
      $or: [{ initiatorId: userObjectId }, { recipientId: userObjectId }],
    }

    if (status) {
      query.status = status
    }

    if (conversationId) {
      query.conversationId = new Types.ObjectId(conversationId)
    }

    // Get total count
    const total = await CallLog.countDocuments(query)

    // Get call history
    const calls = await (CallLog as any).getUserCallHistory(userObjectId, limit, skip)

    // Filter by additional criteria if needed
    let filteredCalls = calls
    if (status) {
      filteredCalls = calls.filter((call: any) => call.status === status)
    }
    if (conversationId) {
      filteredCalls = calls.filter(
        (call: any) => call.conversationId.toString() === conversationId
      )
    }

    return NextResponse.json({
      calls: filteredCalls.map((call: any) => ({
        id: call._id.toString(),
        callId: call.callId,
        initiatorId: call.initiatorId._id.toString(),
        initiatorName: call.initiatorId.name || 'Unknown',
        initiatorAvatar: call.initiatorId.avatar,
        recipientId: call.recipientId._id.toString(),
        recipientName: call.recipientId.name || 'Unknown',
        recipientAvatar: call.recipientId.avatar,
        conversationId: call.conversationId.toString(),
        status: call.status,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration || 0,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
      })),
      total,
      limit,
      skip,
    })
  } catch (error) {
    console.error('Error getting call history:', error)
    return NextResponse.json(
      { error: 'Failed to get call history' },
      { status: 500 }
    )
  }
}

export const GET = withAuthGET(handler)
