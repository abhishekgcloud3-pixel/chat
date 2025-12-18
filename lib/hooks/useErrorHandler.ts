'use client'

import { useState, useCallback } from 'react'
import { ToastNotification } from '@/lib/types/toast'

export interface ErrorInfo {
  message: string
  statusCode?: number
  details?: any
  isNetworkError?: boolean
  isValidationError?: boolean
}

export interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ErrorHandlerConfig {
  showToast?: boolean
  toastDuration?: number
  retryEnabled?: boolean
  retryAttempts?: number
  onError?: (error: ErrorInfo) => void
}

const DEFAULT_CONFIG: Required<ErrorHandlerConfig> = {
  showToast: true,
  toastDuration: 5000,
  retryEnabled: true,
  retryAttempts: 3,
  onError: undefined,
}

export function useErrorHandler(config: Partial<ErrorHandlerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // Simple local state for notifications as fallback
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  const addNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    // Always use local state for this simple implementation
    const id = Date.now().toString()
    const toast: ToastNotification = {
      ...notification,
      id,
    }

    setNotifications(prev => [...prev, toast])

    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, toast.duration || finalConfig.toastDuration)
    }

    return id
  }, [finalConfig.toastDuration])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showErrorToast = useCallback((message: string, title: string = 'Error') => {
    if (finalConfig.showToast) {
      addNotification({
        type: 'error',
        title,
        message,
      })
    }
  }, [addNotification, finalConfig.showToast])

  const showSuccessToast = useCallback((message: string, title: string = 'Success') => {
    if (finalConfig.showToast) {
      addNotification({
        type: 'success',
        title,
        message,
      })
    }
  }, [addNotification, finalConfig.showToast])

  const showWarningToast = useCallback((message: string, title: string = 'Warning') => {
    if (finalConfig.showToast) {
      addNotification({
        type: 'warning',
        title,
        message,
      })
    }
  }, [addNotification, finalConfig.showToast])

  const showInfoToast = useCallback((message: string, title: string = 'Info') => {
    if (finalConfig.showToast) {
      addNotification({
        type: 'info',
        title,
        message,
      })
    }
  }, [addNotification, finalConfig.showToast])

  const processError = useCallback((error: any): ErrorInfo => {
    // Handle different types of errors
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection.',
        isNetworkError: true,
      }
    }

    if (error?.status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        statusCode: 401,
      }
    }

    if (error?.status === 403) {
      return {
        message: 'You don\'t have permission to access this resource.',
        statusCode: 403,
      }
    }

    if (error?.status === 404) {
      return {
        message: 'The requested resource was not found.',
        statusCode: 404,
      }
    }

    if (error?.status === 422) {
      return {
        message: error?.error || 'Please check your input.',
        statusCode: 422,
        isValidationError: true,
      }
    }

    if (error?.statusCode === 422) {
      return {
        message: error?.error || 'Please check your input.',
        statusCode: 422,
        isValidationError: true,
      }
    }

    if (error?.status >= 500) {
      return {
        message: 'Server error. Please try again later.',
        statusCode: error.status,
      }
    }

    if (error?.success === false) {
      return {
        message: error?.error || 'An error occurred',
        statusCode: error?.statusCode,
        details: error?.details,
      }
    }

    // Default error
    return {
      message: error?.message || 'An unexpected error occurred',
      statusCode: error?.statusCode,
      details: error?.details,
    }
  }, [])

  const handleError = useCallback((error: any, context?: string) => {
    const errorInfo = processError(error)
    
    // Call custom error handler if provided
    if (finalConfig.onError) {
      finalConfig.onError(errorInfo)
    }

    // Show toast notification
    const title = context ? `${context} Error` : 'Error'
    showErrorToast(errorInfo.message, title)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context || 'application'}:`, error)
    }

    return errorInfo
  }, [processError, showErrorToast, finalConfig.onError])

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = finalConfig.retryAttempts
  ): Promise<T | null> => {
    let lastError: any

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const errorInfo = processError(error)

        // Don't retry on authentication errors
        if (errorInfo.statusCode === 401 || errorInfo.statusCode === 403) {
          break
        }

        // Don't retry on client validation errors
        if (errorInfo.isValidationError) {
          break
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Final error handling
    handleError(lastError, 'Retry Operation')
    return null
  }, [processError, handleError, finalConfig.retryAttempts])

  const handleApiError = useCallback((response: Response) => {
    return response.json().then((errorData) => {
      const errorInfo = {
        statusCode: response.status,
        ...errorData,
      }
      throw errorInfo
    })
  }, [])

  const makeRequest = useCallback(async <T>(
    url: string,
    options: RequestInit = {},
    context?: string
  ): Promise<T | null> => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        await handleApiError(response)
      }

      const data = await response.json()
      
      // Show success toast for successful operations (excluding GET requests)
      if (options.method && options.method !== 'GET') {
        showSuccessToast(
          context ? `${context} completed successfully` : 'Operation completed',
          'Success'
        )
      }

      return data.data || data
    } catch (error) {
      handleError(error, context)
      return null
    }
  }, [handleApiError, handleError, showSuccessToast])

  return {
    // State
    notifications,
    
    // Error handling
    handleError,
    processError,
    
    // Toast notifications
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
    removeNotification,
    
    // Utilities
    retry,
    makeRequest,
  }
}