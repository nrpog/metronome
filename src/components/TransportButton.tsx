interface Props {
  playing: boolean
  onToggle: () => void
}

export function TransportButton({ playing, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`transport${playing ? ' is-playing' : ''}`}
      onClick={onToggle}
      aria-pressed={playing}
    >
      <span className="transport-icon" aria-hidden="true">
        {playing ? '■' : '▶'}
      </span>
      <span className="transport-label">{playing ? 'Stop' : 'Start'}</span>
      <span className="transport-hint">Space</span>
    </button>
  )
}
