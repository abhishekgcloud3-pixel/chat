import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import CallLog from '@/lib/db/models/CallLog'
import { connectDB } from '@/lib/db'
import { createSupabaseClient } from '@/lib/realtime/supabase'

interface DeclineCallRequest {
  callId: string
}

async function handler(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { callId } = (await req.json()) as DeclineCallRequest

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      )
    }

    const userId = req.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the call
    const call = await (Call as any).getCallById(callId)
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Update call state to declined
    await (Call as any).updateCallState(callId, 'declined')

    // Update call log
    await CallLog.updateOne(
      { callId },
      {
        status: 'declined',
        endTime: new Date(),
      }
    )

    // Delete the call from active calls (TTL will handle it anyway)
    await Call.deleteOne({ callId })

    // Send notification to the other participant via Supabase
    try {
      const supabaseClient = createSupabaseClient()
      if (supabaseClient) {
        const otherUserId = call.initiatorId.toString() === userId 
          ? call.recipientId.toString() 
          : call.initiatorId.toString()

        await supabaseClient
          .channel(`user-calls-${otherUserId}`)
          .send('broadcast', {
            event: 'call_declined',
            payload: {
              callId,
            },
          })
      }
    } catch (error) {
      console.warn('Failed to send notification:', error)
    }

    return NextResponse.json({
      callId,
      status: 'declined',
    })
  } catch (error) {
    console.error('Error declining call:', error)
    return NextResponse.json(
      { error: 'Failed to decline call' },
      { status: 500 }
    )
  }
}

export const POST = withAuthPOST(handler)
