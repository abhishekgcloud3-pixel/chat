'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMessages } from '@/lib/hooks/useMessages'
import { useAuth } from '@/lib/hooks/useAuth'
import ChatInput from '@/components/ChatInput'
import MessageList from '@/components/MessageList'
import UserAvatar from '@/components/UserAvatar'
import Spinner from '@/components/ui/Spinner'
import clsx from 'clsx'

interface Participant {
  id: string
  name: string
  email: string
  avatar?: string | null
}

interface Conversation {
  id: string
  participants: Participant[]
  lastMessage?: any
  lastMessageTime?: string
  createdAt: string
  updatedAt: string
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string
  const { user } = useAuth()

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    hasMore,
    loadMore,
  } = useMessages({
    conversationId,
    initialLimit: 50,
    enabled: !!conversationId,
  })

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversationLoading, setConversationLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setConversationLoading(true)
        if (typeof window === 'undefined') return

        const token = localStorage.getItem('auth_token')
        const response = await fetch(`/api/conversations/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setConversation(data.conversation)
        } else if (response.status === 404) {
          router.push('/chat')
        }
      } catch (error) {
        console.error('Failed to fetch conversation:', error)
      } finally {
        setConversationLoading(false)
      }
    }

    if (conversationId) {
      fetchConversation()
    }
  }, [conversationId, router])

  const handleSendMessage = async (content: string, imageUrl?: string) => {
    if (!content.trim() && !imageUrl) return

    setIsSending(true)
    try {
      await sendMessage(content, imageUrl)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const getOtherParticipants = () => {
    if (!conversation) return []
    return conversation.participants.filter((p) => p.id !== user?.id)
  }

  const otherParticipants = getOtherParticipants()
  const recipientName = otherParticipants[0]?.name || otherParticipants[0]?.email || 'Unknown'
  const recipientAvatar = otherParticipants[0]?.avatar

  if (conversationLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col bg-white overflow-hidden">
      <div className="border-b border-gray-200 p-4 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <UserAvatar
              name={recipientName}
              avatar={recipientAvatar}
              size="md"
            />

            <div>
              <h2 className="font-semibold text-gray-900">{recipientName}</h2>
              {otherParticipants[0]?.email && (
                <p className="text-sm text-gray-600">
                  {otherParticipants[0].email}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 00.948.684l1.498 4.493a1 1 0 00.502.756l2.048 1.029a1 1 0 00.766-.07l1.948-.975a1 1 0 00.522-.756l1.498-4.493a1 1 0 00.948-.684h3.28a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
                />
              </svg>
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MessageList
        messages={messages}
        currentUserId={user?.id}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        className="flex-grow overflow-y-auto bg-gray-50"
      />

      {error && (
        <div className="bg-red-50 border-t border-red-200 p-3 text-sm text-red-600">
          {error.message}
        </div>
      )}

      <ChatInput
        onSend={handleSendMessage}
        disabled={isSending}
        placeholder="Type a message..."
      />
    </div>
  )
}
