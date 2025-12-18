'use client'

import { useEffect, useState } from 'react'
import CallModal from './CallModal'
import CallNotification from './CallNotification'
import { useCallManager } from '@/lib/hooks/useCallManager'
import { useUserDetails } from '@/lib/hooks/useUserDetails'
import { useAuth } from '@/lib/hooks/useAuth'
import toast from 'react-hot-toast'

interface CallInterfaceProps {
  conversationId?: string
  recipientId?: string
  recipientName?: string
  recipientAvatar?: string
}

export default function CallInterface({
  conversationId,
  recipientId,
  recipientName,
  recipientAvatar,
}: CallInterfaceProps) {
  const { user } = useAuth()
  const { user: incomingCaller } = useUserDetails(undefined)
  const [isMinimized, setIsMinimized] = useState(false)

  const callManager = useCallManager({
    userId: user?.id,
    recipientUser: recipientId ? {
      id: recipientId,
      name: recipientName || 'Unknown',
      avatar: recipientAvatar,
    } : undefined,
    onIncomingCall: (call) => {
      console.log('Incoming call:', call)
    },
    onCallEnded: (call) => {
      toast.success(`Call ended. Duration: ${call.duration || 0}s`)
    },
    onError: (error) => {
      toast.error(error.getUserMessage())
    },
  })

  const handleInitiateCall = async () => {
    if (!conversationId || !recipientId) {
      toast.error('Missing conversation or recipient information')
      return
    }

    try {
      await callManager.initiateCall(conversationId, recipientId)
      toast.success('Call initiated')
    } catch (error) {
      console.error('Failed to initiate call:', error)
    }
  }

  const handleAnswerCall = async () => {
    try {
      await callManager.answerIncomingCall()
      toast.success('Call connected')
    } catch (error) {
      console.error('Failed to answer call:', error)
    }
  }

  const handleDeclineCall = async () => {
    try {
      await callManager.declineIncomingCall()
      toast.success('Call declined')
    } catch (error) {
      console.error('Failed to decline call:', error)
    }
  }

  const handleEndCall = async () => {
    try {
      await callManager.endCurrentCall()
      toast.success('Call ended')
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }

  if (!user) return null

  return (
    <>
      {/* Incoming Call Notification */}
      {callManager.incomingCall && (
        <CallNotification
          call={{
            ...callManager.incomingCall,
            initiatorName: incomingCaller?.name || 'Unknown',
            initiatorAvatar: incomingCaller?.avatar,
          }}
          onAccept={handleAnswerCall}
          onDecline={handleDeclineCall}
          isProcessing={callManager.isConnecting}
        />
      )}

      {/* Active Call Modal */}
      {callManager.isInCall && !isMinimized && (
        <CallModal
          call={callManager.currentCall}
          recipientName={recipientName}
          recipientAvatar={recipientAvatar}
          callDuration={callManager.callDuration}
          isMuted={callManager.isMuted}
          isSpeakerOn={callManager.isSpeakerOn}
          isConnecting={callManager.isConnecting}
          connectionStatus={callManager.connectionError || undefined}
          onMuteToggle={callManager.toggleMute}
          onSpeakerToggle={callManager.toggleSpeaker}
          onEndCall={handleEndCall}
          onMinimize={() => setIsMinimized(true)}
        />
      )}
    </>
  )
}
