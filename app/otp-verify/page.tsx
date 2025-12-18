'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/lib/hooks/useAuth'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'

export default function OTPVerifyPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const router = useRouter()
  const { login } = useAuth()
  const { handleError } = useErrorHandler()

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      router.push('/')
    }
  }, [email, router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setError('')

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((digit) => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    
    if (!/^\d{6}$/.test(pastedData)) {
      setError('Please paste a valid 6-digit OTP')
      return
    }

    const digits = pastedData.split('')
    setOtp(digits)
    inputRefs.current[5]?.focus()
    
    handleVerify(pastedData)
  }

  const handleVerify = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp.join('')

    if (otpToVerify.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp: otpToVerify }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts)
        }
        handleError(data, 'OTP Verification')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      login(data.data.token, data.data.user)

      if (data.data.requiresMobile) {
        router.push('/add-mobile')
      } else {
        router.push('/chat')
      }
    } catch (err) {
      handleError(err, 'OTP Verification')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    setError('')

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
        handleError(data, 'Resend OTP')
        return
      }

      setResendCooldown(30)
      setOtp(['', '', '', '', '', ''])
      setRemainingAttempts(null)
      inputRefs.current[0]?.focus()
    } catch (err) {
      handleError(err, 'Resend OTP')
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    return null
  }

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle={`Enter the code sent to ${email}`}
    >
      <div className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {remainingAttempts !== null && remainingAttempts > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 text-center">
              {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
            </p>
          </div>
        )}

        <Button
          onClick={() => handleVerify()}
          disabled={isLoading || otp.some((digit) => !digit)}
          className="w-full flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              <span className="ml-2">Verifying...</span>
            </>
          ) : (
            'Verify OTP'
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isLoading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend OTP'}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
