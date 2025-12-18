'use client'

const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:19302',
  'stun:stun4.l.google.com:19302',
]

export interface PeerConnectionConfig {
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void
  onTrack?: (track: MediaStreamTrack) => void
  onError?: (error: Error) => void
}

export class PeerConnectionHandler {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private config: PeerConnectionConfig

  constructor(config: PeerConnectionConfig = {}) {
    this.config = config
  }

  static isWebRTCSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    )
  }

  async initialize(mediaStream: MediaStream): Promise<void> {
    try {
      this.localStream = mediaStream

      const pcConfig: RTCConfiguration = {
        iceServers: STUN_SERVERS.map((server) => ({
          urls: server,
        })),
      }

      this.peerConnection = new (window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection)(pcConfig)

      this.setupEventHandlers()

      mediaStream.getAudioTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, mediaStream)
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize peer connection')
      this.config.onError?.(err)
      throw err
    }
  }

  private setupEventHandlers(): void {
    if (!this.peerConnection) return

    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        this.config.onIceCandidate?.(event.candidate)
      }
    })

    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection!.connectionState
      console.log('Connection state changed:', state)
      this.config.onConnectionStateChange?.(state)
    })

    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection!.iceConnectionState
      console.log('ICE connection state changed:', state)
      this.config.onIceConnectionStateChange?.(state)

      if (state === 'failed' || state === 'disconnected') {
        this.config.onError?.(new Error(`Connection ${state}`))
      }
    })

    this.peerConnection.addEventListener('track', (event) => {
      console.log('Remote track received:', event.track)
      this.config.onTrack?.(event.track)
    })

    this.peerConnection.addEventListener('error', (event) => {
      const error = event instanceof Event ? new Error('Peer connection error') : event
      this.config.onError?.(error)
    })
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      })
      await this.peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create offer')
      this.config.onError?.(err)
      throw err
    }
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create answer')
      this.config.onError?.(err)
      throw err
    }
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to set remote answer')
      this.config.onError?.(err)
      throw err
    }
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.warn('Failed to add ICE candidate:', error)
    }
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null
  }

  getIceConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection?.iceConnectionState || null
  }

  getSignalingState(): RTCSignalingState | null {
    return this.peerConnection?.signalingState || null
  }

  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.localStream = null
    }
  }

  getStats(): Promise<RTCStatsReport> | null {
    if (!this.peerConnection) return null
    return this.peerConnection.getStats()
  }

  getRemoteAudioTracks(): MediaStreamTrack[] {
    if (!this.peerConnection) return []
    
    const remoteStreams = this.peerConnection.getReceivers()
      .filter(receiver => receiver.track.kind === 'audio')
      .map(receiver => receiver.track)
    
    return remoteStreams
  }
}
