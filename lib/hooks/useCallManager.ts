'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCallStore } from '@/lib/stores/call-store'
import { useAudio } from './useAudio'
import { useWebRTC } from './useWebRTC'
import {
  initiateCall,
  answerCall,
  declineCall,
  endCall,
  getCallHistory,
} from '@/lib/services/call-api'
import { createSupabaseClient } from '@/lib/realtime/supabase'
import { IncomingCallNotification, Call } from '@/types'
import { WebRTCError } from '@/lib/webrtc/error-handler'

export interface UseCallManagerOptions {
  onIncomingCall?: (call: IncomingCallNotification) => void
  onCallEnded?: (call: Call) => void
  onError?: (error: WebRTCError) => void
  userId?: string
  recipientUser?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface UseCallManagerReturn {
  isInCall: boolean
  isCallRinging: boolean
  callDuration: number
  isMuted: boolean
  isSpeakerOn: boolean
  incomingCall: IncomingCallNotification | null
  currentCall: Call | null
  isConnecting: boolean
  connectionError: string | null
  initiateCall: (conversationId: string, recipientId: string) => Promise<void>
  answerIncomingCall: () => Promise<void>
  declineIncomingCall: () => Promise<void>
  endCurrentCall: () => Promise<void>
  toggleMute: () => void
  toggleSpeaker: () => void
  loadCallHistory: (params?: any) => Promise<any>
}

export function useCallManager(options: UseCallManagerOptions = {}): UseCallManagerReturn {
  const callStore = useCallStore()
  const audioHook = useAudio({
    onError: options.onError,
  })
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isCallRinging, setIsCallRinging] = useState(false)

  const webrtcHook = useWebRTC(callStore.currentCall?.callId || '', {
    onError: options.onError,
  })

  // Listen for incoming calls via Supabase realtime
  useEffect(() => {
    if (!options.userId) return

    const supabaseClient = createSupabaseClient()
    if (!supabaseClient) return

    const subscription = supabaseClient
      .channel(`user-calls-${options.userId}`)
      .on('broadcast', { event: 'incoming_call' }, (message) => {
        const payload = message.payload
        const incomingCall: IncomingCallNotification = {
          callId: payload.callId,
          initiatorId: payload.initiatorId,
          initiatorName: payload.initiatorName || 'Unknown',
          initiatorAvatar: payload.initiatorAvatar,
          conversationId: payload.conversationId,
        }
        callStore.setIncomingCall(incomingCall)
        setIsCallRinging(true)
        options.onIncomingCall?.(incomingCall)
      })
      .on('broadcast', { event: 'call_answered' }, (message) => {
        console.log('Call answered by recipient')
      })
      .on('broadcast', { event: 'call_declined' }, (message) => {
        console.log('Call was declined')
        callStore.endCall()
      })
      .on('broadcast', { event: 'call_ended' }, (message) => {
        console.log('Call ended')
        callStore.endCall()
      })
      .on('broadcast', { event: 'ice_candidate' }, async (message) => {
        try {
          const candidate = new RTCIceCandidate(message.payload)
          await webrtcHook.addIceCandidate(candidate)
        } catch (error) {
          console.warn('Failed to add ICE candidate:', error)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [options.userId, callStore, webrtcHook, options])

  // Call duration timer
  useEffect(() => {
    if (callStore.currentCall?.status === 'active') {
      callTimerRef.current = setInterval(() => {
        callStore.incrementCallDuration()
      }, 1000)
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [callStore.currentCall?.status, callStore])

  const initiateCallHandler = useCallback(
    async (conversationId: string, recipientId: string) => {
      try {
        callStore.setIsConnecting(true)

        // Get audio stream
        const stream = await audioHook.getAudioStream()
        if (!stream) {
          throw new Error('Failed to get audio stream')
        }

        // Initialize WebRTC peer connection
        await webrtcHook.initializePeerConnection(stream)

        // Call API to initiate call
        const callResponse = await initiateCall({
          conversationId,
          recipientId,
        })

        const call: Call = {
          id: callResponse.callId,
          callId: callResponse.callId,
          initiatorId: callResponse.initiatorId,
          recipientId: callResponse.recipientId,
          conversationId: callResponse.conversationId,
          status: 'ringing',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        callStore.setCurrentCall(call)
        setIsCallRinging(true)

        // Create and send offer
        const offer = await webrtcHook.createOffer()
        if (offer) {
          console.log('Offer created and ready for sending')
        }
      } catch (error) {
        const err = error instanceof WebRTCError ? error : 
          error instanceof Error ? new WebRTCError('UNKNOWN' as any, error.message) :
          new WebRTCError('UNKNOWN' as any, 'Failed to initiate call')
        
        callStore.setConnectionError(err.getUserMessage())
        options.onError?.(err)
        throw err
      } finally {
        callStore.setIsConnecting(false)
      }
    },
    [callStore, audioHook, webrtcHook, options.onError]
  )

  const answerCallHandler = useCallback(async () => {
    try {
      if (!callStore.incomingCall) return

      callStore.setIsConnecting(true)

      // Get audio stream
      const stream = await audioHook.getAudioStream()
      if (!stream) {
        throw new Error('Failed to get audio stream')
      }

      // Initialize WebRTC peer connection
      await webrtcHook.initializePeerConnection(stream)

      // Answer the call
      await answerCall({ callId: callStore.incomingCall.callId })

      const call: Call = {
        id: callStore.incomingCall.callId,
        callId: callStore.incomingCall.callId,
        initiatorId: callStore.incomingCall.initiatorId,
        recipientId: options.userId || '',
        conversationId: callStore.incomingCall.conversationId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      callStore.setCurrentCall(call)
      callStore.setIncomingCall(null)
      setIsCallRinging(false)
    } catch (error) {
      const err = error instanceof WebRTCError ? error :
        error instanceof Error ? new WebRTCError('UNKNOWN' as any, error.message) :
        new WebRTCError('UNKNOWN' as any, 'Failed to answer call')
      
      callStore.setConnectionError(err.getUserMessage())
      options.onError?.(err)
      throw err
    } finally {
      callStore.setIsConnecting(false)
    }
  }, [callStore, audioHook, webrtcHook, options.userId, options.onError])

  const declineCallHandler = useCallback(async () => {
    try {
      if (!callStore.incomingCall) return

      await declineCall({ callId: callStore.incomingCall.callId })
      callStore.setIncomingCall(null)
      setIsCallRinging(false)
    } catch (error) {
      console.error('Failed to decline call:', error)
    }
  }, [callStore])

  const endCallHandler = useCallback(async () => {
    try {
      if (!callStore.currentCall) return

      const duration = callStore.callDuration

      // Close WebRTC connection
      webrtcHook.close()

      // Stop audio
      audioHook.stopAudio()

      // End call via API
      await endCall({
        callId: callStore.currentCall.callId,
        duration,
      })

      options.onCallEnded?.(callStore.currentCall)
      callStore.endCall()
      setIsCallRinging(false)
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }, [callStore, webrtcHook, audioHook, options])

  const loadCallHistoryHandler = useCallback(
    async (params?: any) => {
      try {
        const response = await getCallHistory(params)
        callStore.setCallHistory(response.calls)
        return response
      } catch (error) {
        console.error('Failed to load call history:', error)
        throw error
      }
    },
    [callStore]
  )

  return {
    isInCall: !!callStore.currentCall,
    isCallRinging,
    callDuration: callStore.callDuration,
    isMuted: callStore.isAudioMuted,
    isSpeakerOn: callStore.isSpeakerOn,
    incomingCall: callStore.incomingCall,
    currentCall: callStore.currentCall,
    isConnecting: callStore.isConnecting,
    connectionError: callStore.connectionError,
    initiateCall: initiateCallHandler,
    answerIncomingCall: answerCallHandler,
    declineIncomingCall: declineCallHandler,
    endCurrentCall: endCallHandler,
    toggleMute: () => {
      callStore.toggleAudioMute()
      audioHook.toggleMute()
    },
    toggleSpeaker: callStore.toggleSpeaker,
    loadCallHistory: loadCallHistoryHandler,
  }
}
