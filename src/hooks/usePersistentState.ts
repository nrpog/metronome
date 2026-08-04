import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/**
 * useState backed by localStorage. `revive` validates whatever was stored — see lib/persist.ts.
 * Storage access is wrapped because private-mode and quota errors are real and shouldn't take
 * the app down with them.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  revive: (raw: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return initial
      return revive(JSON.parse(raw))
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage unavailable — settings just won't survive a reload.
    }
  }, [key, value])

  return [value, setValue]
}
