'use client'

import { create } from 'zustand'
import { Call, CallStatus, IncomingCallNotification } from '@/types'

export interface CallState {
  currentCall: Call | null
  incomingCall: IncomingCallNotification | null
  callHistory: Call[]
  isAudioMuted: boolean
  isSpeakerOn: boolean
  callDuration: number
  isConnecting: boolean
  connectionError: string | null

  // Actions
  setCurrentCall: (call: Call | null) => void
  setIncomingCall: (call: IncomingCallNotification | null) => void
  setCallHistory: (calls: Call[]) => void
  addCallToHistory: (call: Call) => void
  toggleAudioMute: () => void
  toggleSpeaker: () => void
  setCallDuration: (duration: number) => void
  incrementCallDuration: () => void
  setIsConnecting: (connecting: boolean) => void
  setConnectionError: (error: string | null) => void
  endCall: () => void
  resetCallState: () => void
}

const initialState = {
  currentCall: null,
  incomingCall: null,
  callHistory: [],
  isAudioMuted: false,
  isSpeakerOn: false,
  callDuration: 0,
  isConnecting: false,
  connectionError: null,
}

export const useCallStore = create<CallState>((set) => ({
  ...initialState,

  setCurrentCall: (call: Call | null) =>
    set({
      currentCall: call,
      callDuration: 0,
      connectionError: null,
    }),

  setIncomingCall: (call: IncomingCallNotification | null) =>
    set({
      incomingCall: call,
    }),

  setCallHistory: (calls: Call[]) =>
    set({
      callHistory: calls,
    }),

  addCallToHistory: (call: Call) =>
    set((state) => ({
      callHistory: [call, ...state.callHistory],
    })),

  toggleAudioMute: () =>
    set((state) => ({
      isAudioMuted: !state.isAudioMuted,
    })),

  toggleSpeaker: () =>
    set((state) => ({
      isSpeakerOn: !state.isSpeakerOn,
    })),

  setCallDuration: (duration: number) =>
    set({
      callDuration: duration,
    }),

  incrementCallDuration: () =>
    set((state) => ({
      callDuration: state.callDuration + 1,
    })),

  setIsConnecting: (connecting: boolean) =>
    set({
      isConnecting: connecting,
    }),

  setConnectionError: (error: string | null) =>
    set({
      connectionError: error,
    }),

  endCall: () =>
    set({
      currentCall: null,
      incomingCall: null,
      callDuration: 0,
      isAudioMuted: false,
      isConnecting: false,
      connectionError: null,
    }),

  resetCallState: () => set(initialState),
}))
