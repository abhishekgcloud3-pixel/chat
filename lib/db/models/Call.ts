import mongoose, { Schema, Document, Types } from 'mongoose'

export enum CallState {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  ANSWERED = 'answered',
  ACTIVE = 'active',
  ENDED = 'ended',
  DECLINED = 'declined',
  FAILED = 'failed',
}

export interface ICall extends Document {
  callId: string
  initiatorId: Types.ObjectId
  recipientId: Types.ObjectId
  conversationId: Types.ObjectId
  state: CallState
  offerSDP?: string
  answerSDP?: string
  iceCandidates: Array<{
    candidate: string
    sdpMLineIndex?: number
    sdpMid?: string
  }>
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const CallSchema = new Schema<ICall>(
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
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient ID is required'],
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },
    state: {
      type: String,
      enum: Object.values(CallState),
      default: CallState.INITIATED,
      required: true,
    },
    offerSDP: {
      type: String,
      required: false,
    },
    answerSDP: {
      type: String,
      required: false,
    },
    iceCandidates: {
      type: [
        {
          candidate: {
            type: String,
            required: true,
          },
          sdpMLineIndex: {
            type: Number,
            required: false,
          },
          sdpMid: {
            type: String,
            required: false,
          },
        },
      ],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
)

// Index for cleanup of expired calls
CallSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Static method to find active call between two users
CallSchema.statics.findActiveCall = async function (
  userId1: Types.ObjectId,
  userId2: Types.ObjectId
): Promise<ICall | null> {
  return this.findOne({
    $or: [
      { initiatorId: userId1, recipientId: userId2 },
      { initiatorId: userId2, recipientId: userId1 },
    ],
    state: { $in: [CallState.RINGING, CallState.ANSWERED, CallState.ACTIVE] },
  })
}

// Static method to create a new call
CallSchema.statics.createCall = async function (
  callId: string,
  initiatorId: Types.ObjectId,
  recipientId: Types.ObjectId,
  conversationId: Types.ObjectId
): Promise<ICall> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  const call = new this({
    callId,
    initiatorId,
    recipientId,
    conversationId,
    state: CallState.INITIATED,
    expiresAt,
  })
  await call.save()
  return call
}

// Static method to update call state
CallSchema.statics.updateCallState = async function (
  callId: string,
  state: CallState
): Promise<ICall | null> {
  return this.findOneAndUpdate(
    { callId },
    { state, updatedAt: new Date() },
    { new: true }
  )
}

// Static method to add ICE candidate
CallSchema.statics.addIceCandidate = async function (
  callId: string,
  candidate: string,
  sdpMLineIndex?: number,
  sdpMid?: string
): Promise<ICall | null> {
  return this.findOneAndUpdate(
    { callId },
    {
      $push: {
        iceCandidates: {
          candidate,
          sdpMLineIndex,
          sdpMid,
        },
      },
    },
    { new: true }
  )
}

// Static method to update SDP offers/answers
CallSchema.statics.updateSDP = async function (
  callId: string,
  sdpType: 'offer' | 'answer',
  sdp: string
): Promise<ICall | null> {
  const updateField = sdpType === 'offer' ? 'offerSDP' : 'answerSDP'
  return this.findOneAndUpdate(
    { callId },
    { [updateField]: sdp, updatedAt: new Date() },
    { new: true }
  )
}

// Static method to get call by ID
CallSchema.statics.getCallById = async function (callId: string): Promise<ICall | null> {
  return this.findOne({ callId })
    .populate('initiatorId', 'name email avatar')
    .populate('recipientId', 'name email avatar')
}

export default mongoose.models.Call || mongoose.model<ICall>('Call', CallSchema)
