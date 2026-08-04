import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useHoldRepeat } from '../hooks/useHoldRepeat'
import { MAX_BPM, MIN_BPM, clampBpm, parseBpm } from '../lib/tempo'
import { markingFor } from '../lib/tempoMarkings'

interface Props {
  bpm: number
  onSetBpm: (bpm: number) => void
  onNudge: (delta: number) => void
}

/**
 * The centrepiece, and the reason this app exists: the tempo itself is the control. Click the
 * number and type 137. Or wheel it, or hold the ± buttons. No dragging a dial and hoping.
 */
export function TempoDisplay({ bpm, onSetBpm, onNudge }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const nudgeRef = useRef(onNudge)
  nudgeRef.current = onNudge

  const down = useHoldRepeat(() => nudgeRef.current(-1))
  const up = useHoldRepeat(() => nudgeRef.current(1))
  const down5 = useHoldRepeat(() => nudgeRef.current(-5))
  const down10 = useHoldRepeat(() => nudgeRef.current(-10))
  const up5 = useHoldRepeat(() => nudgeRef.current(5))
  const up10 = useHoldRepeat(() => nudgeRef.current(10))

  const editing = draft !== null
  const shown = editing ? draft : String(bpm)
  const marking = markingFor(bpm)

  // React registers wheel listeners passively at the root, so preventDefault there is ignored
  // and the page scrolls instead. Attaching it here non-passively is the only way to own it.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      event.preventDefault()
      const step = event.shiftKey ? 5 : 1
      nudgeRef.current(event.deltaY < 0 ? step : -step)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const commit = (text: string) => {
    onSetBpm(parseBpm(text, bpm))
    setDraft(null)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(shown)
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(null)
      event.currentTarget.blur()
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const step = (event.shiftKey ? 5 : 1) * (event.key === 'ArrowUp' ? 1 : -1)
      const next = clampBpm(parseBpm(shown, bpm) + step)
      onSetBpm(next)
      setDraft(String(next))
    }
  }

  return (
    <>
      <div className="tempo-display" ref={wrapRef}>
        <button
          type="button"
          className="nudge"
          aria-label="Decrease tempo by 1 BPM"
          disabled={bpm <= MIN_BPM}
          {...down}
        >
          −
        </button>

        <div className="tempo-value">
          <input
            className="bpm-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={shown}
            aria-label="Tempo in beats per minute"
            onFocus={(event) => {
              setDraft(String(bpm))
              event.currentTarget.select()
            }}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
            onKeyDown={onKeyDown}
            onBlur={() => editing && commit(shown)}
          />
          <div className="tempo-meta">
            <span className="tempo-unit">BPM</span>
            <span className="tempo-marking" aria-live="polite">
              {marking.name}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="nudge"
          aria-label="Increase tempo by 1 BPM"
          disabled={bpm >= MAX_BPM}
          {...up}
        >
          +
        </button>
      </div>

      <div className="quick-steps">
        <div className="step-group" role="group" aria-label="Decrease tempo">
          <button
            type="button"
            className="step-btn"
            aria-label="Decrease tempo by 10 BPM"
            disabled={bpm <= MIN_BPM}
            {...down10}
          >
            −10
          </button>
          <button
            type="button"
            className="step-btn"
            aria-label="Decrease tempo by 5 BPM"
            disabled={bpm <= MIN_BPM}
            {...down5}
          >
            −5
          </button>
        </div>
        <div className="step-group" role="group" aria-label="Increase tempo">
          <button
            type="button"
            className="step-btn"
            aria-label="Increase tempo by 5 BPM"
            disabled={bpm >= MAX_BPM}
            {...up5}
          >
            +5
          </button>
          <button
            type="button"
            className="step-btn"
            aria-label="Increase tempo by 10 BPM"
            disabled={bpm >= MAX_BPM}
            {...up10}
          >
            +10
          </button>
        </div>
      </div>
    </>
  )
}
