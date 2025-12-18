'use client'

export class AudioHandler {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyzer: AnalyserNode | null = null
  private volumeCallback: ((volume: number) => void) | null = null

  static isWebRTCSupported(): boolean {
    if (typeof window === 'undefined') return false
    const rtc =
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    return !!rtc
  }

  async getAudioPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as any })
      return result.state === 'granted' || result.state === 'prompt'
    } catch {
      return true
    }
  }

  async requestAudioStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      this.mediaStream = stream
      return stream
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow access to your microphone.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found on this device.')
        }
      }
      throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream
  }

  toggleMute(muted: boolean): void {
    if (!this.mediaStream) return
    this.mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted
    })
  }

  isMuted(): boolean {
    if (!this.mediaStream) return false
    const audioTracks = this.mediaStream.getAudioTracks()
    return audioTracks.length === 0 || !audioTracks[0].enabled
  }

  startVolumeDetection(callback: (volume: number) => void, interval: number = 100): void {
    if (!this.mediaStream) return

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    if (!this.analyzer) {
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyzer = this.audioContext.createAnalyser()
      this.analyzer.fftSize = 256
      source.connect(this.analyzer)
    }

    this.volumeCallback = callback
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount)

    const detect = () => {
      if (!this.analyzer || !this.volumeCallback) return

      this.analyzer.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length
      const volume = Math.min(100, Math.round((average / 255) * 100))

      this.volumeCallback(volume)
      setTimeout(detect, interval)
    }

    detect()
  }

  stopVolumeDetection(): void {
    this.volumeCallback = null
  }

  stopAudioStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop()
      })
      this.mediaStream = null
    }

    if (this.analyzer) {
      this.analyzer.disconnect()
      this.analyzer = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    this.volumeCallback = null
  }

  async playRingtone(): Promise<void> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)

      audioContext.close()
    } catch (error) {
      console.error('Failed to play ringtone:', error)
    }
  }

  getAudioContextState(): string {
    return this.audioContext?.state || 'not initialized'
  }

  async testMicrophone(): Promise<{ success: boolean; message: string }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return { success: true, message: 'Microphone is working' }
    } catch (error) {
      return {
        success: false,
        message: `Microphone test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }
}

export const audioHandler = new AudioHandler()
