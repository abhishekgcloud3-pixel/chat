// User types
export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

// Chat/Message types
export interface Message {
  id: string
  content: string
  senderId: string
  roomId: string
  createdAt: Date
  updatedAt: Date
}

// Room/Conversation types
export interface Room {
  id: string
  name: string
  participants: string[]
  createdAt: Date
  updatedAt: Date
}
