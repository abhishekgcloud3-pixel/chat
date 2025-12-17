import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { sendMessage as sendMessageDB, getOrCreateConversation } from '@/lib/db'
import { verifyAuth } from '@/lib/middleware/auth'
import { getOrCreateConversation as getOrCreateConversationService, validateUsersExist } from '@/lib/services/conversation'
import { MessageStatus } from '@/lib/db'
import { Types } from 'mongoose'

/**
 * POST /api/messages
 * Send message to recipient
 * Body: { conversationId?, recipientId, content, imageUrl? }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Parse request body
    const body = await req.json()
    const { conversationId: providedConversationId, recipientId, content, imageUrl } = body

    // Validate required fields
    if (!recipientId || !content) {
      return NextResponse.json(
        { error: 'Bad request', message: 'recipientId and content are required' },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Message content cannot be empty' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Message content cannot exceed 1000 characters' },
        { status: 400 }
      )
    }

    // Get user ID from token payload
    const senderId = payload.userId
    if (!senderId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    // Validate users exist
    const validation = await validateUsersExist(senderId, recipientId)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Bad request', message: validation.error },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversationId = providedConversationId
    if (!conversationId) {
      // Create new conversation if not provided
      const conversation = await getOrCreateConversationService(senderId, recipientId)
      conversationId = conversation._id.toString()
    } else {
      // Validate provided conversation exists and user is participant
      const { getConversationForUser } = await import('@/lib/services/conversation')
      const conversation = await getConversationForUser(conversationId, senderId)
      if (!conversation) {
        return NextResponse.json(
          { error: 'Bad request', message: 'Invalid conversation ID or user not participant' },
          { status: 400 }
        )
      }
    }

    // Send the message
    const message = await sendMessageDB(
      conversationId,
      senderId,
      recipientId,
      content.trim(),
      imageUrl
    )

    // Format response
    const formattedMessage = {
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
    }

    return NextResponse.json({
      success: true,
      message: formattedMessage,
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to send message' },
      { status: 500 }
    )
  }
}