'use client'

import axios from 'axios'

export interface InitiateCallParams {
  conversationId: string
  recipientId: string
}

export interface AnswerCallParams {
  callId: string
}

export interface DeclineCallParams {
  callId: string
}

export interface EndCallParams {
  callId: string
  duration?: number
}

export interface SendOfferParams {
  callId: string
  offer: RTCSessionDescriptionInit
}

export interface SendAnswerParams {
  callId: string
  answer: RTCSessionDescriptionInit
}

export interface SendIceCandidateParams {
  callId: string
  candidate: string
  sdpMLineIndex?: number
  sdpMid?: string
}

/**
 * Initiate a call
 */
export async function initiateCall(params: InitiateCallParams): Promise<any> {
  const response = await axios.post('/api/calls/initiate', {
    conversationId: params.conversationId,
    recipientId: params.recipientId,
  })
  return response.data
}

/**
 * Answer a call
 */
export async function answerCall(params: AnswerCallParams): Promise<any> {
  const response = await axios.post('/api/calls/answer', {
    callId: params.callId,
  })
  return response.data
}

/**
 * Decline a call
 */
export async function declineCall(params: DeclineCallParams): Promise<any> {
  const response = await axios.post('/api/calls/decline', {
    callId: params.callId,
  })
  return response.data
}

/**
 * End a call
 */
export async function endCall(params: EndCallParams): Promise<any> {
  const response = await axios.post('/api/calls/end', {
    callId: params.callId,
    duration: params.duration || 0,
  })
  return response.data
}

/**
 * Send ICE candidate
 */
export async function sendIceCandidate(params: SendIceCandidateParams): Promise<any> {
  const response = await axios.post('/api/calls/ice-candidates', {
    callId: params.callId,
    candidate: params.candidate,
    sdpMLineIndex: params.sdpMLineIndex,
    sdpMid: params.sdpMid,
  })
  return response.data
}

/**
 * Get ICE candidates
 */
export async function getIceCandidates(callId: string): Promise<any> {
  const response = await axios.get(`/api/calls/ice-candidates?callId=${callId}`)
  return response.data
}

/**
 * Get call history
 */
export async function getCallHistory(params?: {
  limit?: number
  skip?: number
  status?: string
  conversationId?: string
}): Promise<any> {
  const query = new URLSearchParams()
  if (params?.limit) query.append('limit', params.limit.toString())
  if (params?.skip) query.append('skip', params.skip.toString())
  if (params?.status) query.append('status', params.status)
  if (params?.conversationId) query.append('conversationId', params.conversationId)

  const response = await axios.get(`/api/calls/history?${query.toString()}`)
  return response.data
}
