'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface UserDetails {
  id: string
  name?: string
  email: string
  avatar?: string
}

export function useUserDetails(userId?: string): {
  user: UserDetails | null
  isLoading: boolean
  error: Error | null
} {
  const [user, setUser] = useState<UserDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchUser = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await axios.get(`/api/users/${userId}`)
        setUser(response.data.user)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  return { user, isLoading, error }
}
