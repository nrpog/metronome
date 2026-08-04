import { SUBDIVISIONS } from '../lib/tempo'
import type { Subdivision } from '../lib/types'

interface Props {
  subdivision: Subdivision
  onSetSubdivision: (subdivision: Subdivision) => void
}

export function SubdivisionControl({ subdivision, onSetSubdivision }: Props) {
  return (
    <section className="panel">
      <h2 className="panel-title">Subdivision</h2>
      <div className="chip-row" role="group" aria-label="Subdivision">
        {SUBDIVISIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip chip-wide${option.value === subdivision ? ' is-active' : ''}`}
            aria-pressed={option.value === subdivision}
            onClick={() => onSetSubdivision(option.value)}
          >
            <span className="chip-glyph" aria-hidden="true">
              {option.glyph}
            </span>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
