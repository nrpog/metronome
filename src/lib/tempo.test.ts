import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './defaults'
import { reviveSettings } from './persist'
import { MAX_BPM, MIN_BPM, applyRamp, clampBeats, clampBpm, parseBpm, secondsPerTick } from './tempo'
import { TEMPO_MARKINGS, markingFor } from './tempoMarkings'
import type { PracticeSettings } from './types'

const practice = (overrides: Partial<PracticeSettings> = {}): PracticeSettings => ({
  ...DEFAULT_SETTINGS.practice,
  rampEnabled: true,
  rampBpmStep: 5,
  rampEveryBars: 4,
  rampTargetBpm: 160,
  ...overrides,
})

describe('clampBpm', () => {
  it('holds the range', () => {
    expect(clampBpm(0)).toBe(MIN_BPM)
    expect(clampBpm(19)).toBe(MIN_BPM)
    expect(clampBpm(20)).toBe(20)
    expect(clampBpm(300)).toBe(300)
    expect(clampBpm(9999)).toBe(MAX_BPM)
  })

  it('rounds and survives garbage', () => {
    expect(clampBpm(120.4)).toBe(120)
    expect(clampBpm(120.6)).toBe(121)
    expect(clampBpm(Number.NaN)).toBe(MIN_BPM)
    expect(clampBpm(Infinity)).toBe(MAX_BPM)
  })
})

describe('clampBeats', () => {
  it('holds the range', () => {
    expect(clampBeats(0)).toBe(1)
    expect(clampBeats(4)).toBe(4)
    expect(clampBeats(99)).toBe(12)
  })
})

describe('parseBpm', () => {
  it('accepts what people actually type', () => {
    expect(parseBpm('137', 120)).toBe(137)
    expect(parseBpm('  90 ', 120)).toBe(90)
    expect(parseBpm('120 bpm', 120)).toBe(120)
  })

  it('falls back instead of erroring on empty or junk input', () => {
    expect(parseBpm('', 120)).toBe(120)
    expect(parseBpm('abc', 137)).toBe(137)
  })

  it('clamps out-of-range entries', () => {
    expect(parseBpm('999', 120)).toBe(MAX_BPM)
    expect(parseBpm('5', 120)).toBe(MIN_BPM)
  })
})

describe('secondsPerTick', () => {
  it('matches the tempo', () => {
    expect(secondsPerTick(120, 1)).toBeCloseTo(0.5, 10)
    expect(secondsPerTick(120, 2)).toBeCloseTo(0.25, 10)
    expect(secondsPerTick(120, 3)).toBeCloseTo(1 / 6, 10)
    expect(secondsPerTick(60, 4)).toBeCloseTo(0.25, 10)
  })
})

describe('applyRamp', () => {
  it('only fires on the configured bar boundary', () => {
    const p = practice()
    expect(applyRamp(120, 0, p)).toBe(120)
    expect(applyRamp(120, 1, p)).toBe(120)
    expect(applyRamp(120, 3, p)).toBe(120)
    expect(applyRamp(120, 4, p)).toBe(125)
    expect(applyRamp(125, 8, p)).toBe(130)
  })

  it('stops exactly on the target instead of overshooting', () => {
    const p = practice({ rampTargetBpm: 128 })
    expect(applyRamp(125, 4, p)).toBe(128)
    expect(applyRamp(128, 8, p)).toBe(128)
  })

  it('ramps downward when the target is below the current tempo', () => {
    const p = practice({ rampTargetBpm: 100 })
    expect(applyRamp(120, 4, p)).toBe(115)
    expect(applyRamp(102, 8, p)).toBe(100)
    expect(applyRamp(100, 12, p)).toBe(100)
  })

  it('is inert when disabled or when the step is zero', () => {
    expect(applyRamp(120, 4, practice({ rampEnabled: false }))).toBe(120)
    expect(applyRamp(120, 4, practice({ rampBpmStep: 0 }))).toBe(120)
  })

  it('treats a nonsensical bar interval as every bar', () => {
    expect(applyRamp(120, 3, practice({ rampEveryBars: 0 }))).toBe(125)
  })
})

describe('markingFor', () => {
  it('covers the whole tempo range with no gaps', () => {
    for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm++) {
      expect(markingFor(bpm)).toBeDefined()
    }
    for (let i = 1; i < TEMPO_MARKINGS.length; i++) {
      expect(TEMPO_MARKINGS[i].min).toBe(TEMPO_MARKINGS[i - 1].max + 1)
    }
  })

  it('picks the right name at range boundaries', () => {
    expect(markingFor(39).name).toBe('Grave')
    expect(markingFor(40).name).toBe('Largo')
    expect(markingFor(119).name).toBe('Moderato')
    expect(markingFor(120).name).toBe('Allegro')
    expect(markingFor(MAX_BPM).name).toBe('Prestissimo')
  })

  it('lands inside its own range when a chip is clicked', () => {
    for (const marking of TEMPO_MARKINGS) {
      expect(marking.bpm).toBeGreaterThanOrEqual(marking.min)
      expect(marking.bpm).toBeLessThanOrEqual(marking.max)
      expect(markingFor(marking.bpm).name).toBe(marking.name)
    }
  })
})

describe('reviveSettings', () => {
  it('returns defaults for anything unusable', () => {
    expect(reviveSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(reviveSettings('nope')).toEqual(DEFAULT_SETTINGS)
    expect(reviveSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid stored values', () => {
    const revived = reviveSettings({ bpm: 96, beatsPerBar: 3, subdivision: 3, voice: 'click', volume: 0.5 })
    expect(revived.bpm).toBe(96)
    expect(revived.beatsPerBar).toBe(3)
    expect(revived.subdivision).toBe(3)
    expect(revived.voice).toBe('click')
    expect(revived.volume).toBe(0.5)
  })

  it('repairs out-of-range or unknown values rather than trusting them', () => {
    const revived = reviveSettings({
      bpm: 5000,
      beatsPerBar: -2,
      subdivision: 7,
      voice: 'kazoo',
      volume: 42,
      practice: { rampEveryBars: 0, mutePercent: 900 },
    })
    expect(revived.bpm).toBe(MAX_BPM)
    expect(revived.beatsPerBar).toBe(1)
    expect(revived.subdivision).toBe(DEFAULT_SETTINGS.subdivision)
    expect(revived.voice).toBe(DEFAULT_SETTINGS.voice)
    expect(revived.volume).toBe(1)
    expect(revived.practice.rampEveryBars).toBe(1)
    expect(revived.practice.mutePercent).toBe(100)
  })
})
