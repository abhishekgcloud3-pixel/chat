'use client'

import { useState } from 'react'
import Image from 'next/image'
import UserAvatar from './UserAvatar'
import clsx from 'clsx'

interface MessageBubbleProps {
  content: string
  imageUrl?: string | null
  senderName?: string
  senderAvatar?: string | null
  senderEmail?: string
  timestamp: string
  status?: 'sent' | 'delivered' | 'seen'
  isOwnMessage?: boolean
  showAvatar?: boolean
}

const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'sent':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )
    case 'delivered':
      return (
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7M5 13l4 4m-4-4l4-4m10 8l4-4m-4 4l4 4"
          />
        </svg>
      )
    case 'seen':
      return (
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M5 13l4 4L19 7" />
          <path d="M5 13l4 4m10-8l4-4" />
        </svg>
      )
    default:
      return null
  }
}

export default function MessageBubble({
  content,
  imageUrl,
  senderName,
  senderAvatar,
  senderEmail,
  timestamp,
  status,
  isOwnMessage = false,
  showAvatar = true,
}: MessageBubbleProps) {
  const [showTime, setShowTime] = useState(false)

  return (
    <div
      className={clsx('flex gap-2 mb-4', {
        'flex-row-reverse': isOwnMessage,
      })}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {showAvatar && !isOwnMessage && (
        <div className="flex-shrink-0">
          <UserAvatar
            name={senderName}
            avatar={senderAvatar}
            email={senderEmail}
            size="sm"
          />
        </div>
      )}
      
      <div
        className={clsx('flex flex-col', {
          'items-end': isOwnMessage,
          'items-start': !isOwnMessage,
        })}
      >
        {!isOwnMessage && senderName && (
          <p className="text-xs text-gray-500 mb-1 px-3 font-medium">
            {senderName}
          </p>
        )}

        <div
          className={clsx(
            'rounded-lg px-4 py-2 max-w-xs lg:max-w-md xl:max-w-lg break-words',
            {
              'bg-blue-500 text-white': isOwnMessage,
              'bg-gray-200 text-gray-900': !isOwnMessage,
            }
          )}
        >
          {imageUrl && (
            <div className="mb-2 relative">
              <Image
                src={imageUrl}
                alt="Message attachment"
                width={320}
                height={256}
                className="rounded max-w-xs max-h-64 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {showTime && (
          <p
            className={clsx(
              'text-xs text-gray-500 mt-1 px-3 flex items-center gap-1',
              {
                'flex-row-reverse': isOwnMessage,
              }
            )}
          >
            <span>{formatTime(timestamp)}</span>
            {isOwnMessage && status && (
              <span className={clsx({
                'text-blue-500': status === 'seen',
                'text-gray-400': status !== 'seen',
              })}>
                {getStatusIcon(status)}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
