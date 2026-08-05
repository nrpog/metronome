import type { MetronomeSettings, Preset } from './types'

export const SETTINGS_KEY = 'metronome:settings:v1'
export const PRESETS_KEY = 'metronome:presets:v1'

export const MAX_PRESETS = 6

export const DEFAULT_SETTINGS: MetronomeSettings = {
  bpm: 120,
  beatsPerBar: 4,
  subdivision: 1,
  voice: 'woodblock',
  volume: 0.65,
  accentEnabled: true,
  practice: {
    rampEnabled: false,
    rampBpmStep: 5,
    rampEveryBars: 4,
    rampTargetBpm: 160,
    muteEnabled: false,
    mutePercent: 25,
  },
}

export const DEFAULT_PRESETS: Preset[] = []
