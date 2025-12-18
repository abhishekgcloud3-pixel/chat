import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import CallLog from '@/lib/db/models/CallLog'
import { connectDB } from '@/lib/db'
import { createSupabaseClient } from '@/lib/realtime/supabase'

interface EndCallRequest {
  callId: string
  duration?: number
}

async function handler(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { callId, duration = 0 } = (await req.json()) as EndCallRequest

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

    // Update call state to ended
    await (Call as any).updateCallState(callId, 'ended')

    // Update call log
    const endTime = new Date()
    await CallLog.updateOne(
      { callId },
      {
        status: 'ended',
        endTime,
        duration,
      }
    )

    // Delete the call from active calls
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
            event: 'call_ended',
            payload: {
              callId,
              duration,
            },
          })
      }
    } catch (error) {
      console.warn('Failed to send notification:', error)
    }

    return NextResponse.json({
      callId,
      status: 'ended',
      duration,
    })
  } catch (error) {
    console.error('Error ending call:', error)
    return NextResponse.json(
      { error: 'Failed to end call' },
      { status: 500 }
    )
  }
}

export const POST = withAuthPOST(handler)
