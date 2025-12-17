/**
 * Message sending hook with optimistic UI updates and retry logic
 */

import { useCallback, useState } from 'react'
import { useMessageSync } from './messageSync'
import { Message } from './useMessages'

interface SendMessageOptions {
  onSuccess?: (message: Message) => void
  onError?: (error: Error, messageContent: string) => void
  retryAttempts?: number
  retryDelay?: number
}

interface SendMessageReturn {
  sendMessage: (content: string, imageUrl?: string, conversationId?: string) => Promise<void>
  isSending: boolean
  error: Error | null
  queuedMessages: QueuedMessage[]
  retryFailedMessages: () => void
  clearQueue: () => void
}

interface QueuedMessage {
  id: string
  conversationId: string
  content: string
  imageUrl?: string | null
  createdAt: Date
  retryCount: number
  status: 'queued' | 'sending' | 'failed'
}

/**
 * Custom hook for sending messages with optimistic UI updates and offline support
 */
export function useSendMessage(options: SendMessageOptions = {}): SendMessageReturn {
  const {
    onSuccess,
    onError,
    retryAttempts = 3,
    retryDelay = 2000
  } = options

  const {
    mergeMessages,
    saveToCache,
    utils,
    queueOfflineMessage,
    flushOfflineQueue
  } = useMessageSync()

  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])

  // Generate temporary message ID
  const generateTempId = useCallback(() => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, [])

  // Create optimistic message for immediate UI update
  const createOptimisticMessage = useCallback((
    content: string, 
    imageUrl?: string, 
    conversationId?: string,
    tempId?: string
  ): Message => {
    const id = tempId || generateTempId()
    
    return {
      id,
      conversationId: conversationId || 'unknown',
      content,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 'current-user', // This should come from auth context
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
  }, [generateTempId])

  // Send message with retry logic
  const sendMessageWithRetry = useCallback(async (
    content: string,
    imageUrl?: string,
    conversationId?: string,
    tempId?: string
  ): Promise<void> => {
    const finalConversationId = conversationId || 'unknown'
    const id = tempId || generateTempId()
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        setError(null)
        setIsSending(true)

        // If this is a retry, add a retry indicator to the content
        const messageContent = attempt > 0 ? `[Retry ${attempt}] ${content}` : content

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          },
          body: JSON.stringify({
            conversationId: finalConversationId,
            content: messageContent,
            imageUrl
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (!result.success || !result.message) {
          throw new Error(result.message || 'Failed to send message')
        }

        // Update queued message status
        setQueuedMessages(prev => 
          prev.map(qm => 
            qm.id === id 
              ? { ...qm, status: 'sending' as const }
              : qm
          )
        )

        // Call success callback
        onSuccess?.(result.message)
        
        // Remove from queue on success
        setQueuedMessages(prev => prev.filter(qm => qm.id !== id))
        
        return
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error(`Send message attempt ${attempt + 1} failed:`, error)
        
        if (attempt < retryAttempts) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
          continue
        }
        
        // Final attempt failed
        setError(error)
        setIsSending(false)
        
        // Update queue status to failed
        setQueuedMessages(prev => 
          prev.map(qm => 
            qm.id === id 
              ? { ...qm, status: 'failed' as const, retryCount: attempt }
              : qm
          )
        )
        
        onError?.(error, content)
        throw error
      }
    }
  }, [onSuccess, onError, retryAttempts, retryDelay, generateTempId])

  // Main sendMessage function
  const sendMessage = useCallback(async (
    content: string, 
    imageUrl?: string, 
    conversationId?: string
  ): Promise<void> => {
    // Check if online
    if (!navigator.onLine) {
      // Create optimistic message for offline scenario
      const tempId = generateTempId()
      const optimisticMessage = createOptimisticMessage(content, imageUrl, conversationId, tempId)
      
      // Queue for offline sending
      const queuedMessage: QueuedMessage = {
        id: tempId,
        conversationId: conversationId || 'unknown',
        content,
        imageUrl: imageUrl || null,
        createdAt: new Date(),
        retryCount: 0,
        status: 'queued'
      }
      
      setQueuedMessages(prev => [...prev, queuedMessage])
      
      // Add to offline queue for sync utilities
      const offlineMessage = utils.formatMessageForSync(optimisticMessage as any)
      queueOfflineMessage(offlineMessage)
      
      // Call success callback for optimistic update
      onSuccess?.(optimisticMessage)
      return
    }

    // Send immediately when online
    try {
      await sendMessageWithRetry(content, imageUrl, conversationId)
    } catch (error) {
      // If sending fails and we're still online, it was handled in sendMessageWithRetry
      // If we went offline during the process, we should queue it
      if (!navigator.onLine) {
        const tempId = generateTempId()
        const optimisticMessage = createOptimisticMessage(content, imageUrl, conversationId, tempId)
        
        const queuedMessage: QueuedMessage = {
          id: tempId,
          conversationId: conversationId || 'unknown',
          content,
          imageUrl: imageUrl || null,
          createdAt: new Date(),
          retryCount: 0,
          status: 'queued'
        }
        
        setQueuedMessages(prev => [...prev, queuedMessage])
        
        const offlineMessage = utils.formatMessageForSync(optimisticMessage as any)
        queueOfflineMessage(offlineMessage)
      }
    } finally {
      setIsSending(false)
    }
  }, [sendMessageWithRetry, generateTempId, createOptimisticMessage, utils, queueOfflineMessage, onSuccess])

  // Retry failed messages
  const retryFailedMessages = useCallback(async () => {
    const failedMessages = queuedMessages.filter(qm => qm.status === 'failed')
    
    for (const queuedMessage of failedMessages) {
      try {
        setQueuedMessages(prev => 
          prev.map(qm => 
            qm.id === queuedMessage.id 
              ? { ...qm, status: 'sending' as const }
              : qm
          )
        )
        
        await sendMessageWithRetry(
          queuedMessage.content,
          queuedMessage.imageUrl || undefined,
          queuedMessage.conversationId,
          queuedMessage.id
        )
      } catch (error) {
        console.error('Retry failed:', error)
        // Status will be updated in sendMessageWithRetry
      }
    }
  }, [queuedMessages, sendMessageWithRetry])

  // Clear the message queue
  const clearQueue = useCallback(() => {
    setQueuedMessages([])
    setError(null)
  }, [])

  // Listen for online event to flush offline queue
  useState(() => {
    const handleOnline = async () => {
      // Try to flush the offline queue
      await flushOfflineQueue()
      
      // Retry any failed messages
      setTimeout(() => {
        retryFailedMessages()
      }, 1000) // Small delay to let the page settle
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }
  }, [flushOfflineQueue, retryFailedMessages])

  return {
    sendMessage,
    isSending,
    error,
    queuedMessages,
    retryFailedMessages,
    clearQueue
  }
}