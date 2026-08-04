import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MetronomeEngine } from '../audio/MetronomeEngine'
import { DEFAULT_PRESETS, DEFAULT_SETTINGS, MAX_PRESETS, PRESETS_KEY, SETTINGS_KEY } from '../lib/defaults'
import { revivePresets, reviveSettings } from '../lib/persist'
import { clampBeats, clampBpm } from '../lib/tempo'
import type { BeatEvent, MetronomeSettings, PracticeSettings, Preset, Subdivision, VoiceId } from '../lib/types'
import { usePersistentState } from './usePersistentState'

let presetCounter = 0

/**
 * Wires the audio engine to React.
 *
 * Direction of data flow matters here: user edits go React → engine (via updateSettings), while
 * the practice tempo ramp goes engine → React (via onTempoChange). Both write the same field, so
 * the setters below no-op when the value is unchanged and the two can't chase each other.
 */
export function useMetronome() {
  const [settings, setSettings] = usePersistentState<MetronomeSettings>(
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    reviveSettings,
  )
  const [presets, setPresets] = usePersistentState<Preset[]>(PRESETS_KEY, DEFAULT_PRESETS, revivePresets)
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState<BeatEvent | null>(null)
  const [barOffset, setBarOffset] = useState(0)

  // Built once and kept for the life of the hook. The AudioContext inside is created lazily on
  // the first start(), which is also the first user gesture — exactly when browsers allow it.
  const engineRef = useRef<MetronomeEngine | null>(null)
  if (engineRef.current === null) engineRef.current = new MetronomeEngine(settings)
  const engine = engineRef.current

  useEffect(() => {
    engine.updateSettings(settings)
  }, [engine, settings])

  useEffect(() => {
    engine.onPlayingChange = setPlaying
    engine.onTempoChange = (bpm) => setSettings((s) => (s.bpm === bpm ? s : { ...s, bpm }))
    return () => {
      engine.onPlayingChange = null
      engine.onTempoChange = null
    }
  }, [engine, setSettings])

  useEffect(() => () => engine.stop(), [engine])

  // Visual sync: poll the engine's beat queue on every frame and only draw a beat once the
  // audio clock has actually reached it.
  useEffect(() => {
    if (!playing) {
      setBeat(null)
      return
    }
    let frame = requestAnimationFrame(function loop() {
      const due = engine.drainDue()
      if (due) setBeat(due)
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [engine, playing])

  const patch = useCallback(
    (changes: Partial<MetronomeSettings>) => setSettings((s) => ({ ...s, ...changes })),
    [setSettings],
  )

  const setBpm = useCallback(
    (bpm: number) => setSettings((s) => ({ ...s, bpm: clampBpm(bpm) })),
    [setSettings],
  )

  const nudgeBpm = useCallback(
    (delta: number) => setSettings((s) => ({ ...s, bpm: clampBpm(s.bpm + delta) })),
    [setSettings],
  )

  const scaleBpm = useCallback(
    (factor: number) => setSettings((s) => ({ ...s, bpm: clampBpm(s.bpm * factor) })),
    [setSettings],
  )

  const setPractice = useCallback(
    (changes: Partial<PracticeSettings>) =>
      setSettings((s) => ({ ...s, practice: { ...s.practice, ...changes } })),
    [setSettings],
  )

  const toggle = useCallback(() => {
    engine.toggle()
    setBarOffset(0)
  }, [engine])

  const savePreset = useCallback(() => {
    setPresets((list) => {
      const next: Preset = {
        id: `preset-${++presetCounter}-${list.length}`,
        bpm: settings.bpm,
        beatsPerBar: settings.beatsPerBar,
        subdivision: settings.subdivision,
      }
      const duplicate = list.some(
        (p) =>
          p.bpm === next.bpm &&
          p.beatsPerBar === next.beatsPerBar &&
          p.subdivision === next.subdivision,
      )
      if (duplicate) return list
      return [...list, next].slice(-MAX_PRESETS)
    })
  }, [setPresets, settings.beatsPerBar, settings.bpm, settings.subdivision])

  const applyPreset = useCallback(
    (preset: Preset) =>
      patch({
        bpm: preset.bpm,
        beatsPerBar: preset.beatsPerBar,
        subdivision: preset.subdivision,
      }),
    [patch],
  )

  const deletePreset = useCallback(
    (id: string) => setPresets((list) => list.filter((p) => p.id !== id)),
    [setPresets],
  )

  const barNumber = beat ? Math.max(1, beat.bar + 1 - barOffset) : 0
  const resetBarCount = useCallback(() => setBarOffset(beat ? beat.bar : 0), [beat])

  return useMemo(
    () => ({
      settings,
      presets,
      playing,
      beat,
      barNumber,
      toggle,
      setBpm,
      nudgeBpm,
      scaleBpm,
      setBeatsPerBar: (beats: number) => patch({ beatsPerBar: clampBeats(beats) }),
      setSubdivision: (subdivision: Subdivision) => patch({ subdivision }),
      setVoice: (voice: VoiceId) => patch({ voice }),
      setVolume: (volume: number) => patch({ volume: Math.min(1, Math.max(0, volume)) }),
      setAccentEnabled: (accentEnabled: boolean) => patch({ accentEnabled }),
      setPractice,
      savePreset,
      applyPreset,
      deletePreset,
      resetBarCount,
    }),
    [
      applyPreset,
      barNumber,
      beat,
      deletePreset,
      nudgeBpm,
      patch,
      playing,
      presets,
      resetBarCount,
      savePreset,
      scaleBpm,
      setBpm,
      setPractice,
      settings,
      toggle,
    ],
  )
}

export type MetronomeApi = ReturnType<typeof useMetronome>
