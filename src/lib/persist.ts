import { VOICES } from '../audio/voices'
import { DEFAULT_PRESETS, DEFAULT_SETTINGS, MAX_PRESETS } from './defaults'
import { clampBeats, clampBpm, isSubdivision } from './tempo'
import type { MetronomeSettings, Preset, Subdivision, VoiceId } from './types'

/**
 * Stored settings are just whatever was in localStorage last — possibly written by an older
 * build, hand-edited, or corrupt. Every field is validated and clamped on the way in so a bad
 * value can never wedge the app at, say, 0 BPM.
 */

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function subdivision(value: unknown, fallback: Subdivision): Subdivision {
  const n = num(value, fallback)
  return isSubdivision(n) ? n : fallback
}

function voice(value: unknown, fallback: VoiceId): VoiceId {
  return VOICES.some((v) => v.id === value) ? (value as VoiceId) : fallback
}

export function reviveSettings(raw: unknown): MetronomeSettings {
  const r = record(raw)
  const p = record(r.practice)
  const d = DEFAULT_SETTINGS

  return {
    bpm: clampBpm(num(r.bpm, d.bpm)),
    beatsPerBar: clampBeats(num(r.beatsPerBar, d.beatsPerBar)),
    subdivision: subdivision(r.subdivision, d.subdivision),
    voice: voice(r.voice, d.voice),
    volume: Math.min(1, Math.max(0, num(r.volume, d.volume))),
    accentEnabled: bool(r.accentEnabled, d.accentEnabled),
    practice: {
      rampEnabled: bool(p.rampEnabled, d.practice.rampEnabled),
      rampBpmStep: Math.min(50, Math.max(1, Math.round(num(p.rampBpmStep, d.practice.rampBpmStep)))),
      rampEveryBars: Math.min(64, Math.max(1, Math.round(num(p.rampEveryBars, d.practice.rampEveryBars)))),
      rampTargetBpm: clampBpm(num(p.rampTargetBpm, d.practice.rampTargetBpm)),
      muteEnabled: bool(p.muteEnabled, d.practice.muteEnabled),
      mutePercent: Math.min(100, Math.max(0, Math.round(num(p.mutePercent, d.practice.mutePercent)))),
    },
  }
}

export function revivePresets(raw: unknown): Preset[] {
  if (!Array.isArray(raw)) return DEFAULT_PRESETS
  return raw
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .slice(0, MAX_PRESETS)
    .map((entry, index) => ({
      id: typeof entry.id === 'string' ? entry.id : `preset-${index}`,
      bpm: clampBpm(num(entry.bpm, DEFAULT_SETTINGS.bpm)),
      beatsPerBar: clampBeats(num(entry.beatsPerBar, DEFAULT_SETTINGS.beatsPerBar)),
      subdivision: subdivision(entry.subdivision, DEFAULT_SETTINGS.subdivision),
    }))
}
