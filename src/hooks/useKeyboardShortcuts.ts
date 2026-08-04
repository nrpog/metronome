import { useEffect, useRef } from 'react'

interface Handlers {
  onToggle: () => void
  onNudge: (delta: number) => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * True for controls where Space already does something meaningful natively — a focused button
 * fires its click, a checkbox/radio toggles. Overriding Space there would fight the browser
 * (or double-fire) so those are left alone. Text and number fields have no native use for
 * Space, which is what lets the transport shortcut reach through them below.
 */
function hasNativeSpaceBehavior(target: EventTarget | null): boolean {
  if (target instanceof HTMLButtonElement) return true
  if (target instanceof HTMLInputElement) {
    return target.type === 'checkbox' || target.type === 'radio'
  }
  return false
}

/**
 * Global tempo/transport keys. Space always starts/stops, even while the tempo field or a
 * practice-panel number input has focus — there's no legitimate use for a space character in
 * either, so swallowing it there would just be a trap. Arrow/page keys stay inert while a field
 * has focus, so typing a tempo or adjusting a slider behaves the way the focused control expects.
 */
export function useKeyboardShortcuts({ onToggle, onNudge }: Handlers): void {
  const handlers = useRef({ onToggle, onNudge })
  handlers.current = { onToggle, onNudge }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const { onToggle: toggle, onNudge: nudge } = handlers.current

      if (event.key === ' ' || event.key === 'Spacebar') {
        if (hasNativeSpaceBehavior(event.target)) return
        event.preventDefault()
        toggle()
        return
      }

      if (isTypingTarget(event.target)) return

      const fine = event.shiftKey ? 5 : 1

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          nudge(fine)
          return
        case 'ArrowDown':
          event.preventDefault()
          nudge(-fine)
          return
        case 'ArrowRight':
          event.preventDefault()
          nudge(fine)
          return
        case 'ArrowLeft':
          event.preventDefault()
          nudge(-fine)
          return
        case 'PageUp':
          event.preventDefault()
          nudge(10)
          return
        case 'PageDown':
          event.preventDefault()
          nudge(-10)
          return
        default:
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
