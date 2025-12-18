'use client'

export enum WebRTCErrorType {
  NO_MICROPHONE = 'NO_MICROPHONE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  ICE_FAILED = 'ICE_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export class WebRTCError extends Error {
  constructor(
    public type: WebRTCErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'WebRTCError'
  }

  getUserMessage(): string {
    switch (this.type) {
      case WebRTCErrorType.NO_MICROPHONE:
        return 'No microphone found on this device.'
      case WebRTCErrorType.PERMISSION_DENIED:
        return 'Please allow access to your microphone to make calls.'
      case WebRTCErrorType.NOT_SUPPORTED:
        return 'Your browser does not support WebRTC. Please use a modern browser like Chrome, Firefox, Safari, or Edge.'
      case WebRTCErrorType.CONNECTION_FAILED:
        return 'Failed to establish connection. Please check your internet connection.'
      case WebRTCErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.'
      case WebRTCErrorType.TIMEOUT:
        return 'Call timeout. The other person did not answer.'
      case WebRTCErrorType.ICE_FAILED:
        return 'Failed to establish peer connection. Please check your network.'
      case WebRTCErrorType.UNKNOWN:
      default:
        return `An error occurred: ${this.message}`
    }
  }

  isRecoverable(): boolean {
    return this.type === WebRTCErrorType.NETWORK_ERROR || this.type === WebRTCErrorType.TIMEOUT
  }
}

export class WebRTCErrorHandler {
  static async handleMicrophoneError(error: Error): Promise<WebRTCError> {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return new WebRTCError(
          WebRTCErrorType.PERMISSION_DENIED,
          'Microphone permission denied',
          error
        )
      } else if (error.name === 'NotFoundError') {
        return new WebRTCError(
          WebRTCErrorType.NO_MICROPHONE,
          'No microphone found',
          error
        )
      }
    }
    return new WebRTCError(WebRTCErrorType.UNKNOWN, error.message, error)
  }

  static handlePeerConnectionError(error: Error): WebRTCError {
    const message = error.message.toLowerCase()

    if (message.includes('ice')) {
      return new WebRTCError(
        WebRTCErrorType.ICE_FAILED,
        'ICE connection failed',
        error
      )
    } else if (message.includes('network') || message.includes('connection')) {
      return new WebRTCError(
        WebRTCErrorType.CONNECTION_FAILED,
        'Connection failed',
        error
      )
    }

    return new WebRTCError(WebRTCErrorType.UNKNOWN, error.message, error)
  }

  static logError(error: WebRTCError): void {
    console.error(`[WebRTC Error] Type: ${error.type}`, {
      message: error.message,
      userMessage: error.getUserMessage(),
      originalError: error.originalError,
    })
  }

  static createTimeoutError(timeoutMs: number): WebRTCError {
    return new WebRTCError(
      WebRTCErrorType.TIMEOUT,
      `Call timeout after ${timeoutMs}ms`
    )
  }

  static checkBrowserSupport(): { supported: boolean; error?: WebRTCError } {
    if (typeof window === 'undefined') {
      return {
        supported: false,
        error: new WebRTCError(WebRTCErrorType.NOT_SUPPORTED, 'Not running in browser'),
      }
    }

    const hasRTC =
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection

    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia

    if (!hasRTC || !hasGetUserMedia) {
      return {
        supported: false,
        error: new WebRTCError(
          WebRTCErrorType.NOT_SUPPORTED,
          'WebRTC not supported in this browser'
        ),
      }
    }

    return { supported: true }
  }
}
