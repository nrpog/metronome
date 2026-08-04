interface Props {
  beatsPerBar: number
  accentEnabled: boolean
  onSetBeatsPerBar: (beats: number) => void
  onSetAccentEnabled: (enabled: boolean) => void
}

const COMMON_BEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]

export function TimeSignatureControl({
  beatsPerBar,
  accentEnabled,
  onSetBeatsPerBar,
  onSetAccentEnabled,
}: Props) {
  return (
    <section className="panel">
      <h2 className="panel-title">Beats per bar</h2>
      <div className="chip-row" role="group" aria-label="Beats per bar">
        {COMMON_BEATS.map((beats) => (
          <button
            key={beats}
            type="button"
            className={`chip chip-num${beats === beatsPerBar ? ' is-active' : ''}`}
            aria-pressed={beats === beatsPerBar}
            onClick={() => onSetBeatsPerBar(beats)}
          >
            {beats}
          </button>
        ))}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={accentEnabled}
          onChange={(event) => onSetAccentEnabled(event.target.checked)}
        />
        <span>Accent the downbeat</span>
      </label>
    </section>
  )
}
