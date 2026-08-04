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
 * Global tempo/transport keys. Deliberately inert while a field or slider has focus, so typing
 * a tempo or dragging with arrow keys behaves the way the focused control expects.
 */
export function useKeyboardShortcuts({ onToggle, onNudge }: Handlers): void {
  const handlers = useRef({ onToggle, onNudge })
  handlers.current = { onToggle, onNudge }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const { onToggle: toggle, onNudge: nudge } = handlers.current
      const fine = event.shiftKey ? 5 : 1

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          // A focused button would also receive this as a click — let it, or the two cancel out.
          if (event.target instanceof HTMLButtonElement) return
          event.preventDefault()
          toggle()
          return
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
