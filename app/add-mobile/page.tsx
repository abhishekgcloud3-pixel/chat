'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { validateMobileNumber } from '@/lib/validators/mobile'
import { validateName } from '@/lib/validators/auth'
import { useAuth } from '@/lib/hooks/useAuth'

export default function AddMobilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, getToken } = useAuth()

  const [mobileNumber, setMobileNumber] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (user?.mobileNumber) {
      router.push('/chat')
    }
  }, [user, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, avatar: 'Please select an image file' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, avatar: 'Image size must be less than 5MB' })
      return
    }

    setIsUploading(true)
    setErrors({ ...errors, avatar: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = getToken()
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setAvatar(data.url)
    } catch (err) {
      setErrors({
        ...errors,
        avatar: err instanceof Error ? err.message : 'Failed to upload image',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!mobileNumber) {
      newErrors.mobileNumber = 'Mobile number is required'
    } else if (!validateMobileNumber(mobileNumber)) {
      newErrors.mobileNumber = 'Invalid mobile number (must be 10-15 digits)'
    }

    if (name && !validateName(name)) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const token = getToken()
      const response = await fetch('/api/auth/add-mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobileNumber,
          name: name.trim() || undefined,
          avatar: avatar || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      router.push('/chat')
    } catch (err) {
      setErrors({
        ...errors,
        submit: err instanceof Error ? err.message : 'Failed to update profile',
      })
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

  if (!isAuthenticated) {
    return null
  }

  return (
    <AuthLayout
      title="Complete Your Profile"
      subtitle={`Welcome, ${user?.email}`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="tel"
          label="Mobile Number"
          placeholder="+1234567890"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          error={errors.mobileNumber}
          disabled={isLoading}
          helperText="International format (e.g., +1234567890)"
          autoFocus
        />

        <Input
          type="text"
          label="Name (Optional)"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isLoading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Picture (Optional)
          </label>
          <div className="flex items-center space-x-4">
            {avatar && (
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                <img
                  src={avatar}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                {isUploading ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {avatar ? 'Change Picture' : 'Upload Picture'}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading || isLoading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          {errors.avatar && (
            <p className="mt-1 text-sm text-red-600">{errors.avatar}</p>
          )}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || isUploading}
          className="w-full flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              <span className="ml-2">Completing Setup...</span>
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can update your profile later in settings
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
