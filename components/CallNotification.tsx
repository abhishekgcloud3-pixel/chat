'use client'

import { useState, useEffect } from 'react'
import { IncomingCallNotification } from '@/types'
import UserAvatar from './UserAvatar'

interface CallNotificationProps {
  call: IncomingCallNotification
  onAccept: (callId: string) => Promise<void>
  onDecline: (callId: string) => Promise<void>
  isProcessing?: boolean
}

export default function CallNotification({
  call,
  onAccept,
  onDecline,
  isProcessing = false,
}: CallNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isRinging, setIsRinging] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRinging((prev) => !prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const handleAccept = async () => {
    try {
      await onAccept(call.callId)
    } catch (error) {
      console.error('Failed to accept call:', error)
    }
  }

  const handleDecline = async () => {
    setIsVisible(false)
    try {
      await onDecline(call.callId)
    } catch (error) {
      console.error('Failed to decline call:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-8 max-w-sm w-full mx-4 transform transition-all ${
        isRinging ? 'scale-100' : 'scale-95'
      }`}>
        <div className="flex flex-col items-center space-y-6">
          {/* Caller Avatar */}
          <div className="relative">
            <UserAvatar
              src={call.initiatorAvatar}
              alt={call.initiatorName}
              size="lg"
            />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-pulse" />
          </div>

          {/* Caller Name and Status */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">{call.initiatorName}</h2>
            <p className="text-gray-500 mt-2">Calling...</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 w-full mt-8">
            {/* Decline Button */}
            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M16.192 6.344L11.949 10.586 7.707 6.344A2.828 2.828 0 104.293 9.758L8.535 14 4.293 18.242a2.828 2.828 0 104.414 4.414l4.242-4.242 4.242 4.242a2.828 2.828 0 004.414-4.414L15.163 14l4.242-4.242a2.827 2.827 0 10-3.213-4.414z" />
              </svg>
              Decline
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.472 9.017c-.585-.977-1.585-1.512-2.695-1.512-1.111 0-2.11.535-2.696 1.512C13.796 8.408 12.469 8 11 8c-1.468 0-2.795.408-3.981 1.017-.586-.977-1.585-1.512-2.696-1.512-1.11 0-2.11.535-2.695 1.512C.914 10.188 0 12.205 0 14.5c0 3.86 2.911 7 6.5 7 1.93 0 3.665-.83 4.867-2.166C12.57 20.67 14.305 21.5 16.235 21.5 19.589 21.5 22 19.36 22 16.5c0-2.295-.914-4.312-2.291-5.844l.763-1.639z" />
              </svg>
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
