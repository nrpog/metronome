import { MAX_PRESETS } from '../lib/defaults'
import { SUBDIVISIONS } from '../lib/tempo'
import { TEMPO_MARKINGS, markingFor } from '../lib/tempoMarkings'
import type { Preset } from '../lib/types'

interface Props {
  bpm: number
  presets: Preset[]
  onSetBpm: (bpm: number) => void
  onScaleBpm: (factor: number) => void
  onSavePreset: () => void
  onApplyPreset: (preset: Preset) => void
  onDeletePreset: (id: string) => void
}

function subdivisionGlyph(value: number): string {
  return SUBDIVISIONS.find((s) => s.value === value)?.glyph ?? '♩'
}

export function TempoPresets({
  bpm,
  presets,
  onSetBpm,
  onScaleBpm,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}: Props) {
  const active = markingFor(bpm)

  return (
    <div className="presets">
      <div className="chip-row" role="group" aria-label="Tempo markings">
        {TEMPO_MARKINGS.map((marking) => (
          <button
            key={marking.name}
            type="button"
            className={`chip${marking.name === active.name ? ' is-active' : ''}`}
            aria-pressed={marking.name === active.name}
            title={`${marking.name} · ${marking.min}–${marking.max} BPM`}
            onClick={() => onSetBpm(marking.bpm)}
          >
            {marking.name}
          </button>
        ))}
      </div>

      <div className="chip-row">
        <button type="button" className="chip chip-ghost" onClick={() => onScaleBpm(0.5)}>
          ½× half-time
        </button>
        <button type="button" className="chip chip-ghost" onClick={() => onScaleBpm(2)}>
          2× double-time
        </button>
        <button
          type="button"
          className="chip chip-ghost"
          onClick={onSavePreset}
          disabled={presets.length >= MAX_PRESETS}
          title={
            presets.length >= MAX_PRESETS
              ? `All ${MAX_PRESETS} preset slots are full`
              : 'Save the current tempo, bar length and subdivision'
          }
        >
          ★ Save preset
        </button>
      </div>

      {presets.length > 0 && (
        <div className="chip-row" role="group" aria-label="Saved presets">
          {presets.map((preset) => (
            <span key={preset.id} className="preset">
              <button
                type="button"
                className="chip preset-apply"
                onClick={() => onApplyPreset(preset)}
              >
                {preset.bpm} <span className="preset-meta">
                  {preset.beatsPerBar}/4 {subdivisionGlyph(preset.subdivision)}
                </span>
              </button>
              <button
                type="button"
                className="preset-delete"
                aria-label={`Delete preset ${preset.bpm} BPM`}
                onClick={() => onDeletePreset(preset.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
