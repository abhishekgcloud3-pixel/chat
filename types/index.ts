// User types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  mobileNumber?: string
  createdAt: Date
  updatedAt: Date
}

// Chat/Message types
export interface Message {
  id: string
  content: string
  senderId: string
  roomId: string
  imageUrl?: string
  status: 'sent' | 'delivered' | 'seen'
  createdAt: Date
  updatedAt: Date
  seenAt?: Date
}

// Room/Conversation types
export interface Room {
  id: string
  name: string
  participants: string[]
  createdAt: Date
  updatedAt: Date
}

// Conversation type (for list display)
export interface Conversation {
  id: string
  participants: User[]
  lastMessage?: Message
  lastMessageTime?: string
  createdAt: Date
  updatedAt: Date
  unreadCount?: number
}

// WebRTC Call types
export enum CallStatus {
  RINGING = 'ringing',
  ACTIVE = 'active',
  DECLINED = 'declined',
  MISSED = 'missed',
  FAILED = 'failed',
  ENDED = 'ended',
}

export interface Call {
  id: string
  callId: string
  initiatorId: string
  recipientId: string
  conversationId: string
  status: CallStatus
  startTime?: Date
  endTime?: Date
  duration?: number
  createdAt: Date
  updatedAt: Date
}

export interface CallLog {
  id: string
  callId: string
  initiatorId: string
  recipientId: string
  conversationId: string
  status: CallStatus
  startTime?: Date
  endTime?: Date
  duration?: number
  createdAt: Date
  updatedAt: Date
}

export interface IncomingCallNotification {
  callId: string
  initiatorId: string
  initiatorName: string
  initiatorAvatar?: string
  conversationId: string
}

export interface CallStats {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  declinedCalls: number
  totalDuration: number
  avgDuration: number
}
