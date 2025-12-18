'use client'

import { useState, useCallback, useEffect } from 'react'
import { audioHandler, AudioHandler } from '@/lib/webrtc/audio-handler'
import { WebRTCError, WebRTCErrorHandler, WebRTCErrorType } from '@/lib/webrtc/error-handler'

export interface UseAudioOptions {
  onPermissionDenied?: () => void
  onError?: (error: WebRTCError) => void
}

export interface UseAudioReturn {
  stream: MediaStream | null
  isMuted: boolean
  isSpeakerOn: boolean
  volume: number
  isLoading: boolean
  error: WebRTCError | null
  requestPermission: () => Promise<boolean>
  getAudioStream: () => Promise<MediaStream | null>
  toggleMute: () => void
  toggleSpeaker: () => void
  stopAudio: () => void
  testMicrophone: () => Promise<{ success: boolean; message: string }>
}

export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [volume, setVolume] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<WebRTCError | null>(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
    }
  }, [stream])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await audioHandler.getAudioPermission()
      return hasPermission
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      const webrtcError = await WebRTCErrorHandler.handleMicrophoneError(error)
      setError(webrtcError)
      options.onError?.(webrtcError)
      return false
    }
  }, [options])

  const getAudioStream = useCallback(async (): Promise<MediaStream | null> => {
    if (stream) {
      return stream
    }

    setIsLoading(true)
    setError(null)

    try {
      const newStream = await audioHandler.requestAudioStream()
      setStream(newStream)

      audioHandler.startVolumeDetection((vol) => {
        setVolume(vol)
      })

      return newStream
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      const webrtcError = await WebRTCErrorHandler.handleMicrophoneError(error)
      setError(webrtcError)
      options.onError?.(webrtcError)

      if (webrtcError.type === WebRTCErrorType.PERMISSION_DENIED) {
        options.onPermissionDenied?.()
      }

      return null
    } finally {
      setIsLoading(false)
    }
  }, [stream, options])

  const toggleMute = useCallback(() => {
    audioHandler.toggleMute(!isMuted)
    setIsMuted((prev) => !prev)
  }, [isMuted])

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev)

    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        if ('setSinkId' in track) {
          (track as any).setSinkId('')
        }
      })
    }
  }, [stream])

  const stopAudio = useCallback(() => {
    audioHandler.stopAudioStream()
    audioHandler.stopVolumeDetection()
    setStream(null)
    setVolume(0)
    setIsMuted(false)
  }, [])

  const testMicrophone = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    return audioHandler.testMicrophone()
  }, [])

  return {
    stream,
    isMuted,
    isSpeakerOn,
    volume,
    isLoading,
    error,
    requestPermission,
    getAudioStream,
    toggleMute,
    toggleSpeaker,
    stopAudio,
    testMicrophone,
  }
}
