/**
 * Conversation polling hook for real-time conversation updates
 */

import { useEffect, useCallback } from 'react'
import { usePolling, useNetworkStatus, useLocalState } from './usePolling'
import { useMessageSync } from './messageSync'

export interface Conversation {
  id: string
  participants?: Array<{
    id: string
    name: string
    email: string
    avatar?: string | null
  }>
  participantIds?: string[]
  participantDetails?: Array<{
    id: string
    name: string
    email: string
    avatar?: string | null
  }>
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    senderId: string
    imageUrl?: string | null
    sender?: {
      id: string
      name: string
      avatar?: string | null
    }
  }
  lastMessageTime?: string
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

interface UseConversationsOptions {
  pollInterval?: number
  enabled?: boolean
  onNewConversation?: (conversation: Conversation) => void
  onConversationUpdate?: (conversation: Conversation) => void
}

interface UseConversationsReturn {
  conversations: Conversation[]
  isLoading: boolean
  error: Error | null
  isPolling: boolean
  lastUpdate: number | null
  refresh: () => void
  dataVersion: number
}

/**
 * Custom hook for real-time conversation updates using polling
 */
export function useConversations(options: UseConversationsOptions = {}): UseConversationsReturn {
  const {
    pollInterval = 3000, // 3 seconds as specified
    enabled = true,
    onNewConversation,
    onConversationUpdate
  } = options

  const {
    isOnline,
    canConnect
  } = useNetworkStatus()

  const {
    mergeMessages,
    utils
  } = useMessageSync()

  // Fetch conversations from API
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!isOnline || !canConnect) {
      // Return empty array when offline (conversations are more critical to keep fresh)
      return []
    }

    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch conversations')
      }

      return result.conversations || []
    } catch (error) {
      console.error('Fetch conversations error:', error)
      return []
    }
  }, [isOnline, canConnect])

  // Use polling hook
  const {
    data,
    error,
    isPolling,
    lastUpdate,
    refresh
  } = usePolling(fetchConversations, {
    interval: isOnline ? pollInterval : 15000, // Poll less frequently when offline
    enabled: enabled && canConnect,
    onError: (err) => {
      console.error('Conversation polling error:', err)
    }
  })

  // Local state for conversations
  const conversationsState = useLocalState<Conversation[]>([])
  const conversations = conversationsState.state
  const setConversations = conversationsState.setState

  useEffect(() => {
    if (!data) return

    // Merge with existing conversations and notify about changes
    setConversations(prevConversations => {
      const prevIds = new Set(prevConversations.map(c => c.id))
      const newIds = new Set(data.map(c => c.id))
      
      // Check for new conversations
      const newConversations = data.filter(c => !prevIds.has(c.id))
      if (newConversations.length > 0 && onNewConversation) {
        newConversations.forEach(onNewConversation)
      }
      
      // Check for updated conversations (by lastMessageTime)
      const updatedConversations = data.filter(c => {
        const prev = prevConversations.find(pc => pc.id === c.id)
        return prev && prev.lastMessageTime !== c.lastMessageTime
      })
      
      if (updatedConversations.length > 0 && onConversationUpdate) {
        updatedConversations.forEach(onConversationUpdate)
      }
      
      // Replace with new data (conversations are less frequent than messages)
      // In a real app, you might want more sophisticated merging
      return data.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || a.updatedAt).getTime()
        const timeB = new Date(b.lastMessageTime || b.updatedAt).getTime()
        return timeB - timeA // Newest first
      })
    })
  }, [data, setConversations, onNewConversation, onConversationUpdate])

  return {
    conversations,
    isLoading: isPolling,
    error,
    isPolling,
    lastUpdate,
    refresh,
    dataVersion: 0 // This would be a more sophisticated version tracking system
  }
}