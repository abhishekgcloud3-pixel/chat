// Placeholder for real-time communication setup
// This could be used for WebSocket configuration with Socket.io or similar

export interface SocketConfig {
  url: string
  autoConnect: boolean
  reconnection: boolean
  reconnectionDelay: number
  reconnectionDelayMax: number
}

export const defaultSocketConfig: SocketConfig = {
  url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
}
