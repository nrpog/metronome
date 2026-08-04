/** Ticks per beat. 1 = quarters, 2 = eighths, 3 = triplets, 4 = sixteenths. */
export type Subdivision = 1 | 2 | 3 | 4

export type VoiceId = 'woodblock' | 'beep' | 'click'

/** What a scheduled tick sounds like: bar downbeat, ordinary beat, or an off-beat subdivision. */
export type TickKind = 'accent' | 'beat' | 'sub'

export interface PracticeSettings {
  /** Raise (or lower) the tempo automatically every N bars. */
  rampEnabled: boolean
  rampBpmStep: number
  rampEveryBars: number
  rampTargetBpm: number
  /** Randomly silence whole bars so you have to keep time yourself. */
  muteEnabled: boolean
  mutePercent: number
}

export interface MetronomeSettings {
  bpm: number
  beatsPerBar: number
  subdivision: Subdivision
  voice: VoiceId
  /** 0–1, applied by the engine's master gain. */
  volume: number
  accentEnabled: boolean
  practice: PracticeSettings
}

export interface Preset {
  id: string
  bpm: number
  beatsPerBar: number
  subdivision: Subdivision
}

/** Emitted once per beat (not per subdivision) so the UI can flash in sync with the audio. */
export interface BeatEvent {
  /** AudioContext time the click is scheduled for — the UI waits for this before drawing. */
  time: number
  bar: number
  beatInBar: number
  kind: TickKind
  /** True when practice mode silenced this bar; the dots keep moving anyway. */
  muted: boolean
}
