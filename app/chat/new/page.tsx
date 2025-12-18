'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/UserAvatar'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/lib/hooks/useAuth'

interface SearchResult {
  id: string
  name: string
  email: string
  avatar?: string | null
}

export default function NewConversationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        if (typeof window === 'undefined') return

        const token = localStorage.getItem('auth_token')
        const response = await fetch(
          `/api/conversations?search=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          const users = data.users || []
          setSearchResults(users.filter((u: SearchResult) => u.id !== user?.id))
        } else if (response.status === 404) {
          setSearchResults([])
        } else {
          setError('Failed to search users')
        }
      } catch (error) {
        console.error('Search error:', error)
        setError('An error occurred while searching')
      } finally {
        setIsSearching(false)
      }
    }

    const searchTimeout = setTimeout(searchUsers, 300)
    return () => clearTimeout(searchTimeout)
  }, [searchQuery, user?.id])

  const handleSelectUser = async (selectedUser: SearchResult) => {
    setIsCreating(true)
    setError(null)

    try {
      if (typeof window === 'undefined') return

      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const conversationId = data.conversation?.id || data.id
        router.push(`/chat/${conversationId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create conversation')
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      setError('An error occurred while creating the conversation')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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
          <h1 className="text-2xl font-bold text-gray-900">New Chat</h1>
        </div>

        <Input
          type="email"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isCreating}
        />
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {isSearching ? (
          <div className="flex justify-center">
            <Spinner size="md" />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery
              ? 'No users found'
              : 'Start typing to search for users...'}
          </div>
        ) : (
          <ul className="space-y-2">
            {searchResults.map((result) => (
              <li key={result.id}>
                <button
                  onClick={() => handleSelectUser(result)}
                  disabled={isCreating}
                  className="w-full p-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center gap-3"
                >
                  <UserAvatar
                    name={result.name}
                    avatar={result.avatar}
                    email={result.email}
                    size="md"
                  />
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {result.email}
                    </p>
                  </div>
                  {isCreating && (
                    <Spinner size="sm" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
