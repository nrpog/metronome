# Metronome

A browser metronome built around one idea: **the tempo should be the easiest thing to change.**
Most online metronomes make you drag a dial or an arc and hope you land on 132. Here the BPM
number *is* the control — click it and type, wheel it, hold ±, sweep the slider, or hit a tempo
marking.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the production build
npm test           # unit tests (vitest)
npm run lint       # oxlint
```

No backend, no dependencies beyond React — `dist/` is a static folder you can drop on GitHub
Pages, Netlify, or any static host.

## Deploying

The site is served from **`/metronome/`**, not the domain root. Two settings in
`vite.config.ts` encode that and must always agree:

- `base` — the URL prefix written into `index.html`, so assets resolve at `/metronome/assets/…`
- `build.outDir` — `dist/metronome`, so the deploy (which uploads the contents of `dist/` to the
  document root) puts the app in a folder of that name

To serve from a different path, change `BASE_PATH` in `vite.config.ts`; to serve from the domain
root, set `base: '/'` and `outDir: 'dist'`. Getting only one of the two right gives you either a
404 page or a blank page whose assets 404.

`npm run dev` and `npm run preview` follow `base` too — they serve at
`http://localhost:5173/metronome/`, and redirect there from `/`.

CI is IONOS Deploy Now: `.github/workflows/metronome-orchestration.yaml` runs on every push and
calls `metronome-build.yaml`, whose `DEPLOYMENT_FOLDER: dist` is the folder that gets uploaded.
IONOS may regenerate those files if the project is reconfigured in their UI — if a deploy suddenly
serves 403, check that `DEPLOYMENT_FOLDER` hasn't reverted to its `public` default.

## Features

**Tempo, 20–300 BPM, six ways**

| Control | What it does |
| --- | --- |
| The big number | Click and type an exact tempo. Enter commits, Esc reverts. |
| Scroll over the number | ±1 BPM per notch, ±5 with Shift |
| − / + buttons | ±1 per press; hold to sweep |
| Slider | Coarse drag across the full range |
| Tempo markings | Grave → Prestissimo, one click each; the current one highlights |
| ½× / 2× | Half-time and double-time |

Every one of them works **while the metronome is playing** — the tempo changes on the next tick
without restarting the bar.

**Everything else**

- Beats per bar (1–12) with an accented downbeat and a beat-dot row that flashes in time
- Subdivisions: quarters, eighths, triplets, sixteenths, mixed under the pulse at lower volume
- Three synthesized click voices (wood block, digital beep, studio click) plus volume
- Practice tools: bar counter, tempo ramp (+N BPM every M bars up to a target), and random
  silent bars to test your internal clock
- Up to six saved presets (tempo + bar length + subdivision), persisted with all other settings
- Keyboard: `Space` start/stop, arrows ±1, `Shift`+arrows ±5, `PageUp`/`PageDown` ±10

## How it works

```
src/
  audio/
    MetronomeEngine.ts   lookahead scheduler, transport, beat queue
    voices.ts            synthesized click voices
  hooks/
    useMetronome.ts      engine ↔ React wiring, settings, presets
    useKeyboardShortcuts.ts
    useHoldRepeat.ts     press-and-hold auto-repeat for ± buttons
    usePersistentState.ts
  lib/
    tempo.ts             clamping, parsing, ramp and tick math (unit-tested)
    tempoMarkings.ts     Italian markings and their BPM ranges
    persist.ts           validate/repair anything read from localStorage
    types.ts, defaults.ts
  components/            one component per control
  styles/index.css
```

**Timing deliberately lives outside React.** `setInterval` and render cycles jitter by tens of
milliseconds, which is plainly audible on a metronome. `MetronomeEngine` instead uses the
standard Web Audio lookahead pattern (Chris Wilson, *A Tale of Two Clocks*): a coarse 25 ms timer
hands Web Audio every click falling in the next 120 ms with an exact `AudioContext` timestamp, and
the audio thread plays them with sample accuracy. React never touches a click's schedule.

Two consequences worth knowing:

- **Visuals follow the audio clock, not the render loop.** Beats are queued with their scheduled
  time; a `requestAnimationFrame` loop only draws one once `currentTime` reaches it. That's why
  the dot lands with the sound instead of a frame late.
- **Background tabs don't machine-gun.** Throttled timers fall behind; rather than catching up by
  firing every missed click at once, the engine resyncs to the bar line and counts the drop
  (`engine.getStats().resyncs`).

### Adding a click voice

Add one entry to `VOICES` in `src/audio/voices.ts` — an `id`, a label, and a `render(ctx, dest,
time, kind)` that builds its nodes at `time`. `kind` is `'accent' | 'beat' | 'sub'`; the `LEVEL`
map in that file keeps relative loudness consistent across voices. Nothing else needs changing:
the sound picker reads `VOICES`, and `lib/persist.ts` validates stored ids against it.

Calibrate it rather than guessing: `LEVEL` in `voices.ts` sets the balance between accent/beat/sub,
and the `DRIVE` constant next to it sets how hot the whole signal runs against the engine's soft
ceiling (`CEILING_KNEE`/`CEILING_SPREAD` in `MetronomeEngine.ts`) — tune relative loudness with
one, overall loudness with the other. Note that gain figures are not comparable across synthesis
methods — a narrow bandpass discards most of a noise source's energy, which is why the studio
click needs several times the gain of the tone voices to sound equally loud. Measure with an
`OfflineAudioContext` (render one tick, take peak and RMS over the first 100 ms) instead of tuning
by ear.

**The volume slider isn't a plain multiplier.** 0–65% ramps linearly up to unity gain — already
calibrated to run clicks hot against the ceiling, a clean and comfortably loud "normal" range —
and 65–100% keeps pushing past unity into real compression (`volumeToGain` in
`MetronomeEngine.ts`), so the top of the slider is a deliberate, denser "too loud" zone rather
than a linear continuation. The default volume (65%) sits right at that unity point.

## Verifying a change

- `npm test` covers the pure logic: BPM clamping and parsing, subdivision tick math, ramp
  behaviour at bar boundaries, marking-range coverage, and localStorage repair.
- For timing, play at 120 BPM for two minutes against a reference and listen for drift. Ticks are
  computed by accumulating exact offsets, so the only real failure mode is the scheduler falling
  behind — check `engine.getStats()` (`resyncs` should be 0, `minLead` comfortably above 0).
- Tab away for 30 s while playing and come back: the click should resume cleanly, never in a burst.
