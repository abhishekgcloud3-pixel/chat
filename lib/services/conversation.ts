import { Types } from 'mongoose'
import { 
  getOrCreateConversation as getOrCreateConversationDB,
  getUserConversations as getUserConversationsDB,
  Conversation,
  Message,
  IConversation,
  IMessage
} from '@/lib/db'

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  user1Id: string | Types.ObjectId,
  user2Id: string | Types.ObjectId
): Promise<IConversation> {
  return getOrCreateConversationDB(user1Id, user2Id)
}

/**
 * Get conversation between two specific users (doesn't create if not exists)
 */
export async function getConversationBetween(
  user1Id: string | Types.ObjectId,
  user2Id: string | Types.ObjectId
): Promise<IConversation | null> {
  const objectId1 = typeof user1Id === 'string' ? new Types.ObjectId(user1Id) : user1Id
  const objectId2 = typeof user2Id === 'string' ? new Types.ObjectId(user2Id) : user2Id
  
  // Sort the IDs to ensure consistent ordering (same as in the model)
  const sortedIds = [objectId1, objectId2].sort()
  
  const conversation = await Conversation.findOne({
    participantIds: { $all: sortedIds, $size: 2 },
  }).populate('participantIds', 'name email avatar').populate('lastMessage')
  
  return conversation
}

/**
 * Check if user is participant in conversation
 */
export async function isUserParticipant(
  conversationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
): Promise<boolean> {
  const conversationObjectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId
  
  const conversation = await Conversation.findById(conversationObjectId)
  if (!conversation) {
    return false
  }
  
  return conversation.isParticipant(userObjectId)
}

/**
 * Get conversation with full details for a specific user
 */
export async function getConversationForUser(
  conversationId: string | Types.ObjectId,
  userId: string | Types.ObjectId
): Promise<IConversation | null> {
  const conversationObjectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId
  
  const conversation = await Conversation.findById(conversationObjectId)
    .populate('participantIds', 'name email avatar')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'senderId',
        select: 'name email avatar'
      }
    })
  
  if (!conversation) {
    return null
  }
  
  // Check if user is a participant
  if (!conversation.isParticipant(userObjectId)) {
    return null
  }
  
  return conversation
}

/**
 * Update conversation's last message information
 */
export async function updateConversationLastMessage(
  conversationId: string | Types.ObjectId,
  message: IMessage
): Promise<void> {
  const conversationObjectId = typeof conversationId === 'string' ? new Types.ObjectId(conversationId) : conversationId
  
  await Conversation.findByIdAndUpdate(conversationObjectId, {
    lastMessage: message._id,
    lastMessageTime: message.createdAt,
  })
}

/**
 * Validate that both users exist before creating conversation
 */
export async function validateUsersExist(
  user1Id: string | Types.ObjectId,
  user2Id: string | Types.ObjectId
): Promise<{ valid: boolean; error?: string }> {
  const { User } = await import('@/lib/db')
  
  const objectId1 = typeof user1Id === 'string' ? new Types.ObjectId(user1Id) : user1Id
  const objectId2 = typeof user2Id === 'string' ? new Types.ObjectId(user2Id) : user2Id
  
  const [user1, user2] = await Promise.all([
    User.findById(objectId1),
    User.findById(objectId2)
  ])
  
  if (!user1) {
    return { valid: false, error: 'User 1 not found' }
  }
  
  if (!user2) {
    return { valid: false, error: 'User 2 not found' }
  }
  
  if (user1._id.equals(user2._id)) {
    return { valid: false, error: 'Cannot create conversation with yourself' }
  }
  
  return { valid: true }
}