import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { getUserConversations, getOrCreateConversation, User } from '@/lib/db'
import { withAuthGET, withAuthPOST } from '@/lib/middleware/auth'
import { AuthenticationError, ValidationError } from '@/lib/errors/ApiError'
import { asyncHandler, successResponse, paginatedResponse } from '@/lib/errors/handlers'

/**
 * GET /api/conversations
 * List all conversations for authenticated user
 * Query params: limit (default: 50), skip (default: 0), search (optional)
 */
export const GET = withAuthGET(async (req) => {
  await connectDB()

  // Parse query parameters
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
  const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

  // Get user ID from authenticated request
  const userId = req.userId
  if (!userId) {
    throw new AuthenticationError('User ID not found in token')
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

    return successResponse({ users: formattedUsers })
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
      createdAt: conversation.lastMessage.createdAt,
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

  return paginatedResponse(formattedConversations, {
    page: Math.floor(skip / limit) + 1,
    limit,
    total: conversations.length, // Note: This should come from the actual count in a real implementation
    pages: Math.ceil(conversations.length / limit),
  })
})

/**
 * POST /api/conversations
 * Create a new conversation with a user
 * Body: { recipientId }
 */
export const POST = withAuthPOST(async (req) => {
  await connectDB()

  // Get user ID from authenticated request
  const userId = req.userId
  if (!userId) {
    throw new AuthenticationError('User ID not found in token')
  }

  // Parse request body
  const body = await req.json()
  const { recipientId } = body

  // Validate required fields
  if (!recipientId) {
    throw new ValidationError('recipientId is required')
  }

  // Cannot create conversation with self
  if (userId === recipientId) {
    throw new ValidationError('Cannot create conversation with yourself')
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
      createdAt: conversation.lastMessage.createdAt,
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

  return successResponse({ conversation: formattedConversation }, undefined, 201)
})