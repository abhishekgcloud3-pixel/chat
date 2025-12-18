import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import CallLog from '@/lib/db/models/CallLog'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'
import { createSupabaseClient } from '@/lib/realtime/supabase'

interface AnswerCallRequest {
  callId: string
}

async function handler(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { callId } = (await req.json()) as AnswerCallRequest

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      )
    }

    const recipientId = req.userId
    if (!recipientId) {
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

    // Verify the user is the recipient
    if (call.recipientId.toString() !== recipientId) {
      return NextResponse.json(
        { error: 'You are not the recipient of this call' },
        { status: 403 }
      )
    }

    // Update call state to answered
    await (Call as any).updateCallState(callId, 'answered')

    // Update call log
    await CallLog.updateOne(
      { callId },
      {
        status: 'active',
        startTime: new Date(),
      }
    )

    // Send notification to initiator via Supabase
    try {
      const supabaseClient = createSupabaseClient()
      if (supabaseClient) {
        await supabaseClient
          .channel(`user-calls-${call.initiatorId.toString()}`)
          .send('broadcast', {
            event: 'call_answered',
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
      status: 'active',
    })
  } catch (error) {
    console.error('Error answering call:', error)
    return NextResponse.json(
      { error: 'Failed to answer call' },
      { status: 500 }
    )
  }
}

export const POST = withAuthPOST(handler)
