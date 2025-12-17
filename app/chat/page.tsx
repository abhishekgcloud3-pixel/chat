'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'

export default function ChatPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name || user?.email}</p>
          </div>
          <Button onClick={logout} variant="secondary">
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <div className="space-y-3">
            {user?.avatar && (
              <div className="flex items-center space-x-4">
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
            )}
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            {user?.name && (
              <p>
                <span className="font-medium">Name:</span> {user.name}
              </p>
            )}
            {user?.mobileNumber && (
              <p>
                <span className="font-medium">Mobile:</span> {user.mobileNumber}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
