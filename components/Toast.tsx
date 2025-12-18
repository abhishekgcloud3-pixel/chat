'use client'

import React, { useEffect, createContext, useContext, useState } from 'react'
import { ToastNotification } from '@/lib/types/toast'

interface ToastContextType {
  toasts: ToastNotification[]
  addToast: (toast: Omit<ToastNotification, 'id'>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProps {
  toast: ToastNotification
  onRemove: (id: string) => void
}

function Toast({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id)
      }, toast.duration)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove])

  const getToastStyles = () => {
    const baseStyles = 'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out'
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-l-4 border-green-500`
      case 'error':
        return `${baseStyles} border-l-4 border-red-500`
      case 'warning':
        return `${baseStyles} border-l-4 border-yellow-500`
      case 'info':
        return `${baseStyles} border-l-4 border-blue-500`
      default:
        return `${baseStyles} border-l-4 border-gray-500`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'info':
        return (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className="w-0 flex-1 p-4">
        <div className="flex items-start">
          {getIcon()}
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{toast.title}</p>
            <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-sm bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex">
        <button
          onClick={() => onRemove(toast.id)}
          className="flex items-center justify-center h-full px-3 py-4 text-sm text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  )
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  const addToast = (toast: Omit<ToastNotification, 'id'>): string => {
    const id = Date.now().toString()
    const newToast: ToastNotification = {
      ...toast,
      id,
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export default Toast