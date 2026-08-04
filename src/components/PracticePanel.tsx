import { MAX_BPM, MIN_BPM } from '../lib/tempo'
import type { PracticeSettings } from '../lib/types'

interface Props {
  practice: PracticeSettings
  barNumber: number
  playing: boolean
  onSetPractice: (changes: Partial<PracticeSettings>) => void
  onResetBarCount: () => void
}

export function PracticePanel({
  practice,
  barNumber,
  playing,
  onSetPractice,
  onResetBarCount,
}: Props) {
  return (
    <section className="panel panel-practice">
      <h2 className="panel-title">Practice</h2>

      <div className="bar-counter">
        <span className={`bar-count${playing ? '' : ' is-idle'}`} aria-live="off">
          {playing ? barNumber : '–'}
        </span>
        <span className="bar-count-label">bars</span>
        <button type="button" className="chip chip-ghost" onClick={onResetBarCount}>
          Reset
        </button>
      </div>

      <div className="practice-block">
        <label className="switch">
          <input
            type="checkbox"
            checked={practice.rampEnabled}
            onChange={(event) => onSetPractice({ rampEnabled: event.target.checked })}
          />
          <span>Tempo ramp</span>
        </label>
        <div className={`practice-fields${practice.rampEnabled ? '' : ' is-disabled'}`}>
          <label className="field field-inline">
            <span className="field-label">Step</span>
            <input
              type="number"
              min={1}
              max={50}
              value={practice.rampBpmStep}
              disabled={!practice.rampEnabled}
              onChange={(event) =>
                onSetPractice({
                  rampBpmStep: Math.min(50, Math.max(1, Math.round(Number(event.target.value) || 1))),
                })
              }
            />
            <span className="field-suffix">BPM</span>
          </label>
          <label className="field field-inline">
            <span className="field-label">Every</span>
            <input
              type="number"
              min={1}
              max={64}
              value={practice.rampEveryBars}
              disabled={!practice.rampEnabled}
              onChange={(event) =>
                onSetPractice({
                  rampEveryBars: Math.min(64, Math.max(1, Math.round(Number(event.target.value) || 1))),
                })
              }
            />
            <span className="field-suffix">bars</span>
          </label>
          <label className="field field-inline">
            <span className="field-label">Up to</span>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={practice.rampTargetBpm}
              disabled={!practice.rampEnabled}
              onChange={(event) =>
                onSetPractice({
                  rampTargetBpm: Math.min(
                    MAX_BPM,
                    Math.max(MIN_BPM, Math.round(Number(event.target.value) || MIN_BPM)),
                  ),
                })
              }
            />
            <span className="field-suffix">BPM</span>
          </label>
        </div>
      </div>

      <div className="practice-block">
        <label className="switch">
          <input
            type="checkbox"
            checked={practice.muteEnabled}
            onChange={(event) => onSetPractice({ muteEnabled: event.target.checked })}
          />
          <span>Random silent bars</span>
        </label>
        <label className={`field${practice.muteEnabled ? '' : ' is-disabled'}`}>
          <span className="field-label">
            Chance per bar <span className="field-value">{practice.mutePercent}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={practice.mutePercent}
            disabled={!practice.muteEnabled}
            onChange={(event) => onSetPractice({ mutePercent: Number(event.target.value) })}
          />
        </label>
      </div>
    </section>
  )
}
