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
