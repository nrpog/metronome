import { applyRamp, secondsPerTick } from '../lib/tempo'
import type { BeatEvent, MetronomeSettings, TickKind } from '../lib/types'
import { voiceById } from './voices'

/** How often the coarse JS timer wakes up to look for work. */
const LOOKAHEAD_MS = 25
/** How far ahead of the audio clock clicks are scheduled. */
const SCHEDULE_AHEAD_S = 0.12
/** If the JS timer falls further behind than this (background tab), resync instead of catching up. */
const RESYNC_THRESHOLD_S = 0.25

/** Below this the ceiling is exactly transparent; above it, the knee starts. */
const CEILING_KNEE = 0.65
/** How gradually the knee folds toward the ceiling — wider than the knee gap itself, so there's
 * real distance between "just past the knee" and "fully pinned" for the volume curve to use. */
const CEILING_SPREAD = 0.5

// The explicit buffer type is what WaveShaperNode.curve expects — a bare Float32Array widens to
// ArrayBufferLike and no longer assigns.
let ceilingCurve: Float32Array<ArrayBuffer> | null = null

/**
 * A soft ceiling on the output, as a WaveShaper curve.
 *
 * Clicks now run hot enough that tails can overlap — sixteenths at 300 BPM are 50 ms apart
 * against a 70 ms decay — and the sum would clip harshly. This passes anything under the knee
 * through untouched (so quiet clicks keep their exact shape) and folds the rest toward a hard
 * limit, gradually enough that driving further past the knee keeps buying real loudness instead
 * of pinning instantly. Unlike a compressor it adds no lookahead, which a metronome cannot afford.
 */
function softCeiling(): Float32Array<ArrayBuffer> {
  if (ceilingCurve) return ceilingCurve
  const samples = 2048
  const curve = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1
    const magnitude = Math.abs(x)
    const shaped =
      magnitude <= CEILING_KNEE
        ? magnitude
        : CEILING_KNEE + (1 - CEILING_KNEE) * Math.tanh((magnitude - CEILING_KNEE) / CEILING_SPREAD)
    curve[i] = Math.sign(x) * shaped
  }
  ceilingCurve = curve
  return curve
}

/** Slider position, 0–1, where the volume curve reaches unity gain. */
const VOLUME_UNITY_AT = 0.65
/** Gain at slider position 1 (100%) — driven well past unity, into the ceiling's compression. */
const VOLUME_MAX_DRIVE = 1.35

/**
 * The volume slider isn't a plain multiplier: 0–65% ramps linearly up to unity gain, which is
 * already calibrated to run clicks hot against the soft ceiling — a clean, comfortably loud
 * "normal" range. 65–100% keeps pushing past unity into real compression, so the top of the
 * slider is deliberately louder and denser than typical use, not just more of the same.
 */
function volumeToGain(volume: number): number {
  const v = Math.min(Math.max(volume, 0), 1)
  if (v <= VOLUME_UNITY_AT) return v / VOLUME_UNITY_AT
  const t = (v - VOLUME_UNITY_AT) / (1 - VOLUME_UNITY_AT)
  return 1 + t * (VOLUME_MAX_DRIVE - 1)
}

export interface EngineStats {
  ticksScheduled: number
  resyncs: number
  /** Smallest gap ever observed between a scheduled click and the audio clock, in seconds. */
  minLead: number
}

/**
 * Timing lives here, deliberately outside React.
 *
 * setInterval and render cycles jitter by tens of milliseconds, which is plainly audible on a
 * metronome. So a coarse timer wakes every LOOKAHEAD_MS and hands Web Audio every click falling
 * in the next SCHEDULE_AHEAD_S window with an exact AudioContext timestamp; the audio thread
 * then plays them with sample accuracy. (Chris Wilson, "A Tale of Two Clocks".)
 *
 * Settings are held in a mutable copy read at each tick, so changing tempo mid-play takes effect
 * on the very next tick without restarting the transport or resetting the bar.
 */
export class MetronomeEngine {
  playing = false

  /** Fired when the practice ramp changes the tempo, so React state can follow along. */
  onTempoChange: ((bpm: number) => void) | null = null
  onPlayingChange: ((playing: boolean) => void) | null = null

  private settings: MetronomeSettings
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** Everything for the current run connects here, so stop() can silence pending clicks. */
  private runGain: GainNode | null = null
  private timer: number | null = null

  private nextTickTime = 0
  private tickInBeat = 0
  private beatInBar = 0
  private bar = 0
  private barMuted = false

  private queue: BeatEvent[] = []
  private stats: EngineStats = { ticksScheduled: 0, resyncs: 0, minLead: Infinity }

  constructor(settings: MetronomeSettings) {
    this.settings = { ...settings, practice: { ...settings.practice } }
  }

  updateSettings(patch: Partial<MetronomeSettings>): void {
    const previous = this.settings
    this.settings = {
      ...previous,
      ...patch,
      practice: patch.practice ? { ...patch.practice } : previous.practice,
    }

    if (this.settings.beatsPerBar !== previous.beatsPerBar && this.beatInBar >= this.settings.beatsPerBar) {
      // Shrinking the bar mid-play would strand the cursor past the end — start a fresh bar.
      this.beatInBar = 0
      this.tickInBeat = 0
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(volumeToGain(this.settings.volume), this.ctx.currentTime, 0.01)
    }
  }

  getSettings(): MetronomeSettings {
    return this.settings
  }

  getStats(): EngineStats {
    return { ...this.stats }
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0
  }

  async start(): Promise<void> {
    if (this.playing) return
    const ctx = this.ensureContext()
    // Browsers hand back a suspended context until a user gesture unlocks it; without this
    // the first click after page load is silently dropped.
    if (ctx.state !== 'running') await ctx.resume()

    this.tickInBeat = 0
    this.beatInBar = 0
    this.bar = 0
    this.barMuted = false
    this.queue = []
    this.stats = { ticksScheduled: 0, resyncs: 0, minLead: Infinity }

    this.runGain = ctx.createGain()
    this.runGain.gain.setValueAtTime(1, ctx.currentTime)
    this.runGain.connect(this.master!)

    // A beat of headroom so the very first click is scheduled, not played late.
    this.nextTickTime = ctx.currentTime + 0.08
    this.playing = true
    this.onPlayingChange?.(true)
    this.schedule()
    this.timer = window.setInterval(this.schedule, LOOKAHEAD_MS)
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (this.runGain && this.ctx) {
      // Fade rather than disconnect outright: clicks are already scheduled up to
      // SCHEDULE_AHEAD_S into the future and would otherwise trail past the stop.
      const gain = this.runGain
      const now = this.ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.setTargetAtTime(0, now, 0.008)
      window.setTimeout(() => gain.disconnect(), 400)
      this.runGain = null
    }
    this.queue = []
    if (this.playing) {
      this.playing = false
      this.onPlayingChange?.(false)
    }
  }

  toggle(): void {
    if (this.playing) this.stop()
    else void this.start()
  }

  /**
   * Returns the most recent beat whose audio has now been reached, discarding any older ones.
   * Driven from a requestAnimationFrame loop, this is what keeps the flashing dot locked to
   * the click instead of trailing it by a render.
   */
  drainDue(): BeatEvent | null {
    if (!this.ctx) return null
    const now = this.ctx.currentTime
    let due: BeatEvent | null = null
    while (this.queue.length > 0 && this.queue[0].time <= now) {
      due = this.queue.shift()!
    }
    return due
  }

  /** Release audio resources. Only for teardown — start() will rebuild what it needs. */
  dispose(): void {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.setValueAtTime(volumeToGain(this.settings.volume), this.ctx.currentTime)
      const ceiling = this.ctx.createWaveShaper()
      ceiling.curve = softCeiling()
      ceiling.oversample = '2x'
      this.master.connect(ceiling).connect(this.ctx.destination)
    }
    return this.ctx
  }

  private schedule = (): void => {
    const ctx = this.ctx
    if (!ctx || !this.playing) return

    if (this.nextTickTime < ctx.currentTime - RESYNC_THRESHOLD_S) {
      // Background tabs throttle timers to once a second or worse. Catching up would fire a
      // burst of machine-gun clicks, so drop the missed ticks and restart from the bar line.
      this.nextTickTime = ctx.currentTime + 0.05
      this.tickInBeat = 0
      this.beatInBar = 0
      this.queue = []
      this.stats.resyncs++
    }

    while (this.nextTickTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      this.stats.minLead = Math.min(this.stats.minLead, this.nextTickTime - ctx.currentTime)
      this.emit(this.nextTickTime)
      this.advance()
    }
  }

  private emit(time: number): void {
    const s = this.settings
    const kind: TickKind =
      this.tickInBeat !== 0 ? 'sub' : this.beatInBar === 0 && s.accentEnabled ? 'accent' : 'beat'

    if (!this.barMuted) {
      voiceById(s.voice).render(this.ctx!, this.runGain!, time, kind)
    }
    this.stats.ticksScheduled++

    // Only beats reach the UI; subdivisions would just churn renders for no visible gain.
    if (kind !== 'sub') {
      this.queue.push({
        time,
        bar: this.bar,
        beatInBar: this.beatInBar,
        kind,
        muted: this.barMuted,
      })
    }
  }

  private advance(): void {
    const s = this.settings
    this.nextTickTime += secondsPerTick(s.bpm, s.subdivision)

    this.tickInBeat++
    if (this.tickInBeat < s.subdivision) return

    this.tickInBeat = 0
    this.beatInBar++
    if (this.beatInBar < s.beatsPerBar) return

    this.beatInBar = 0
    this.bar++
    this.onBarBoundary()
  }

  private onBarBoundary(): void {
    const p = this.settings.practice

    const ramped = applyRamp(this.settings.bpm, this.bar, p)
    if (ramped !== this.settings.bpm) {
      this.settings = { ...this.settings, bpm: ramped }
      this.onTempoChange?.(ramped)
    }

    this.barMuted = p.muteEnabled && Math.random() * 100 < p.mutePercent
  }
}
