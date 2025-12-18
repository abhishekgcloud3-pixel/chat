'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useImageUpload } from '@/lib/hooks/useImageUpload'
import clsx from 'clsx'

interface ChatInputProps {
  onSend: (content: string, imageUrl?: string) => Promise<void>
  onCall?: () => Promise<void>
  disabled?: boolean
  isInCall?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  onCall,
  disabled = false,
  isInCall = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isCallLoading, setIsCallLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    file: File
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { uploadImage, isUploading: isImageUploading } = useImageUpload()

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await uploadImage(file)
      if (result) {
        setSelectedImage({
          url: result.url,
          file,
        })
      }
    } catch (error) {
      console.error('Image upload failed:', error)
    }
  }

  const handleSend = async () => {
    if ((!content.trim() && !selectedImage) || isSending) return

    setIsSending(true)
    try {
      await onSend(content.trim(), selectedImage?.url)
      setContent('')
      setSelectedImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCall = async () => {
    if (!onCall || isInCall || isCallLoading) return
    setIsCallLoading(true)
    try {
      await onCall()
    } catch (error) {
      console.error('Failed to initiate call:', error)
    } finally {
      setIsCallLoading(false)
    }
  }

  const isEmpty = !content.trim() && !selectedImage
  const isLoading = isSending || isImageUploading || isCallLoading

  return (
    <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
      {selectedImage && (
        <div className="mb-3 relative inline-block">
          <Image
            src={selectedImage.url}
            alt="Preview"
            width={64}
            height={64}
            className="object-cover rounded-lg"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-3 items-flex-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          disabled={disabled || isLoading}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || isImageUploading}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach image"
        >
          {isImageUploading ? (
            <Spinner size="sm" />
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
        </button>

        {onCall && (
          <button
            onClick={handleCall}
            disabled={disabled || isInCall || isCallLoading || isImageUploading || isSending}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Start voice call"
          >
            {isCallLoading ? (
              <Spinner size="sm" />
            ) : (
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.707 12.293l-5.293-5.293a1 1 0 00-1.414 1.414L14.586 11H3a1 1 0 000 2h11.586l-3.586 3.586a1 1 0 101.414 1.414l5.293-5.293a1 1 0 000-1.414zM18 2a1 1 0 011 1v4a1 1 0 01-2 0V3a1 1 0 011-1zm0 12a1 1 0 011 1v4a1 1 0 01-2 0v-4a1 1 0 011-1z" />
              </svg>
            )}
          </button>
        )}

        <div className="flex-grow min-h-10 bg-gray-100 rounded-lg px-4 py-2 flex items-center">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full bg-gray-100 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed max-h-32"
            style={{ overflow: 'hidden' }}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={isEmpty || disabled || isLoading}
          className="flex-shrink-0 px-4 py-2"
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16071128 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5950799 3.34915502,10.7521772 3.50612381,10.7521772 L16.6915026,11.5376639 C16.6915026,11.5376639 17.1624089,11.5376639 17.1624089,12.0089561 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  )
}
