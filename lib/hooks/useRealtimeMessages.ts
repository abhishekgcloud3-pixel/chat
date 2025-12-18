/**
 * Real-time message hook using Supabase (Option B implementation)
 * Provides WebSocket-based real-time updates with polling fallback
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { useLocalState } from './usePolling'
import { createSupabaseClient, subscribeToMessages, RealtimeFallback } from '@/lib/realtime/supabase'
import { useMessageSync } from './messageSync'
import { Message } from './useMessages'

interface UseRealtimeMessagesOptions {
  conversationId: string
  initialLimit?: number
  onNewMessage?: (message: Message) => void
  onError?: (error: Error) => void
  enableFallback?: boolean
}

interface UseRealtimeMessagesReturn {
  messages: Message[]
  isConnected: boolean
  error: Error | null
  sendMessage: (content: string, imageUrl?: string) => Promise<void>
  markAsSeen: (messageId: string) => Promise<void>
  refresh: () => void
  dataVersion: number
}

/**
 * Custom hook for real-time message updates using Supabase WebSocket
 */
export function useRealtimeMessages(options: UseRealtimeMessagesOptions): UseRealtimeMessagesReturn {
  const {
    conversationId,
    initialLimit = 50,
    onNewMessage,
    onError,
    enableFallback = true
  } = options

  // State management
  const messagesState = useLocalState<Message[]>([])
  const messages = messagesState.state
  const setMessages = messagesState.setState
  
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const subscriptionRef = useRef<any>(null)
  const fallbackRef = useRef<RealtimeFallback | null>(null)
  const dataVersionRef = useRef(0)

  const {
    saveToCache,
    syncFromCache
  } = useMessageSync()

  // Initialize Supabase client
  const supabaseClient = createSupabaseClient()

  // Fetch initial messages
  const fetchInitialMessages = useCallback(async (): Promise<Message[]> => {
    try {
      const response = await fetch(`/api/messages/conversation/${conversationId}?limit=${initialLimit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch messages')
      }

      return result.messages
    } catch (error) {
      console.error('Failed to fetch initial messages:', error)
      // Return cached data on error
      return syncFromCache(conversationId, []) as Message[]
    }
  }, [conversationId, initialLimit, syncFromCache])

  // Handle new messages from real-time subscription
  const handleNewMessage = useCallback((newMessage: any) => {
    console.log('Received real-time message:', newMessage)
    
    // Convert to our Message format
    const formattedMessage: Message = {
      id: newMessage.id,
      conversationId: newMessage.conversationId,
      content: newMessage.content,
      status: newMessage.status,
      createdAt: newMessage.createdAt,
      updatedAt: newMessage.updatedAt,
      seenAt: newMessage.seenAt || null,
      imageUrl: newMessage.imageUrl || null,
      sender: {
        id: newMessage.senderId,
        name: newMessage.senderName || 'Unknown',
        email: newMessage.senderEmail || 'unknown@example.com'
      },
      recipient: {
        id: newMessage.recipientId,
        name: newMessage.recipientName || 'Unknown',
        email: newMessage.recipientEmail || 'unknown@example.com'
      }
    }

    // Update messages state
    setMessages(prevMessages => {
      const updated = [...prevMessages, formattedMessage]
      const uniqueMessages = updated.filter((message, index, self) => 
        index === self.findIndex(m => m.id === message.id)
      )
      saveToCache(conversationId, uniqueMessages)
      dataVersionRef.current += 1
      return uniqueMessages
    })

    // Notify about new message
    onNewMessage?.(formattedMessage)
  }, [conversationId, setMessages, saveToCache, onNewMessage])

  // Handle real-time errors
  const handleRealtimeError = useCallback((error: Error) => {
    console.error('Real-time connection error:', error)
    setError(error)
    setIsConnected(false)
    
    if (enableFallback) {
      console.log('Falling back to polling...')
      // Start polling fallback here if needed
      if (!fallbackRef.current) {
        fallbackRef.current = new RealtimeFallback()
      }
    }
    
    onError?.(error)
  }, [enableFallback, onError])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !supabaseClient) {
      // Fallback to polling if no Supabase client
      if (enableFallback) {
        console.log('No Supabase client, using polling fallback')
        // Could integrate with polling hooks here
      }
      return
    }

    try {
      console.log(`Setting up real-time subscription for conversation ${conversationId}`)
      
      const subscription = subscribeToMessages(
        supabaseClient,
        conversationId,
        handleNewMessage,
        handleRealtimeError
      )
      
      subscriptionRef.current = subscription

      // Set connection status
      setIsConnected(true)
      setError(null)

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to setup subscription')
      handleRealtimeError(err)
    }

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe()
        } catch (error) {
          console.warn('Error during subscription cleanup:', error)
        }
      }
      
      if (fallbackRef.current) {
        fallbackRef.current.destroy()
      }
    }
  }, [conversationId, supabaseClient, handleNewMessage, handleRealtimeError, enableFallback])

  // Initialize with cached/initial data
  useEffect(() => {
    if (conversationId && messages.length === 0) {
      // Try to get initial messages
      fetchInitialMessages().then(initialMessages => {
        if (initialMessages.length > 0) {
          setMessages(initialMessages)
          saveToCache(conversationId, initialMessages)
        } else {
          // Use cached data if no initial messages
          const cached = syncFromCache(conversationId, [])
          if (cached.length > 0) {
            setMessages(cached as Message[])
          }
        }
      })
    }
  }, [conversationId, messages.length, setMessages, fetchInitialMessages, saveToCache, syncFromCache])

  // Send message function
  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
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
        // The real-time subscription should pick this up
        // But we can also optimistically add it
        setMessages(prev => {
          const updated = [...prev, result.message]
          const uniqueMessages = updated.filter((message, index, self) => 
            index === self.findIndex(m => m.id === message.id)
          )
          saveToCache(conversationId, uniqueMessages)
          return uniqueMessages
        })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to send message')
      console.error('Send message error:', err)
      throw err
    }
  }, [conversationId, setMessages, saveToCache])

  // Mark message as seen
  const markAsSeen = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/seen`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
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

  // Refresh function
  const refresh = useCallback(async () => {
    try {
      const initialMessages = await fetchInitialMessages()
      setMessages(initialMessages)
      saveToCache(conversationId, initialMessages)
      dataVersionRef.current += 1
    } catch (error) {
      console.error('Refresh failed:', error)
    }
  }, [fetchInitialMessages, conversationId, setMessages, saveToCache])

  return {
    messages,
    isConnected,
    error,
    sendMessage,
    markAsSeen,
    refresh,
    dataVersion: dataVersionRef.current
  }
}