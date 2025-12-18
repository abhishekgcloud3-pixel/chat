'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { PeerConnectionHandler } from '@/lib/webrtc/peer-connection'
import { WebRTCError, WebRTCErrorHandler, WebRTCErrorType } from '@/lib/webrtc/error-handler'
import axios from 'axios'

export interface UseWebRTCOptions {
  onRemoteTrack?: (track: MediaStreamTrack) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
  onError?: (error: WebRTCError) => void
}

export interface UseWebRTCReturn {
  isConnected: boolean
  isConnecting: boolean
  error: WebRTCError | null
  connectionState: RTCPeerConnectionState | null
  iceConnectionState: RTCIceConnectionState | null
  initializePeerConnection: (mediaStream: MediaStream) => Promise<void>
  createOffer: () => Promise<RTCSessionDescriptionInit | null>
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit | null>
  setRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>
  addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>
  close: () => void
}

export function useWebRTC(callId: string, options: UseWebRTCOptions = {}): UseWebRTCReturn {
  const peerConnectionRef = useRef<PeerConnectionHandler | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<WebRTCError | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null)
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState | null>(null)

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidate) => {
      try {
        await axios.post('/api/calls/ice-candidates', {
          callId,
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid,
        })
      } catch (err) {
        console.error('Failed to send ICE candidate:', err)
      }
    },
    [callId]
  )

  const handleConnectionStateChange = useCallback(
    (state: RTCPeerConnectionState) => {
      setConnectionState(state)
      setIsConnected(state === 'connected')
      options.onConnectionStateChange?.(state)

      if (state === 'failed' || state === 'disconnected') {
        const webrtcError = new WebRTCError(
          WebRTCErrorType.CONNECTION_FAILED,
          `Connection state: ${state}`
        )
        setError(webrtcError)
        options.onError?.(webrtcError)
      }
    },
    [options]
  )

  const handleIceConnectionStateChange = useCallback(
    (state: RTCIceConnectionState) => {
      setIceConnectionState(state)
      options.onIceConnectionStateChange?.(state)

      if (state === 'failed') {
        const webrtcError = new WebRTCError(
          WebRTCErrorType.ICE_FAILED,
          'ICE connection failed'
        )
        setError(webrtcError)
        options.onError?.(webrtcError)
      }
    },
    [options]
  )

  const handleError = useCallback(
    (err: Error) => {
      const webrtcError = WebRTCErrorHandler.handlePeerConnectionError(err)
      setError(webrtcError)
      WebRTCErrorHandler.logError(webrtcError)
      options.onError?.(webrtcError)
    },
    [options]
  )

  const initializePeerConnection = useCallback(
    async (mediaStream: MediaStream) => {
      try {
        setIsConnecting(true)
        setError(null)

        const supportCheck = WebRTCErrorHandler.checkBrowserSupport()
        if (!supportCheck.supported) {
          throw supportCheck.error!
        }

        const pcHandler = new PeerConnectionHandler({
          onIceCandidate: handleIceCandidate,
          onConnectionStateChange: handleConnectionStateChange,
          onIceConnectionStateChange: handleIceConnectionStateChange,
          onTrack: options.onRemoteTrack,
          onError: handleError,
        })

        await pcHandler.initialize(mediaStream)
        peerConnectionRef.current = pcHandler
      } catch (err) {
        const error = err instanceof WebRTCError ? err : 
          err instanceof Error ? WebRTCErrorHandler.handlePeerConnectionError(err) :
          new WebRTCError(WebRTCErrorType.UNKNOWN, 'Unknown error')
        
        setError(error)
        options.onError?.(error)
        throw error
      } finally {
        setIsConnecting(false)
      }
    },
    [handleIceCandidate, handleConnectionStateChange, handleIceConnectionStateChange, options.onRemoteTrack, options.onError, handleError]
  )

  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    try {
      if (!peerConnectionRef.current) {
        throw new WebRTCError(
          WebRTCErrorType.UNKNOWN,
          'Peer connection not initialized'
        )
      }

      const offer = await peerConnectionRef.current.createOffer()
      return offer
    } catch (err) {
      const error = err instanceof WebRTCError ? err :
        err instanceof Error ? WebRTCErrorHandler.handlePeerConnectionError(err) :
        new WebRTCError(WebRTCErrorType.UNKNOWN, 'Failed to create offer')
      
      setError(error)
      options.onError?.(error)
      return null
    }
  }, [options])

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> => {
      try {
        if (!peerConnectionRef.current) {
          throw new WebRTCError(
            WebRTCErrorType.UNKNOWN,
            'Peer connection not initialized'
          )
        }

        const answer = await peerConnectionRef.current.createAnswer(offer)
        return answer
      } catch (err) {
        const error = err instanceof WebRTCError ? err :
          err instanceof Error ? WebRTCErrorHandler.handlePeerConnectionError(err) :
          new WebRTCError(WebRTCErrorType.UNKNOWN, 'Failed to create answer')
        
        setError(error)
        options.onError?.(error)
        return null
      }
    },
    [options]
  )

  const setRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      try {
        if (!peerConnectionRef.current) {
          throw new WebRTCError(
            WebRTCErrorType.UNKNOWN,
            'Peer connection not initialized'
          )
        }

        await peerConnectionRef.current.setRemoteAnswer(answer)
      } catch (err) {
        const error = err instanceof WebRTCError ? err :
          err instanceof Error ? WebRTCErrorHandler.handlePeerConnectionError(err) :
          new WebRTCError(WebRTCErrorType.UNKNOWN, 'Failed to set remote answer')
        
        setError(error)
        options.onError?.(error)
        throw error
      }
    },
    [options]
  )

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidate) => {
      try {
        if (!peerConnectionRef.current) return

        await peerConnectionRef.current.addIceCandidate(candidate)
      } catch (err) {
        console.warn('Failed to add ICE candidate:', err)
      }
    },
    []
  )

  const close = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setIsConnected(false)
    setConnectionState(null)
    setIceConnectionState(null)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      close()
    }
  }, [close])

  return {
    isConnected,
    isConnecting,
    error,
    connectionState,
    iceConnectionState,
    initializePeerConnection,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    close,
  }
}
