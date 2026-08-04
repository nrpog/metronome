import { VOICES } from '../audio/voices'
import type { VoiceId } from '../lib/types'

interface Props {
  voice: VoiceId
  volume: number
  onSetVoice: (voice: VoiceId) => void
  onSetVolume: (volume: number) => void
}

export function SoundControl({ voice, volume, onSetVoice, onSetVolume }: Props) {
  return (
    <section className="panel">
      <h2 className="panel-title">Sound</h2>
      <div className="chip-row" role="group" aria-label="Click sound">
        {VOICES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip chip-wide${option.id === voice ? ' is-active' : ''}`}
            aria-pressed={option.id === voice}
            title={option.hint}
            onClick={() => onSetVoice(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field-label">
          Volume <span className="field-value">{Math.round(volume * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(volume * 100)}
          onChange={(event) => onSetVolume(Number(event.target.value) / 100)}
        />
      </label>
    </section>
  )
}
