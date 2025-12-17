import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { Message, MessageStatus } from '@/lib/db'
import { verifyAuth } from '@/lib/middleware/auth'
import { isUserParticipant } from '@/lib/services/conversation'
import { Types } from 'mongoose'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PATCH /api/messages/[id]/seen
 * Mark message as seen
 */
export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const messageId = params.id

    // Find the message
    const message = await Message.findById(messageId)
      .populate('conversationId', 'participantIds')
      .populate('senderId', 'name email avatar')
      .populate('recipientId', 'name email avatar')

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant in the conversation
    const isParticipant = await isUserParticipant(message.conversationId._id.toString(), userId)
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Check if user is the recipient of the message
    if (!message.recipientId._id.toString().equals(userId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only mark messages sent to you as seen' },
        { status: 403 }
      )
    }

    // Check if message is already seen
    if (message.status === MessageStatus.SEEN) {
      return NextResponse.json({
        success: true,
        message: {
          id: message._id.toString(),
          status: message.status,
          seenAt: message.seenAt,
        },
        alreadySeen: true,
      })
    }

    // Mark message as seen
    await message.markAsSeen()

    // Format response
    const formattedMessage = {
      id: message._id.toString(),
      conversationId: message.conversationId._id.toString(),
      content: message.content,
      imageUrl: message.imageUrl || null,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      seenAt: message.seenAt,
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
    }

    // TODO: Trigger real-time notification here
    // This would integrate with WebSocket or Server-Sent Events
    // to notify the sender that their message has been seen

    return NextResponse.json({
      success: true,
      message: formattedMessage,
    })
  } catch (error) {
    console.error('Error marking message as seen:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to mark message as seen' },
      { status: 500 }
    )
  }
}