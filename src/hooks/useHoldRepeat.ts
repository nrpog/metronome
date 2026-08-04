import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Press-and-hold auto-repeat for the ± tempo buttons: one step on press, then a steady stream
 * once you keep holding, so ±30 BPM doesn't mean thirty clicks.
 *
 * The action fires on pointerdown (immediate feedback) — `onClick` is kept only so keyboard
 * activation still works, and skips the repeat if a pointer already handled it.
 */
export function useHoldRepeat(action: () => void, delayMs = 400, intervalMs = 60) {
  const actionRef = useRef(action)
  actionRef.current = action

  const timers = useRef<{ start?: number; repeat?: number }>({})
  const handledByPointer = useRef(false)

  const stop = useCallback(() => {
    if (timers.current.start !== undefined) window.clearTimeout(timers.current.start)
    if (timers.current.repeat !== undefined) window.clearInterval(timers.current.repeat)
    timers.current = {}
  }, [])

  useEffect(() => stop, [stop])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      handledByPointer.current = true
      stop()
      actionRef.current()
      timers.current.start = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(() => actionRef.current(), intervalMs)
      }, delayMs)
    },
    [delayMs, intervalMs, stop],
  )

  const onClick = useCallback(() => {
    if (handledByPointer.current) {
      handledByPointer.current = false
      return
    }
    actionRef.current()
  }, [])

  return {
    onPointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick,
  }
}
