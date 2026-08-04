import type { BeatEvent } from '../lib/types'

interface Props {
  beatsPerBar: number
  accentEnabled: boolean
  playing: boolean
  beat: BeatEvent | null
}

export function BeatIndicator({ beatsPerBar, accentEnabled, playing, beat }: Props) {
  const activeBeat = playing && beat ? beat.beatInBar : -1
  const muted = Boolean(beat?.muted)

  return (
    <div className={`beat-indicator${muted ? ' is-muted' : ''}`}>
      <div className="beat-dots" role="img" aria-label={`Beat ${activeBeat + 1} of ${beatsPerBar}`}>
        {Array.from({ length: beatsPerBar }, (_, index) => {
          const isActive = index === activeBeat
          const classes = [
            'beat-dot',
            index === 0 && accentEnabled ? 'is-accent' : '',
            isActive ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')
          // Remounting the active dot each beat restarts its CSS animation — a plain class
          // toggle would only animate once and then sit still.
          const key = isActive && beat ? `${index}:${beat.bar}` : String(index)
          return <span key={key} className={classes} />
        })}
      </div>
      {muted && <span className="muted-flag">silent bar — keep time</span>}
    </div>
  )
}
