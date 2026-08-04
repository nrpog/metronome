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
 * True only for the transport (Start/Stop) button — a focused button already fires its own
 * click on Space, and that click already calls toggle(). Every OTHER button (tempo nudges,
 * marking chips, presets, checkboxes) would otherwise swallow Space for its own click once
 * focused, which is exactly the bug this guards against: click a −5 button and Space stops
 * toggling playback and starts nudging tempo instead. Scoping the exemption to just the
 * transport button is what makes Space "always" start/stop, everywhere else.
 */
function isTransportButton(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement && target.classList.contains('transport')
}

/**
 * Global tempo/transport keys. Space always starts/stops regardless of what has focus — the
 * tempo field, a nudge button, a checkbox — there's no control in this app where losing Space
 * to playback toggling costs more than gaining a global shortcut that actually works everywhere.
 * Arrow/page keys stay inert while a field has focus, so typing a tempo or adjusting a slider
 * behaves the way the focused control expects.
 */
export function useKeyboardShortcuts({ onToggle, onNudge }: Handlers): void {
  const handlers = useRef({ onToggle, onNudge })
  handlers.current = { onToggle, onNudge }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const { onToggle: toggle, onNudge: nudge } = handlers.current

      if (event.key === ' ' || event.key === 'Spacebar') {
        if (isTransportButton(event.target)) return
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
