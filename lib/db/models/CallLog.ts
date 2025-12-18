import mongoose, { Schema, Document, Types } from 'mongoose'

export enum CallStatus {
  RINGING = 'ringing',
  ACTIVE = 'active',
  DECLINED = 'declined',
  MISSED = 'missed',
  FAILED = 'failed',
  ENDED = 'ended',
}

export interface ICallLog extends Document {
  callId: string
  initiatorId: Types.ObjectId
  recipientId: Types.ObjectId
  conversationId: Types.ObjectId
  status: CallStatus
  startTime?: Date
  endTime?: Date
  duration?: number
  createdAt: Date
  updatedAt: Date
}

const CallLogSchema = new Schema<ICallLog>(
  {
    callId: {
      type: String,
      required: [true, 'Call ID is required'],
      unique: true,
      index: true,
    },
    initiatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Initiator ID is required'],
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CallStatus),
      default: CallStatus.RINGING,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
    duration: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for performance
CallLogSchema.index({ initiatorId: 1, createdAt: -1 })
CallLogSchema.index({ recipientId: 1, createdAt: -1 })
CallLogSchema.index({ conversationId: 1, createdAt: -1 })
CallLogSchema.index({ status: 1, createdAt: -1 })
CallLogSchema.index({ initiatorId: 1, recipientId: 1, createdAt: -1 })

// Static method to get call history for a user
CallLogSchema.statics.getUserCallHistory = async function (
  userId: Types.ObjectId,
  limit: number = 50,
  skip: number = 0
): Promise<ICallLog[]> {
  return this.find({
    $or: [{ initiatorId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('initiatorId', 'name email avatar')
    .populate('recipientId', 'name email avatar')
    .populate('conversationId', 'participantIds')
}

// Static method to get call statistics for a user
CallLogSchema.statics.getCallStats = async function (userId: Types.ObjectId) {
  const stats = await this.aggregate([
    {
      $match: {
        $or: [{ initiatorId: userId }, { recipientId: userId }],
      },
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ended'] }, 1, 0],
          },
        },
        missedCalls: {
          $sum: {
            $cond: [{ $eq: ['$status', 'missed'] }, 1, 0],
          },
        },
        declinedCalls: {
          $sum: {
            $cond: [{ $eq: ['$status', 'declined'] }, 1, 0],
          },
        },
        totalDuration: {
          $sum: {
            $cond: [{ $eq: ['$status', 'ended'] }, '$duration', 0],
          },
        },
        avgDuration: {
          $avg: {
            $cond: [{ $eq: ['$status', 'ended'] }, '$duration', null],
          },
        },
      },
    },
  ])

  return stats[0] || {
    totalCalls: 0,
    completedCalls: 0,
    missedCalls: 0,
    declinedCalls: 0,
    totalDuration: 0,
    avgDuration: 0,
  }
}

// Static method to create a call log entry
CallLogSchema.statics.createCallLog = async function (
  callId: string,
  initiatorId: Types.ObjectId,
  recipientId: Types.ObjectId,
  conversationId: Types.ObjectId,
  status: CallStatus = CallStatus.RINGING
): Promise<ICallLog> {
  const callLog = new this({
    callId,
    initiatorId,
    recipientId,
    conversationId,
    status,
  })
  await callLog.save()
  return callLog
}

export default mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema)
