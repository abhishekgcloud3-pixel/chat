/**
 * Supabase Realtime client setup (Alternative Option B)
 * Lightweight configuration for minimal cost
 */

import { createClient } from '@supabase/supabase-js'

interface SupabaseConfig {
  url: string
  anonKey: string
}

interface RealtimeMessage {
  id: string
  conversationId: string
  content: string
  senderId: string
  recipientId: string
  status: string
  createdAt: string
  updatedAt: string
  seenAt?: string | null
  imageUrl?: string | null
}

/**
 * Initialize Supabase client with minimal configuration
 */
export function createSupabaseClient(): ReturnType<typeof createClient> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Realtime features will be disabled.')
    return null
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit events to reduce costs
        },
      },
    })

    return client
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

/**
 * Subscribe to real-time message updates for a conversation
 */
export function subscribeToMessages(
  client: ReturnType<typeof createClient>,
  conversationId: string,
  onMessage: (message: RealtimeMessage) => void,
  onError: (error: Error) => void
) {
  if (!client) {
    onError(new Error('Supabase client not initialized'))
    return { unsubscribe: () => {} }
  }

  try {
    const subscription = client
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as RealtimeMessage
          onMessage(message)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as RealtimeMessage
          onMessage(message)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages for conversation ${conversationId}`)
        } else if (status === 'CHANNEL_ERROR') {
          onError(new Error(`Failed to subscribe to conversation ${conversationId}`))
        }
      })

    return subscription
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Subscription failed')
    onError(err)
    return { unsubscribe: () => {} }
  }
}

/**
 * Subscribe to conversation updates
 */
export function subscribeToConversations(
  client: ReturnType<typeof createClient>,
  userId: string,
  onConversation: (conversation: any) => void,
  onError: (error: Error) => void
) {
  if (!client) {
    onError(new Error('Supabase client not initialized'))
    return { unsubscribe: () => {} }
  }

  try {
    const subscription = client
      .channel(`user-conversations-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          onConversation(payload.new)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to conversations for user ${userId}`)
        } else if (status === 'CHANNEL_ERROR') {
          onError(new Error(`Failed to subscribe to conversations for user ${userId}`))
        }
      })

    return subscription
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Subscription failed')
    onError(err)
    return { unsubscribe: () => {} }
  }
}

/**
 * Graceful fallback handler for WebSocket failures
 */
export class RealtimeFallback {
  private client: ReturnType<typeof createClient> | null
  private isOnline: boolean = true
  private subscriptions: Map<string, any> = new Map()

  constructor() {
    this.client = createSupabaseClient()
    
    // Listen for network status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.resubscribeAll()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
        this.unsubscribeAll()
      })
      
      this.isOnline = navigator.onLine
    }
  }

  /**
   * Subscribe to messages with automatic fallback to polling
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: RealtimeMessage) => void,
    onFallback: (error: Error) => void,
    pollCallback: () => Promise<RealtimeMessage[]>
  ) {
    const subscriptionId = `messages-${conversationId}`
    
    if (this.client && this.isOnline) {
      try {
        const subscription = subscribeToMessages(
          this.client,
          conversationId,
          onMessage,
          (error) => {
            console.warn('WebSocket failed, falling back to polling:', error)
            this.startPolling(subscriptionId, pollCallback, onMessage)
            onFallback(error)
          }
        )
        
        this.subscriptions.set(subscriptionId, subscription)
      } catch (error) {
        console.warn('WebSocket subscription failed, falling back to polling:', error)
        this.startPolling(subscriptionId, pollCallback, onMessage)
        onFallback(error instanceof Error ? error : new Error('Subscription failed'))
      }
    } else {
      // Start polling immediately if offline or no client
      this.startPolling(subscriptionId, pollCallback, onMessage)
    }
  }

  /**
   * Start polling fallback
   */
  private startPolling(
    subscriptionId: string,
    pollCallback: () => Promise<RealtimeMessage[]>,
    onMessage: (message: RealtimeMessage) => void
  ) {
    const poll = async () => {
      if (!this.isOnline) return
      
      try {
        const messages = await pollCallback()
        messages.forEach(onMessage)
      } catch (error) {
        console.error('Polling fallback failed:', error)
      }
      
      // Continue polling every 3 seconds
      setTimeout(poll, 3000)
    }
    
    // Start polling
    setTimeout(poll, 1000)
  }

  /**
   * Resubscribe all connections when coming back online
   */
  private resubscribeAll() {
    console.log('Resubscribing to real-time connections...')
    // This would need to store subscription configurations to recreate them
  }

  /**
   * Unsubscribe all connections when going offline
   */
  private unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe()
      } catch (error) {
        console.warn('Error during unsubscribe:', error)
      }
    })
    this.subscriptions.clear()
    console.log('Unsubscribed from all real-time connections')
  }

  /**
   * Cleanup
   */
  destroy() {
    this.unsubscribeAll()
    if (this.client) {
      // Supabase client cleanup would happen here
    }
  }
}