import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { getConversationMessages } from '@/lib/db'
import { verifyAuth } from '@/lib/middleware/auth'
import { isUserParticipant } from '@/lib/services/conversation'
import { Types } from 'mongoose'

interface RouteParams {
  params: {
    conversationId: string
  }
}

/**
 * GET /api/messages/conversation/[conversationId]
 * Fetch messages for conversation
 * Query params: limit (default: 50), skip (default: 0)
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    // Verify authentication
    const payload = await verifyAuth(req)
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Ensure database connection
    await connectDB()

    // Get user ID from token payload
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    const conversationId = params.conversationId

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    // Check if user is a participant in this conversation
    const isParticipant = await isUserParticipant(conversationId, userId)
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Get messages for the conversation
    const messages = await getConversationMessages(conversationId, limit, skip)

    // Format messages for response
    const formattedMessages = messages.map((message: any) => ({
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      content: message.content,
      imageUrl: message.imageUrl || null,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      seenAt: message.seenAt || null,
      sender: {
        id: message.senderId._id.toString(),
        name: (message.senderId as any).name,
        email: (message.senderId as any).email,
        avatar: (message.senderId as any).avatar || null,
      },
      recipient: {
        id: message.recipientId._id.toString(),
        name: (message.recipientId as any).name,
        email: (message.recipientId as any).email,
        avatar: (message.recipientId as any).avatar || null,
      },
    }))

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      pagination: {
        limit,
        skip,
        hasMore: messages.length === limit,
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}