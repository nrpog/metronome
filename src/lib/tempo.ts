import type { PracticeSettings, Subdivision } from './types'

export const MIN_BPM = 20
export const MAX_BPM = 300

export const MIN_BEATS = 1
export const MAX_BEATS = 12

/** Always returns a usable tempo: infinities clamp to the ends, NaN falls back to the slowest. */
export function clampBpm(bpm: number): number {
  if (Number.isNaN(bpm)) return MIN_BPM
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

export function clampBeats(beats: number): number {
  if (Number.isNaN(beats)) return MIN_BEATS
  return Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round(beats)))
}

/**
 * Parse whatever was typed into the big BPM field. Anything unusable falls back to the
 * current tempo rather than throwing the user into an error state.
 */
export function parseBpm(input: string, fallback: number): number {
  const digits = input.replace(/[^\d]/g, '')
  if (digits === '') return clampBpm(fallback)
  return clampBpm(Number(digits))
}

export function secondsPerTick(bpm: number, ticksPerBeat: number): number {
  return 60 / bpm / ticksPerBeat
}

/**
 * Tempo ramp, evaluated at every bar boundary. `barsCompleted` counts bars finished since
 * the transport started. Ramps up or down depending on which side the target is on, and
 * stops exactly on the target instead of overshooting.
 */
export function applyRamp(bpm: number, barsCompleted: number, p: PracticeSettings): number {
  if (!p.rampEnabled) return bpm
  if (barsCompleted <= 0) return bpm
  const every = Math.max(1, Math.round(p.rampEveryBars))
  if (barsCompleted % every !== 0) return bpm

  const target = clampBpm(p.rampTargetBpm)
  const magnitude = Math.abs(Math.round(p.rampBpmStep))
  if (magnitude === 0 || target === bpm) return bpm

  const step = target > bpm ? magnitude : -magnitude
  const next = bpm + step
  return clampBpm(step > 0 ? Math.min(next, target) : Math.max(next, target))
}

export const SUBDIVISIONS: ReadonlyArray<{
  value: Subdivision
  label: string
  glyph: string
}> = [
  { value: 1, label: 'Quarters', glyph: '♩' },
  { value: 2, label: 'Eighths', glyph: '♫' },
  { value: 3, label: 'Triplets', glyph: '♩³' },
  { value: 4, label: 'Sixteenths', glyph: '♬' },
]

export function isSubdivision(value: number): value is Subdivision {
  return value === 1 || value === 2 || value === 3 || value === 4
}
