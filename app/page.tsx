'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { validateEmail } from '@/lib/validators/auth'
import { useAuth } from '@/lib/hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/chat')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      router.push(`/otp-verify?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account with OTP"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="email"
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          disabled={isLoading}
          autoFocus
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              <span className="ml-2">Sending OTP...</span>
            </>
          ) : (
            'Send OTP'
          )}
        </Button>

        <div className="text-center text-sm text-gray-600">
          <p>We'll send a 6-digit code to your email</p>
        </div>
      </form>
    </AuthLayout>
  )
}
