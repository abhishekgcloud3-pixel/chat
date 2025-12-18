import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import { sendMessage as sendMessageDB } from '@/lib/db'
import { withAuthPOST } from '@/lib/middleware/auth'
import { AuthenticationError, ValidationError } from '@/lib/errors/ApiError'
import { getOrCreateConversation as getOrCreateConversationService, validateUsersExist } from '@/lib/services/conversation'
import { asyncHandler, successResponse } from '@/lib/errors/handlers'
import { Types } from 'mongoose'

/**
 * POST /api/messages
 * Send message to recipient
 * Body: { conversationId?, recipientId, content, imageUrl? }
 */
export const POST = withAuthPOST(async (req) => {
  await connectDB()

  // Parse request body
  const body = await req.json()
  const { conversationId: providedConversationId, recipientId, content, imageUrl } = body

  // Validate required fields
  if (!recipientId || !content) {
    throw new ValidationError('recipientId and content are required')
  }

  // Validate content length
  if (content.trim().length === 0) {
    throw new ValidationError('Message content cannot be empty')
  }

  if (content.length > 1000) {
    throw new ValidationError('Message content cannot exceed 1000 characters')
  }

  // Get user ID from authenticated request
  const senderId = req.userId
  if (!senderId) {
    throw new AuthenticationError('User ID not found in token')
  }

  // Validate users exist
  const validation = await validateUsersExist(senderId, recipientId)
  if (!validation.valid) {
    throw new ValidationError(validation.error || 'Invalid users')
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
      throw new ValidationError('Invalid conversation ID or user not participant')
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

  return successResponse({ message: formattedMessage }, undefined, 201)
})