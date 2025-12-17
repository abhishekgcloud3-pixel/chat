/**
 * Message sync utilities for deduplication and offline handling
 */

import { IMessage } from '@/lib/db/models/Message'

export interface MessageSyncUtils {
  mergeAndDeduplicate: (existing: SyncMessage[], incoming: SyncMessage[]) => SyncMessage[]
  getLatestMessageId: (messages: SyncMessage[]) => string | null
  getNewMessages: (existing: SyncMessage[], latestKnownId: string | null) => SyncMessage[]
  shouldSync: (lastSync: number, maxAge?: number) => boolean
  formatMessageForSync: (message: SyncMessage) => MessageSyncData
  isDuplicateMessage: (messages: SyncMessage[], newMessage: SyncMessage) => boolean
}

export interface MessageSyncData {
  id: string
  conversationId: string
  content: string
  senderId: string
  recipientId: string
  status: string
  createdAt: Date
  updatedAt: Date
  seenAt?: Date | null
  imageUrl?: string | null
}

// Simple Message type for sync utilities
export interface SyncMessage {
  _id: any
  conversationId: any
  content: string
  senderId: any
  recipientId: any
  status: string
  createdAt: Date
  updatedAt: Date
  seenAt?: Date | null
  imageUrl?: string | null
}

// In-memory message cache for offline scenarios
class MessageCache {
  private cache = new Map<string, MessageSyncData[]>()
  private offlineQueue: MessageSyncData[] = []
  private isOnline = true

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flushOfflineQueue()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  getCache(conversationId: string): MessageSyncData[] {
    return this.cache.get(conversationId) || []
  }

  setCache(conversationId: string, messages: MessageSyncData[]): void {
    // Only keep the latest 100 messages per conversation to prevent memory leaks
    const limitedMessages = messages.slice(-100)
    this.cache.set(conversationId, limitedMessages)
  }

  addToCache(conversationId: string, message: MessageSyncData): void {
    const messages = this.getCache(conversationId)
    const isDuplicate = messages.some(m => m.id === message.id)
    
    if (!isDuplicate) {
      const updated = [...messages, message]
      this.setCache(conversationId, updated)
    }
  }

  queueOfflineMessage(message: MessageSyncData): void {
    this.offlineQueue.push(message)
    this.addToCache(message.conversationId, message)
  }

  getOfflineQueue(): MessageSyncData[] {
    return [...this.offlineQueue]
  }

  clearOfflineQueue(): void {
    this.offlineQueue = []
  }

  flushOfflineQueue(): Promise<void> {
    return new Promise((resolve) => {
      if (this.offlineQueue.length === 0) {
        resolve()
        return
      }

      // Retry sending offline messages
      const messagesToRetry = [...this.offlineQueue]
      this.clearOfflineQueue()

      // Simulate retry logic (would be implemented in the actual sending hook)
      console.log(`Retrying ${messagesToRetry.length} offline messages`, messagesToRetry)
      
      setTimeout(() => resolve(), 100) // Simulate network delay
    })
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline
  }
}

// Global cache instance
const messageCache = new MessageCache()

/**
 * Create message sync utilities
 */
export function createMessageSyncUtils(): MessageSyncUtils {
  return {
    mergeAndDeduplicate(existing, incoming) {
      const allMessages = [...existing, ...incoming]
      
      // Deduplicate by message ID
      const deduplicated = allMessages.filter((message, index, self) => 
        index === self.findIndex(m => m._id.toString() === message._id.toString())
      )
      
      // Sort by creation date (newest first for chat UI)
      return deduplicated.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },

    getLatestMessageId(messages) {
      if (!messages.length) return null
      const sorted = messages.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      return sorted[0]?._id.toString() || null
    },

    getNewMessages(existing, latestKnownId) {
      if (!latestKnownId) return existing
      
      return existing.filter(message => 
        message._id.toString() > latestKnownId
      ).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },

    shouldSync(lastSync, maxAge = 30000) { // 30 seconds default
      return Date.now() - lastSync > maxAge
    },

    formatMessageForSync(message) {
      return {
        id: message._id.toString(),
        conversationId: message.conversationId.toString(),
        content: message.content,
        senderId: message.senderId.toString(),
        recipientId: message.recipientId.toString(),
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        seenAt: message.seenAt || null,
        imageUrl: message.imageUrl || null
      }
    },

    isDuplicateMessage(messages, newMessage) {
      return messages.some(message => 
        message._id.toString() === newMessage._id.toString()
      )
    }
  }
}

/**
 * Get global message cache instance
 */
export function getMessageCache(): MessageCache {
  return messageCache
}

// Helper function to convert SyncMessage to UI Message format
function convertSyncToUiMessage(syncMessage: SyncMessage): any {
  return {
    id: syncMessage._id.toString(),
    conversationId: syncMessage.conversationId.toString(),
    content: syncMessage.content,
    status: syncMessage.status as 'sent' | 'delivered' | 'seen',
    createdAt: syncMessage.createdAt.toISOString(),
    updatedAt: syncMessage.updatedAt.toISOString(),
    seenAt: syncMessage.seenAt?.toISOString() || null,
    imageUrl: syncMessage.imageUrl || null,
    sender: {
      id: syncMessage.senderId.toString(),
      name: 'Unknown',
      email: 'unknown@example.com'
    },
    recipient: {
      id: syncMessage.recipientId.toString(),
      name: 'Unknown',
      email: 'unknown@example.com'
    }
  }
}

/**
 * Hook-friendly message utilities
 */
export function useMessageSync() {
  const utils = createMessageSyncUtils()
  const cache = getMessageCache()

  const mergeMessages = (existing: SyncMessage[], incoming: SyncMessage[]) => {
    return utils.mergeAndDeduplicate(existing, incoming)
  }

  const syncFromCache = (conversationId: string, existing: SyncMessage[]) => {
    const cached = cache.getCache(conversationId)
    // Convert cached data back to SyncMessage format
    const cachedMessages: SyncMessage[] = cached.map(msg => ({
      _id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      status: msg.status,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      seenAt: msg.seenAt,
      imageUrl: msg.imageUrl
    }))
    
    const merged = mergeMessages(existing, cachedMessages)
    
    // Convert to UI Message format for use in components
    return merged.map(convertSyncToUiMessage)
  }

  const saveToCache = (conversationId: string, messages: any[]) => {
    // Convert UI messages to sync format for caching
    const syncMessages: SyncMessage[] = messages.map(msg => ({
      _id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      senderId: msg.sender.id,
      recipientId: msg.recipient.id,
      status: msg.status,
      createdAt: new Date(msg.createdAt),
      updatedAt: new Date(msg.updatedAt),
      seenAt: msg.seenAt ? new Date(msg.seenAt) : null,
      imageUrl: msg.imageUrl
    }))
    
    const syncData = syncMessages.map(utils.formatMessageForSync)
    cache.setCache(conversationId, syncData)
  }

  const queueOfflineMessage = (message: MessageSyncData) => {
    cache.queueOfflineMessage(message)
  }

  const flushOfflineQueue = () => {
    return cache.flushOfflineQueue()
  }

  const isOnline = cache.isCurrentlyOnline()

  return {
    utils,
    cache,
    mergeMessages,
    syncFromCache,
    saveToCache,
    queueOfflineMessage,
    flushOfflineQueue,
    isOnline,
    offlineQueue: cache.getOfflineQueue()
  }
}