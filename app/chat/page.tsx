'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConversations } from '@/lib/hooks/useConversations'
import { useAuth } from '@/lib/hooks/useAuth'
import ConversationList from '@/components/ConversationList'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function ChatPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { conversations, isLoading } = useConversations({
    enabled: true,
    pollInterval: 3000,
  })
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    router.push(`/chat/${conversationId}`)
  }

  const handleNewConversation = () => {
    router.push('/chat/new')
  }

  return (
    <div className="w-full md:w-96 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <Button
            onClick={() => router.push('/')}
            variant="secondary"
            className="px-3 py-2 text-sm"
          >
            Logout
          </Button>
        </div>
        {user && (
          <p className="text-sm text-gray-600 truncate">
            {user.name || user.email}
          </p>
        )}
      </div>

      <ConversationList
        conversations={conversations}
        isLoading={isLoading}
        selectedConversationId={selectedConversationId || undefined}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        className="flex-grow"
      />
    </div>
  )
}
