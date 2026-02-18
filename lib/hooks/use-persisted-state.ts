'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * React state hook that persists the value in localStorage.
 * SSR-safe: starts with defaultValue and hydrates from storage in useEffect.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue)

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setState(JSON.parse(stored) as T)
      }
    } catch {
      // Storage unavailable or parse error -- use default
    }
  }, [key])

  // Setter that also writes to localStorage
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function'
          ? (value as (prev: T) => T)(prev)
          : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Storage quota exceeded -- value still set in memory
        }
        return next
      })
    },
    [key]
  )

  return [state, setPersistedState]
}
