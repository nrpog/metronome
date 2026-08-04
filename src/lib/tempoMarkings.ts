import { MAX_BPM, MIN_BPM } from './tempo'

export interface TempoMarking {
  name: string
  /** Inclusive BPM range. Ranges are contiguous and cover MIN_BPM..MAX_BPM. */
  min: number
  max: number
  /** Where the one-click chip jumps to — a representative tempo inside the range. */
  bpm: number
}

export const TEMPO_MARKINGS: ReadonlyArray<TempoMarking> = [
  { name: 'Grave', min: MIN_BPM, max: 39, bpm: 32 },
  { name: 'Largo', min: 40, max: 59, bpm: 50 },
  { name: 'Larghetto', min: 60, max: 65, bpm: 63 },
  { name: 'Adagio', min: 66, max: 75, bpm: 70 },
  { name: 'Andante', min: 76, max: 107, bpm: 92 },
  { name: 'Moderato', min: 108, max: 119, bpm: 114 },
  { name: 'Allegro', min: 120, max: 167, bpm: 140 },
  { name: 'Presto', min: 168, max: 199, bpm: 184 },
  { name: 'Prestissimo', min: 200, max: MAX_BPM, bpm: 220 },
]

export function markingFor(bpm: number): TempoMarking {
  for (const marking of TEMPO_MARKINGS) {
    if (bpm <= marking.max) return marking
  }
  return TEMPO_MARKINGS[TEMPO_MARKINGS.length - 1]
}
