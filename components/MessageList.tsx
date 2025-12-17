'use client'

import { useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import Spinner from '@/components/ui/Spinner'
import clsx from 'clsx'

interface Message {
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

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      })
    }
  } catch {
    return ''
  }
}

const groupMessagesByDate = (messages: Message[]) => {
  const groups: Map<string, Message[]> = new Map()

  messages.forEach((message) => {
    const dateKey = new Date(message.createdAt).toDateString()
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(message)
  })

  return groups
}

export default function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className = '',
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const topElementRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    shouldAutoScrollRef.current = scrollHeight - (scrollTop + clientHeight) < 100
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!hasMore || !onLoadMore || !topElementRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(topElementRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [hasMore, isLoading, onLoadMore])

  const messagesByDate = groupMessagesByDate(messages)
  const sortedDates = Array.from(messagesByDate.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  return (
    <div
      ref={scrollContainerRef}
      className={clsx(
        'flex-grow overflow-y-auto p-4 space-y-4',
        className
      )}
    >
      {hasMore && (
        <div ref={topElementRef} className="flex justify-center py-4">
          {isLoading && <Spinner size="sm" />}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        </div>
      ) : (
        <>
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex justify-center mb-4">
                <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(dateKey)}
                </span>
              </div>

              {messagesByDate.get(dateKey)?.map((message) => {
                const isOwnMessage = currentUserId === message.sender.id
                const otherParty = isOwnMessage ? message.recipient : message.sender

                return (
                  <MessageBubble
                    key={message.id}
                    content={message.content}
                    imageUrl={message.imageUrl}
                    senderName={otherParty.name}
                    senderEmail={otherParty.email}
                    senderAvatar={otherParty.avatar}
                    timestamp={message.createdAt}
                    status={message.status}
                    isOwnMessage={isOwnMessage}
                    showAvatar={!isOwnMessage}
                  />
                )
              })}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
