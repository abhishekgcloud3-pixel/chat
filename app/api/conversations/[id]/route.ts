import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { getConversationMessages, markMessagesAsSeen } from '@/lib/db'
import { verifyAuth } from '@/lib/middleware/auth'
import { getConversationForUser, isUserParticipant } from '@/lib/services/conversation'
import { Types } from 'mongoose'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/conversations/[id]
 * Fetch conversation details with message history
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

    const conversationId = params.id

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

    // Get conversation details
    const conversation = await getConversationForUser(conversationId, userId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages for the conversation
    const messages = await getConversationMessages(conversationId, limit, skip)

    // Mark messages as seen for the current user
    await markMessagesAsSeen(conversationId, userId)

    // Format conversation details
    const formattedConversation = {
      id: conversation._id.toString(),
      participants: (conversation.participantIds as any[]).map((participant: any) => ({
        id: participant._id.toString(),
        name: participant.name,
        email: participant.email,
        avatar: participant.avatar || null,
      })),
      lastMessage: conversation.lastMessage && (conversation.lastMessage as any).content ? {
        id: conversation.lastMessage._id.toString(),
        content: (conversation.lastMessage as any).content,
        imageUrl: (conversation.lastMessage as any).imageUrl || null,
        status: (conversation.lastMessage as any).status,
        createdAt: (conversation.lastMessage as any).createdAt,
        sender: {
          id: (conversation.lastMessage as any).senderId._id.toString(),
          name: (conversation.lastMessage as any).senderId.name,
          avatar: (conversation.lastMessage as any).senderId.avatar || null,
        }
      } : null,
      lastMessageTime: conversation.lastMessageTime,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }

    // Format messages
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
        name: message.senderId.name,
        email: message.senderId.email,
        avatar: message.senderId.avatar || null,
      },
      recipient: {
        id: message.recipientId._id.toString(),
        name: message.recipientId.name,
        email: message.recipientId.email,
        avatar: message.recipientId.avatar || null,
      },
    }))

    return NextResponse.json({
      success: true,
      conversation: formattedConversation,
      messages: formattedMessages,
      pagination: {
        limit,
        skip,
        hasMore: messages.length === limit,
      }
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}