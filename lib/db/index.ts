// Export all models
export { default as User, type IUser } from './models/User'
export { default as OTP, type IOTP } from './models/OTP'
export { default as Conversation, type IConversation } from './models/Conversation'
export { default as Message, type IMessage, MessageStatus } from './models/Message'
export { default as Call, type ICall, CallState } from './models/Call'
export { default as CallLog, type ICallLog, CallStatus } from './models/CallLog'

// Export connection function
export { connectDB, disconnectDB } from './connection'

import { connectDB } from './connection'
import User, { type IUser } from './models/User'
import Conversation, { type IConversation } from './models/Conversation'
import Message, { type IMessage, MessageStatus } from './models/Message'
import { Types } from 'mongoose'

// Get the model instances with static methods
const ConversationModel = Conversation as any
const MessageModel = Message as any

// Utility Functions

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  userId1: string | Types.ObjectId,
  userId2: string | Types.ObjectId
): Promise<IConversation> {
  const objectId1 = typeof userId1 === 'string' ? new Types.ObjectId(userId1) : userId1
  const objectId2 = typeof userId2 === 'string' ? new Types.ObjectId(userId2) : userId2

  return ConversationModel.findOrCreateConversation(objectId1, objectId2)
}

/**
 * Get conversations for a user with pagination
 */
export async function getUserConversations(
  userId: string | Types.ObjectId,
  limit: number = 50,
  skip: number = 0
): Promise<IConversation[]> {
  const objectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId
  return ConversationModel.getUserConversations(objectId, limit, skip)
}

// Custom implementation with proper lastMessage population - removed since model handles it

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string | Types.ObjectId,
  limit: number = 50,
  skip: number = 0
): Promise<IMessage[]> {
  const objectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  return MessageModel.getConversationMessages(objectId, limit, skip)
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string | Types.ObjectId,
  senderId: string | Types.ObjectId,
  recipientId: string | Types.ObjectId,
  content: string,
  imageUrl?: string
): Promise<IMessage> {
  const conversationObjectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  const senderObjectId = typeof senderId === 'string' ? new Types.ObjectId(senderId) : senderId
  const recipientObjectId = typeof recipientId === 'string' ? new Types.ObjectId(recipientId) : recipientId

  // Create the message
  const message = new Message({
    conversationId: conversationObjectId,
    senderId: senderObjectId,
    recipientId: recipientObjectId,
    content,
    imageUrl,
    status: MessageStatus.SENT,
  })

  await message.save()

  // Update conversation's last message info
  await Conversation.findByIdAndUpdate(conversationObjectId, {
    lastMessage: message._id,
    lastMessageTime: message.createdAt,
  })

  // Populate sender and recipient info
  await message.populate('senderId', 'name email avatar')
  await message.populate('recipientId', 'name email avatar')

  return message
}

/**
 * Mark messages as seen in a conversation
 */
export async function markMessagesAsSeen(
  conversationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
): Promise<number> {
  const conversationObjectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId

  return MessageModel.markMessagesAsSeen(conversationObjectId, userObjectId)
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string | Types.ObjectId): Promise<number> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId
  return MessageModel.countDocuments({
    recipientId: userObjectId,
    status: { $ne: MessageStatus.SEEN },
  })
}

/**
 * Get unread messages for a user
 */
export async function getUnreadMessages(
  userId: string | Types.ObjectId,
  limit: number = 50
): Promise<IMessage[]> {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId
  return MessageModel.getUnreadMessages(userObjectId, limit)
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase() })
}

/**
 * Find user by mobile number
 */
export async function findUserByMobile(mobileNumber: string): Promise<IUser | null> {
  return User.findOne({ mobileNumber })
}

/**
 * Create or update user
 */
export async function createOrUpdateUser(userData: {
  email: string
  name?: string
  mobileNumber?: string
  avatar?: string
  passwordHash?: string
}): Promise<IUser> {
  const { email, ...otherData } = userData
  
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { ...otherData, email: email.toLowerCase() },
    { new: true, upsert: true }
  )

  return user
}

/**
 * Initialize database connection (useful for API routes)
 */
export async function initializeDB(): Promise<void> {
  await connectDB()
}