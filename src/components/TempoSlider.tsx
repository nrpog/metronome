import { MAX_BPM, MIN_BPM } from '../lib/tempo'

interface Props {
  bpm: number
  onSetBpm: (bpm: number) => void
}

/** Coarse sweep across the whole range — for hunting, not for landing on an exact number. */
export function TempoSlider({ bpm, onSetBpm }: Props) {
  return (
    <div className="tempo-slider">
      <span className="range-end">{MIN_BPM}</span>
      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        aria-label="Tempo slider"
        onChange={(event) => onSetBpm(Number(event.target.value))}
      />
      <span className="range-end">{MAX_BPM}</span>
    </div>
  )
}
