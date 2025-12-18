'use client'

import { useEffect, useState } from 'react'
import { Call, CallStatus } from '@/types'
import UserAvatar from './UserAvatar'

interface CallModalProps {
  call: Call | null
  recipientName?: string
  recipientAvatar?: string
  callDuration: number
  isMuted: boolean
  isSpeakerOn: boolean
  isConnecting: boolean
  connectionStatus?: string
  onMuteToggle: () => void
  onSpeakerToggle: () => void
  onEndCall: () => Promise<void>
  onMinimize?: () => void
}

export default function CallModal({
  call,
  recipientName,
  recipientAvatar,
  callDuration,
  isMuted,
  isSpeakerOn,
  isConnecting,
  connectionStatus,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
  onMinimize,
}: CallModalProps) {
  const [isEndingCall, setIsEndingCall] = useState(false)

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusDisplay = (): string => {
    if (isConnecting) return 'Connecting...'
    if (connectionStatus) return connectionStatus
    if (call?.status === CallStatus.ACTIVE) return 'Connected'
    if (call?.status === CallStatus.RINGING) return 'Ringing...'
    return call?.status || 'Unknown'
  }

  const handleEndCall = async () => {
    setIsEndingCall(true)
    try {
      await onEndCall()
    } catch (error) {
      console.error('Failed to end call:', error)
    } finally {
      setIsEndingCall(false)
    }
  }

  if (!call) return null

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-blue-900 flex flex-col items-center justify-between p-4 z-40">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8 mt-6">
        <button
          onClick={onMinimize}
          className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          title="Minimize call"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="text-white text-sm font-medium">{getStatusDisplay()}</span>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center space-y-4">
          <UserAvatar
            src={recipientAvatar}
            alt={recipientName || 'User'}
            size="2xl"
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">{recipientName}</h1>
            <div className="text-6xl font-mono text-white mt-6 tracking-wider">
              {formatDuration(callDuration)}
            </div>
          </div>
        </div>

        {/* Audio Indicator (optional) */}
        {!isMuted && (
          <div className="flex gap-1 items-end h-12">
            {[0.3, 0.6, 1].map((scale, i) => (
              <div
                key={i}
                className="bg-white rounded-full animate-pulse"
                style={{
                  height: `${24 * scale}px`,
                  width: '4px',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col gap-4 mb-8">
        {/* Primary Controls */}
        <div className="flex gap-6 justify-center items-center">
          {/* Mute Button */}
          <button
            onClick={onMuteToggle}
            className={`rounded-full p-4 transition-all transform hover:scale-110 ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white bg-opacity-30 hover:bg-opacity-40'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 5.5v1.41L15.59 9.5H17v-4a4 4 0 00-4-4zm0 17c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-14c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              </svg>
            )}
          </button>

          {/* Speaker Button */}
          <button
            onClick={onSpeakerToggle}
            className={`rounded-full p-4 transition-all transform hover:scale-110 ${
              isSpeakerOn
                ? 'bg-white bg-opacity-30 hover:bg-opacity-40'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            {isSpeakerOn ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.3-2.5-4.04v8.08c1.48-.74 2.5-2.27 2.5-4.04zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16071128 C3.34915502,0.9 2.40734225,1.00636533 1.77946707,1.4776575 C0.994623095,2.10604706 0.837654326,3.0486314 1.15159189,3.99701575 L3.03521743,10.4380088 C3.03521743,10.5950799 3.34915502,10.7521772 3.50612381,10.7521772 L16.6915026,11.5376639 C16.6915026,11.5376639 17.1624089,11.5376639 17.1624089,12.0089561 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
              </svg>
            )}
          </button>
        </div>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          disabled={isEndingCall}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.192 6.344L11.949 10.586 7.707 6.344A2.828 2.828 0 104.293 9.758L8.535 14 4.293 18.242a2.828 2.828 0 104.414 4.414l4.242-4.242 4.242 4.242a2.828 2.828 0 004.414-4.414L15.163 14l4.242-4.242a2.827 2.827 0 10-3.213-4.414z" />
          </svg>
          End Call
        </button>
      </div>
    </div>
  )
}
