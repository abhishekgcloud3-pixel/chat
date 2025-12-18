'use client'

import { useState, useEffect } from 'react'
import UserAvatar from './UserAvatar'
import Spinner from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import clsx from 'clsx'

interface Participant {
  id: string
  name: string
  email: string
  avatar?: string | null
}

interface LastMessage {
  id: string
  content: string
  imageUrl?: string | null
  status: string
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string | null
  }
}

interface ConversationItem {
  id: string
  participants?: Participant[]
  participantDetails?: Participant[]
  participantIds?: string[]
  lastMessage?: LastMessage
  lastMessageTime?: string
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

interface ConversationListProps {
  conversations: any[]
  isLoading?: boolean
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation?: () => void
  className?: string
}

const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

const getOtherParticipants = (
  participants: Participant[],
  currentUserId?: string
): Participant[] => {
  if (!currentUserId) return participants
  return participants.filter((p) => p.id !== currentUserId)
}

export default function ConversationList({
  conversations,
  isLoading = false,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  className = '',
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>()

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (typeof window === 'undefined') return

        const token = localStorage.getItem('auth_token')
        if (!token) return

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentUserId(data.user?.id)
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error)
      }
    }

    fetchCurrentUser()
  }, [])

  const filteredConversations = conversations.filter((conv) => {
    const participants = conv.participants || conv.participantDetails || []
    const otherParticipants = getOtherParticipants(participants, currentUserId)
    const names = otherParticipants
      .map((p) => `${p.name} ${p.email}`.toLowerCase())
      .join(' ')
    return names.includes(searchQuery.toLowerCase())
  })

  const getConversationLabel = (conv: ConversationItem): string => {
    const participants = conv.participants || conv.participantDetails || []
    const others = getOtherParticipants(participants, currentUserId)
    if (others.length === 0) return 'Chat'
    return others.map((p) => p.name || p.email).join(', ')
  }

  const getLastMessagePreview = (conv: ConversationItem): string => {
    if (!conv.lastMessage) return 'No messages yet'

    const { sender, content, imageUrl } = conv.lastMessage
    const prefix =
      sender.id === currentUserId ? 'You: ' : `${sender.name}: `

    if (imageUrl && !content) {
      return `${prefix}📷 Image`
    }

    return prefix + (content.length > 40 ? content.substring(0, 40) + '...' : content)
  }

  if (isLoading && conversations.length === 0) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center',
          className
        )}
      >
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'flex flex-col bg-white',
        className
      )}
    >
      <div className="border-b border-gray-200 p-4 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Messages</h2>
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="New conversation"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>

        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="flex-grow overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery
              ? 'No conversations found'
              : 'No conversations yet'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => {
              const isSelected =
                selectedConversationId === conversation.id
              const participants = conversation.participants || conversation.participantDetails || []
              const otherParticipants = getOtherParticipants(
                participants,
                currentUserId
              )
              const primaryParticipant = otherParticipants[0]

              return (
                <li
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={clsx(
                    'p-3 cursor-pointer transition-colors',
                    {
                      'bg-blue-50 border-l-4 border-blue-600': isSelected,
                      'hover:bg-gray-50': !isSelected,
                    }
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <UserAvatar
                        name={primaryParticipant?.name}
                        avatar={primaryParticipant?.avatar}
                        email={primaryParticipant?.email}
                        size="md"
                      />
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {getConversationLabel(conversation)}
                        </h3>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatRelativeTime(
                              conversation.lastMessageTime
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 truncate">
                        {getLastMessagePreview(conversation)}
                      </p>

                      {conversation.unreadCount &&
                        conversation.unreadCount > 0 && (
                          <div className="mt-1">
                            <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                              {conversation.unreadCount}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
