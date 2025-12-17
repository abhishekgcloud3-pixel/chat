import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { getUserConversations, getOrCreateConversation, User } from '@/lib/db'
import { verifyAuth } from '@/lib/middleware/auth'
import { Types } from 'mongoose'

/**
 * GET /api/conversations
 * List all conversations for authenticated user
 * Query params: limit (default: 50), skip (default: 0), search (optional)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
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

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    // Get user ID from token payload
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    // If search query, search for users instead of conversations
    if (search) {
      const searchRegex = new RegExp(search, 'i')
      const users = await User.find({
        $or: [
          { email: searchRegex },
          { name: searchRegex },
        ],
        _id: { $ne: userId },
      })
        .select('_id name email avatar')
        .limit(10)

      const formattedUsers = users.map((user: any) => ({
        id: user._id.toString(),
        name: user.name || user.email,
        email: user.email,
        avatar: user.avatar || null,
      }))

      return NextResponse.json({
        success: true,
        users: formattedUsers,
      })
    }

    // Get conversations for the user
    const conversations = await getUserConversations(userId, limit, skip)

    // Format conversations for response
    const formattedConversations = conversations.map((conversation: any) => ({
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
    }))

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      pagination: {
        limit,
        skip,
        hasMore: conversations.length === limit,
      }
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/conversations
 * Create a new conversation with a user
 * Body: { recipientId }
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

    // Get user ID from token payload
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { recipientId } = body

    // Validate required fields
    if (!recipientId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'recipientId is required' },
        { status: 400 }
      )
    }

    // Cannot create conversation with self
    if (userId === recipientId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Cannot create conversation with yourself' },
        { status: 400 }
      )
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(userId, recipientId)

    // Format conversation for response
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

    return NextResponse.json({
      success: true,
      conversation: formattedConversation,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}