import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IConversation extends Document {
  participantIds: Types.ObjectId[]
  lastMessage?: Types.ObjectId
  lastMessageTime?: Date
  createdAt: Date
  updatedAt: Date
  isParticipant(userId: Types.ObjectId): boolean
  getOtherParticipant(userId: Types.ObjectId): Types.ObjectId | null
}

const ConversationSchema = new Schema<IConversation>(
  {
    participantIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      required: [true, 'Participants are required'],
      validate: [
        {
          validator: function (participants: Types.ObjectId[]) {
            return participants.length === 2
          },
          message: 'A conversation must have exactly 2 participants',
        },
      ],
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: false,
    },
    lastMessageTime: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for fast participant lookup
// This allows efficient queries like: find conversations where user A and user B are participants
ConversationSchema.index(
  { participantIds: 1 },
  { 
    unique: true,
    partialFilterExpression: { participantIds: { $size: 2 } } // Only apply to conversations with exactly 2 participants
  }
)

// Additional index for lastMessageTime sorting
ConversationSchema.index({ lastMessageTime: -1 })

// Index for efficient participant queries
ConversationSchema.index({ participantIds: 1, updatedAt: -1 })

// Instance method to check if a user is a participant
ConversationSchema.methods.isParticipant = function (userId: Types.ObjectId): boolean {
  return this.participantIds.some((id: any) => id.equals(userId))
}

// Instance method to get the other participant (excluding the current user)
ConversationSchema.methods.getOtherParticipant = function (userId: Types.ObjectId): Types.ObjectId | null {
  const otherParticipants = this.participantIds.filter((id: any) => !id.equals(userId))
  return otherParticipants.length === 1 ? otherParticipants[0] : null
}

// Static method to find or create a conversation between two users
ConversationSchema.statics.findOrCreateConversation = async function (
  userId1: Types.ObjectId,
  userId2: Types.ObjectId
): Promise<IConversation> {
  // Sort the IDs to ensure consistent ordering (user with smaller ID first)
  const sortedIds = [userId1, userId2].sort()
  
  // Try to find existing conversation
  let conversation = await this.findOne({
    participantIds: { $all: sortedIds, $size: 2 },
  }).populate('participantIds', 'name email avatar')
  
  if (!conversation) {
    // Create new conversation
    conversation = new this({
      participantIds: sortedIds,
    })
    await conversation.save()
    await conversation.populate('participantIds', 'name email avatar')
  }
  
  return conversation
}

// Static method to get conversations for a user
ConversationSchema.statics.getUserConversations = async function (
  userId: Types.ObjectId,
  limit: number = 50,
  skip: number = 0
): Promise<IConversation[]> {
  return this.find({
    participantIds: { $in: [userId] },
  })
    .sort({ lastMessageTime: -1, updatedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('participantIds', 'name email avatar')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'senderId',
        select: 'name email avatar'
      }
    })
}

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)