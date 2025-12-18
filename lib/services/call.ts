import CallLog from '@/lib/db/models/CallLog'
import Call from '@/lib/db/models/Call'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'
import { CallStatus as CallStatusEnum } from '@/lib/db/models/CallLog'

export interface CallHistoryQuery {
  userId: string
  limit?: number
  skip?: number
  status?: string
  conversationId?: string
}

export interface CallStatsResult {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  declinedCalls: number
  totalDuration: number
  avgDuration: number
}

/**
 * Log a call to the database
 */
export async function logCall(
  callId: string,
  initiatorId: string,
  recipientId: string,
  conversationId: string,
  status: string,
  duration?: number,
  startTime?: Date,
  endTime?: Date
): Promise<any> {
  await connectDB()

  const callLog = new CallLog({
    callId,
    initiatorId: new Types.ObjectId(initiatorId),
    recipientId: new Types.ObjectId(recipientId),
    conversationId: new Types.ObjectId(conversationId),
    status,
    duration: duration || 0,
    startTime: startTime || new Date(),
    endTime: endTime || null,
  })

  return callLog.save()
}

/**
 * Get call history for a user
 */
export async function getCallHistory(query: CallHistoryQuery): Promise<any[]> {
  await connectDB()

  const userObjectId = new Types.ObjectId(query.userId)
  const limit = query.limit || 50
  const skip = query.skip || 0

  const findQuery: any = {
    $or: [{ initiatorId: userObjectId }, { recipientId: userObjectId }],
  }

  if (query.status) {
    findQuery.status = query.status
  }

  if (query.conversationId) {
    findQuery.conversationId = new Types.ObjectId(query.conversationId)
  }

  return CallLog.find(findQuery)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('initiatorId', 'name email avatar')
    .populate('recipientId', 'name email avatar')
    .populate('conversationId', 'participantIds')
}

/**
 * Get call statistics for a user
 */
export async function getCallStats(userId: string): Promise<CallStatsResult> {
  await connectDB()

  const userObjectId = new Types.ObjectId(userId)

  const result = await (CallLog as any).getCallStats(userObjectId)

  return {
    totalCalls: result.totalCalls || 0,
    completedCalls: result.completedCalls || 0,
    missedCalls: result.missedCalls || 0,
    declinedCalls: result.declinedCalls || 0,
    totalDuration: result.totalDuration || 0,
    avgDuration: result.avgDuration || 0,
  }
}

/**
 * Get a specific call log entry
 */
export async function getCallLog(callId: string): Promise<any> {
  await connectDB()

  return CallLog.findOne({ callId })
    .populate('initiatorId', 'name email avatar')
    .populate('recipientId', 'name email avatar')
    .populate('conversationId', 'participantIds')
}

/**
 * Update call log with end details
 */
export async function updateCallEnd(
  callId: string,
  status: string,
  duration: number
): Promise<any> {
  await connectDB()

  return CallLog.findOneAndUpdate(
    { callId },
    {
      status,
      duration,
      endTime: new Date(),
    },
    { new: true }
  )
}

/**
 * Mark call as missed
 */
export async function markCallAsMissed(callId: string): Promise<any> {
  await connectDB()

  return CallLog.findOneAndUpdate(
    { callId },
    {
      status: 'missed',
      endTime: new Date(),
    },
    { new: true }
  )
}

/**
 * Get active call between two users
 */
export async function getActiveCall(userId1: string, userId2: string): Promise<any> {
  await connectDB()

  const userObjId1 = new Types.ObjectId(userId1)
  const userObjId2 = new Types.ObjectId(userId2)

  return (Call as any).findActiveCall(userObjId1, userObjId2)
}

/**
 * Clean up expired calls
 */
export async function cleanupExpiredCalls(): Promise<number> {
  await connectDB()

  const result = await Call.deleteMany({
    expiresAt: { $lt: new Date() },
  })

  return result.deletedCount || 0
}
