import type { TickKind, VoiceId } from '../lib/types'

/**
 * Every click is synthesised on the fly — no audio files to host, preload, or wait on,
 * and no first-click latency after a cold load.
 *
 * A voice renders one tick into `dest` at an exact AudioContext time. Adding a voice is a
 * single entry in VOICES; nothing else needs to know about it.
 */
export interface VoiceDef {
  id: VoiceId
  label: string
  hint: string
  render: (ctx: AudioContext, dest: AudioNode, time: number, kind: TickKind) => void
}

/**
 * Relative loudness per tick type — subdivisions sit under the pulse, beats just under the
 * downbeat.
 */
const LEVEL: Record<TickKind, number> = {
  accent: 1,
  beat: 0.8,
  sub: 0.42,
}

/**
 * Overall drive applied on top of LEVEL, pushing the reference accent (level 1) well past the
 * engine's soft-ceiling knee. LEVEL sets the balance between tick types; DRIVE is the single
 * knob for how hot the whole signal runs against that ceiling — see MetronomeEngine's volume
 * curve for how that headroom gets spent (clean around 60–70% on the slider, compressed and
 * genuinely loud at 100%).
 */
const DRIVE = 1.5

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>()

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx)
  if (cached) return cached
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.2), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffers.set(ctx, buffer)
  return buffer
}

/**
 * Exponential ramps can never touch zero, so envelopes start and end at a tiny epsilon
 * instead of 0 — this is what keeps the clicks free of the "tick" of a discontinuity.
 */
const EPS = 0.0001

function envelope(ctx: AudioContext, time: number, peak: number, decay: number): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(EPS, time)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak * DRIVE, EPS), time + 0.001)
  gain.gain.exponentialRampToValueAtTime(EPS, time + decay)
  return gain
}

function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  time: number,
  opts: { freq: number; q: number; peak: number; decay: number },
): void {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(opts.freq, time)
  filter.Q.setValueAtTime(opts.q, time)
  const gain = envelope(ctx, time, opts.peak, opts.decay)
  source.connect(filter).connect(gain).connect(dest)
  source.start(time)
  source.stop(time + opts.decay + 0.02)
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  time: number,
  opts: {
    type: OscillatorType
    freq: number
    /** Pitch drop over the decay, as a fraction of the start frequency. */
    bend?: number
    peak: number
    decay: number
  },
): void {
  const osc = ctx.createOscillator()
  osc.type = opts.type
  osc.frequency.setValueAtTime(opts.freq, time)
  if (opts.bend && opts.bend !== 1) {
    osc.frequency.exponentialRampToValueAtTime(opts.freq * opts.bend, time + opts.decay)
  }
  const gain = envelope(ctx, time, opts.peak, opts.decay)
  osc.connect(gain).connect(dest)
  osc.start(time)
  osc.stop(time + opts.decay + 0.02)
}

export const VOICES: ReadonlyArray<VoiceDef> = [
  {
    id: 'woodblock',
    label: 'Wood block',
    hint: 'Warm, acoustic knock',
    render: (ctx, dest, time, kind) => {
      const level = LEVEL[kind]
      const freq = kind === 'accent' ? 1500 : kind === 'beat' ? 1050 : 820
      tone(ctx, dest, time, {
        type: 'triangle',
        freq,
        bend: 0.55,
        peak: 0.81 * level,
        decay: kind === 'sub' ? 0.04 : 0.07,
      })
      // The attack transient — without it the block reads as a soft beep.
      noiseBurst(ctx, dest, time, {
        freq: freq * 1.6,
        q: 1.4,
        peak: 0.51 * level,
        decay: 0.016,
      })
    },
  },
  {
    id: 'beep',
    label: 'Digital beep',
    hint: 'Clean, cuts through a mix',
    render: (ctx, dest, time, kind) => {
      const level = LEVEL[kind]
      const freq = kind === 'accent' ? 1320 : kind === 'beat' ? 880 : 660
      tone(ctx, dest, time, {
        type: 'sine',
        freq,
        peak: 0.88 * level,
        decay: kind === 'sub' ? 0.035 : 0.06,
      })
    },
  },
  {
    id: 'click',
    label: 'Studio click',
    hint: 'Dry, percussive tick',
    render: (ctx, dest, time, kind) => {
      const level = LEVEL[kind]
      const freq = kind === 'accent' ? 3200 : kind === 'beat' ? 2200 : 1600
      // A narrow band throws away most of the noise energy, so this needs far more gain than
      // the tone voices to land at the same loudness — Q and peak are calibrated together. That
      // gain also means the peak sits pinned at the soft ceiling well before DRIVE or the volume
      // curve can add anything further (measured: raising DRIVE alone left this voice's RMS
      // almost unchanged). So loudness here comes from decay length instead of peak — a longer
      // tail banks more energy under an already-maxed peak, verified to raise RMS ~60% at unity
      // gain without touching Q, which would change the dry, narrow character of the voice.
      noiseBurst(ctx, dest, time, {
        freq,
        q: 3.5,
        peak: 3.8 * level,
        decay: kind === 'sub' ? 0.027 : 0.045,
      })
    },
  },
]

const VOICE_BY_ID = new Map(VOICES.map((v) => [v.id, v]))

export function voiceById(id: VoiceId): VoiceDef {
  return VOICE_BY_ID.get(id) ?? VOICES[0]
}
