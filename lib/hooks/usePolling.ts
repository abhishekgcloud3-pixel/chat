/**
 * Base polling utilities for real-time data updates
 * Optimized for minimal resource usage and client-side deduplication
 */

import { useEffect, useRef, useCallback, useState } from 'react'

interface PollingOptions {
  interval?: number // Polling interval in milliseconds
  enabled?: boolean // Enable/disable polling
  onError?: (error: Error) => void // Error handler
}

interface PollingState {
  isPolling: boolean
  error: Error | null
  lastUpdate: number | null
}

/**
 * Custom hook for managing polling with deduplication and cleanup
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: PollingOptions = {}
) {
  const {
    interval = 2000,
    enabled = true,
    onError
  } = options

  const fetchFnRef = useRef(fetchFn)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<T | null>(null)
  const dataVersionRef = useRef<number>(0)

  const [state, setState] = useState<PollingState>({
    isPolling: false,
    error: null,
    lastUpdate: null
  })

  const [data, setData] = useState<T | null>(null)

  // Update fetch function reference
  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Polling function with error handling and deduplication
  const poll = useCallback(async () => {
    if (!enabled) return

    try {
      setState(prev => ({ ...prev, isPolling: true, error: null }))
      
      const newData = await fetchFnRef.current()
      
      // Simple deduplication check
      if (JSON.stringify(newData) !== JSON.stringify(lastDataRef.current)) {
        setData(newData)
        lastDataRef.current = newData
        dataVersionRef.current += 1
        setState(prev => ({ 
          ...prev, 
          isPolling: false, 
          error: null, 
          lastUpdate: Date.now() 
        }))
      } else {
        setState(prev => ({ ...prev, isPolling: false, error: null }))
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Polling failed')
      setState(prev => ({ ...prev, isPolling: false, error: err }))
      onError?.(err)
    }
  }, [enabled, onError])

  // Start polling
  useEffect(() => {
    if (!enabled) {
      cleanup()
      return
    }

    // Initial poll
    poll()

    // Set up interval
    intervalRef.current = setInterval(poll, interval)

    // Cleanup on unmount or dependency change
    return cleanup
  }, [poll, interval, enabled, cleanup])

  // Force refresh function
  const refresh = useCallback(() => {
    if (!enabled) return
    poll()
  }, [poll, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    data,
    error: state.error,
    isPolling: state.isPolling,
    lastUpdate: state.lastUpdate,
    refresh,
    dataVersion: dataVersionRef.current
  }
}

/**
 * Hook for managing network status and online state
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsReconnecting(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleBeforeUnload = () => {
      setIsReconnecting(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Check initial state
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return {
    isOnline,
    isReconnecting,
    canConnect: isOnline || !isReconnecting
  }
}

/**
 * Local state hook for optimistic updates
 */
export function useLocalState<T>(initialValue: T) {
  const [state, setState] = useState(initialValue)
  const versionRef = useRef(0)

  const updateState = useCallback((updater: ((prev: T) => T) | T) => {
    setState(updater)
    versionRef.current += 1
  }, [])

  const getVersion = useCallback(() => versionRef.current, [])

  return {
    state,
    setState: updateState,
    version: versionRef.current,
    getVersion
  }
}