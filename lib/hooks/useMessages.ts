/**
 * Message polling hook with optimized queries and deduplication
 */

import { useEffect, useCallback, useRef } from 'react'
import { usePolling, useNetworkStatus, useLocalState } from './usePolling'
import { useMessageSync } from './messageSync'

export interface Message {
  id: string
  conversationId: string
  content: string
  imageUrl?: string | null
  status: 'sent' | 'delivered' | 'seen'
  createdAt: string
  updatedAt: string
  seenAt?: string | null
  sender: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
  recipient: {
    id: string
    name: string
    email: string
    avatar?: string | null
  }
}

interface UseMessagesOptions {
  conversationId: string
  initialLimit?: number
  pollInterval?: number
  enabled?: boolean
  onNewMessage?: (message: Message) => void
}

interface UseMessagesReturn {
  messages: Message[]
  isLoading: boolean
  error: Error | null
  isPolling: boolean
  lastUpdate: number | null
  sendMessage: (content: string, imageUrl?: string) => Promise<void>
  markAsSeen: (messageId: string) => Promise<void>
  refresh: () => void
  hasMore: boolean
  loadMore: () => void
  dataVersion: number
}

/**
 * Custom hook for real-time message updates using polling
 */
export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const {
    conversationId,
    initialLimit = 50,
    pollInterval = 2000, // 2 seconds as specified
    enabled = true,
    onNewMessage
  } = options

  const {
    isOnline,
    canConnect
  } = useNetworkStatus()

  const {
    saveToCache,
    syncFromCache
  } = useMessageSync()

  // Local state for pagination
  const hasMoreState = useLocalState<boolean>(true)
  const skipState = useLocalState<number>(0)
  
  const hasMore = hasMoreState.state
  const setHasMore = hasMoreState.setState
  const skip = skipState.state
  const setSkip = skipState.setState
  
  const lastSyncRef = useRef(0)
  const latestMessageIdRef = useRef<string | null>(null)

  // Fetch messages from API
  const fetchMessages = useCallback(async (): Promise<{ messages: Message[], hasMore: boolean, skip: number }> => {
    const currentSkip = skip

    if (!isOnline || !canConnect) {
      // If offline, return cached messages
      if (!navigator.onLine) {
        const cached = syncFromCache(conversationId, [])
        return { messages: cached, hasMore: false, skip: currentSkip }
      }
    }

    try {
      const response = await fetch(`/api/messages/conversation/${conversationId}?limit=${initialLimit}&skip=${currentSkip}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch messages')
      }

      return {
        messages: result.messages,
        hasMore: result.pagination?.hasMore || false,
        skip: currentSkip
      }
    } catch (error) {
      console.error('Fetch messages error:', error)
      // Return cached data on error
      const cached = syncFromCache(conversationId, [])
      return { messages: cached, hasMore: false, skip: currentSkip }
    }
  }, [conversationId, initialLimit, skip, isOnline, canConnect, syncFromCache])

  // Use polling hook
  const {
    data,
    error,
    isPolling,
    lastUpdate,
    refresh
  } = usePolling(fetchMessages, {
    interval: isOnline ? pollInterval : 10000, // Poll less frequently when offline
    enabled: enabled && canConnect && !!conversationId,
    onError: (err) => {
      console.error('Message polling error:', err)
    }
  })

  // Merge incoming data with local state
  const messagesState = useLocalState<Message[]>([])
  const messages = messagesState.state
  const setMessages = messagesState.setState

  useEffect(() => {
    if (!data) return

    const { messages: newMessages, hasMore: more } = data
    lastSyncRef.current = Date.now()

    // Get latest message ID for optimization (simple approach)
    const latestId = newMessages.length > 0 ? newMessages[0].id : null
    if (latestId && latestId !== latestMessageIdRef.current) {
      latestMessageIdRef.current = latestId
    }

    setHasMore(more)

    // Merge with existing messages and deduplicate
    setMessages(prevMessages => {
      // Simple deduplication by ID
      const allMessages = [...prevMessages, ...newMessages]
      const uniqueMessages = allMessages.filter((message, index, self) => 
        index === self.findIndex(m => m.id === message.id)
      )
      
      // Sort by createdAt (newest first)
      const sortedMessages = uniqueMessages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      // Cache the merged messages
      saveToCache(conversationId, sortedMessages)
      
      // Notify about new messages
      if (onNewMessage && prevMessages.length > 0) {
        const newMessageIds = new Set(newMessages.map(m => m.id))
        const prevMessageIds = new Set(prevMessages.map(m => m.id))
        
        newMessages.forEach(message => {
          if (!prevMessageIds.has(message.id)) {
            onNewMessage(message)
          }
        })
      }
      
      return sortedMessages
    })
  }, [data, setMessages, saveToCache, conversationId, onNewMessage, setHasMore])

  // Send message function
  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    if (!isOnline || !canConnect) {
      // Queue message for later sending
      const tempMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversationId,
        content,
        status: 'sent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: {
          id: 'current-user',
          name: 'You',
          email: 'you@example.com'
        },
        recipient: {
          id: 'unknown',
          name: 'Recipient',
          email: 'recipient@example.com'
        },
        imageUrl: imageUrl || null
      }
      
      // Add to local state immediately for optimistic UI
      setMessages(prev => [tempMessage, ...prev])
      
      console.log('Queuing message for offline sending:', tempMessage)
      return
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          conversationId,
          content,
          imageUrl
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success && result.message) {
        // Add the real message to the state
        setMessages(prev => {
          const updated = [...prev, result.message]
          const uniqueMessages = updated.filter((message, index, self) => 
            index === self.findIndex(m => m.id === message.id)
          )
          saveToCache(conversationId, uniqueMessages)
          return uniqueMessages
        })
        
        // Refresh to get the latest state
        setTimeout(() => refresh(), 100)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }, [isOnline, canConnect, conversationId, setMessages, refresh, saveToCache])

  // Mark message as seen
  const markAsSeen = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/seen`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      })

      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'seen' as const, seenAt: new Date().toISOString() }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark message as seen:', error)
    }
  }, [setMessages])

  // Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (!hasMore) return
    
    setSkip(prev => prev + initialLimit)
    refresh()
  }, [hasMore, initialLimit, refresh, setSkip])

  // Initialize with cached data when component mounts
  useEffect(() => {
    if (conversationId && messages.length === 0) {
      const cached = syncFromCache(conversationId, [])
      if (cached.length > 0) {
        setMessages(cached as Message[])
      }
    }
  }, [conversationId, messages.length, setMessages, syncFromCache])

  return {
    messages,
    isLoading: isPolling,
    error,
    isPolling,
    lastUpdate,
    sendMessage,
    markAsSeen,
    refresh,
    hasMore,
    loadMore,
    dataVersion: 0 // This would be a more sophisticated version tracking system
  }
}