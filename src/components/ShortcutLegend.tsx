const SHORTCUTS: ReadonlyArray<[string, string]> = [
  ['Space', 'Start / stop — works everywhere, even while typing a tempo'],
  ['↑ ↓ or ← →', 'Tempo ±1 BPM'],
  ['Shift + arrows', 'Tempo ±5 BPM'],
  ['Page Up / Down', 'Tempo ±10 BPM'],
  ['Click the number', 'Type an exact tempo, Enter to set'],
  ['Scroll over the number', 'Tempo ±1 (Shift for ±5)'],
  ['Hold −, +, −5, −10, +5, +10', 'Sweep the tempo'],
]

export function ShortcutLegend() {
  return (
    <details className="legend">
      <summary>Keyboard &amp; pointer shortcuts</summary>
      <dl>
        {SHORTCUTS.map(([keys, description]) => (
          <div key={keys} className="legend-row">
            <dt>{keys}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
