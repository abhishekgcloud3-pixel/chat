'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  mobileNumber?: string
  name?: string
  avatar?: string
}

interface UseAuthReturn {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, userData: User) => void
  logout: () => Promise<void>
  getToken: () => string | null
  checkAuth: () => Promise<boolean>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  const checkAuth = async (): Promise<boolean> => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return false
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsLoading(false)
        return true
      } else {
        localStorage.removeItem('auth_token')
        setUser(null)
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      localStorage.removeItem('auth_token')
      setUser(null)
      setIsLoading(false)
      return false
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token)
    setUser(userData)
  }

  const logout = async () => {
    const token = getToken()
    
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      localStorage.removeItem('auth_token')
      setUser(null)
      router.push('/')
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getToken,
    checkAuth,
  }
}
