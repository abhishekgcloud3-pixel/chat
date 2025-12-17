import mongoose, { Schema, Document, Types } from 'mongoose'

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  SEEN = 'seen',
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId
  senderId: Types.ObjectId
  recipientId: Types.ObjectId
  content: string
  imageUrl?: string
  status: MessageStatus
  createdAt: Date
  updatedAt: Date
  seenAt?: Date
  isFromUser(userId: Types.ObjectId): boolean
  markAsSeen(): Promise<void>
  markAsDelivered(): Promise<void>
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [1000, 'Message content cannot exceed 1000 characters'],
    },
    imageUrl: {
      type: String,
      required: false,
      match: [/^https?:\/\/.+/, 'Please provide a valid image URL'],
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
      required: true,
    },
    seenAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: -1 }) // For fetching conversation messages
MessageSchema.index({ senderId: 1, createdAt: -1 }) // For user's sent messages
MessageSchema.index({ recipientId: 1, status: 1, createdAt: -1 }) // For unread messages
MessageSchema.index({ conversationId: 1, status: 1, createdAt: -1 }) // For message status updates

// Compound index for efficient message status updates
MessageSchema.index({ conversationId: 1, senderId: 1, recipientId: 1, createdAt: -1 })

// Instance method to check if message is from a specific user
MessageSchema.methods.isFromUser = function (userId: Types.ObjectId): boolean {
  return this.senderId.equals(userId)
}

// Instance method to mark message as seen
MessageSchema.methods.markAsSeen = async function (): Promise<void> {
  if (this.status !== MessageStatus.SEEN) {
    this.status = MessageStatus.SEEN
    this.seenAt = new Date()
    await this.save()
  }
}

// Instance method to mark message as delivered
MessageSchema.methods.markAsDelivered = async function (): Promise<void> {
  if (this.status === MessageStatus.SENT) {
    this.status = MessageStatus.DELIVERED
    await this.save()
  }
}

// Static method to get unread messages for a user
MessageSchema.statics.getUnreadMessages = async function (
  userId: Types.ObjectId,
  limit: number = 50
): Promise<IMessage[]> {
  return this.find({
    recipientId: userId,
    status: { $ne: MessageStatus.SEEN },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name email avatar')
    .populate('conversationId', 'participantIds')
}

// Static method to get messages for a conversation
MessageSchema.statics.getConversationMessages = async function (
  conversationId: Types.ObjectId,
  limit: number = 50,
  skip: number = 0
): Promise<IMessage[]> {
  return this.find({ conversationId })
    .sort({ createdAt: -1 }) // Most recent first
    .limit(limit)
    .skip(skip)
    .populate('senderId', 'name email avatar')
    .populate('recipientId', 'name email avatar')
}

// Static method to mark multiple messages as seen
MessageSchema.statics.markMessagesAsSeen = async function (
  conversationId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<number> {
  const result = await this.updateMany(
    {
      conversationId,
      recipientId: userId,
      status: { $ne: MessageStatus.SEEN },
    },
    {
      status: MessageStatus.SEEN,
      seenAt: new Date(),
    }
  )
  return result.modifiedCount
}

// Static method to validate message before creation
MessageSchema.statics.validateMessage = async function (
  conversationId: Types.ObjectId,
  senderId: Types.ObjectId,
  recipientId: Types.ObjectId
): Promise<{ valid: boolean; error?: string }> {
  const Conversation = mongoose.model('Conversation')
  const conversation = await Conversation.findById(conversationId)
  
  if (!conversation) {
    return { valid: false, error: 'Conversation not found' }
  }
  
  if (!conversation.participantIds.some((id: any) => id.equals(senderId))) {
    return { valid: false, error: 'Sender is not a participant in this conversation' }
  }
  
  if (!conversation.participantIds.some((id: any) => id.equals(recipientId))) {
    return { valid: false, error: 'Recipient is not a participant in this conversation' }
  }
  
  return { valid: true }
}

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)