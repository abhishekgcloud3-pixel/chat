import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import CallLog from '@/lib/db/models/CallLog'
import Conversation from '@/lib/db/models/Conversation'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'
import { createSupabaseClient } from '@/lib/realtime/supabase'
import { randomUUID } from 'crypto'

interface InitiateCallRequest {
  conversationId: string
  recipientId: string
}

async function handler(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { conversationId, recipientId } = (await req.json()) as InitiateCallRequest

    if (!conversationId || !recipientId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const initiatorId = req.userId
    if (!initiatorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify conversation exists and both users are participants
    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const initiatorObjId = new Types.ObjectId(initiatorId)
    const recipientObjId = new Types.ObjectId(recipientId)

    if (!conversation.isParticipant(initiatorObjId) || !conversation.isParticipant(recipientObjId)) {
      return NextResponse.json(
        { error: 'User is not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Check if there's already an active call between these users
    const existingCall = await (Call as any).findActiveCall(initiatorObjId, recipientObjId)
    if (existingCall) {
      return NextResponse.json(
        { error: 'Call already in progress' },
        { status: 409 }
      )
    }

    // Create new call
    const callId = randomUUID()
    const callDocument = await (Call as any).createCall(
      callId,
      initiatorObjId,
      recipientObjId,
      new Types.ObjectId(conversationId)
    )

    // Create call log entry
    await (CallLog as any).createCallLog(
      callId,
      initiatorObjId,
      recipientObjId,
      new Types.ObjectId(conversationId),
      'ringing'
    )

    // Send real-time notification via Supabase
    try {
      const supabaseClient = createSupabaseClient()
      if (supabaseClient) {
        await supabaseClient
          .channel(`user-calls-${recipientId}`)
          .send('broadcast', {
            event: 'incoming_call',
            payload: {
              callId,
              initiatorId,
              conversationId,
            },
          })
      }
    } catch (error) {
      console.warn('Failed to send realtime notification:', error)
    }

    return NextResponse.json({
      callId,
      initiatorId,
      recipientId,
      conversationId,
      status: 'ringing',
    })
  } catch (error) {
    console.error('Error initiating call:', error)
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    )
  }
}

export const POST = withAuthPOST(handler)
