/*
 * Procedural ambience with WebAudio (no sound files). Layers follow what's in the world:
 * fire crackles, boiling bubbles, rain, bird chirps by day, bee buzz, crickets at night.
 * `update` is called a few times per second with the current levels and schedules
 * sounds for the next interval.
 */

export interface SoundLevels {
  fire: number
  steam: number
  cloud: number
  birds: number
  bees: number
  grass: number
  /** Daylight 0..1. */
  light: number
}

/** How far ahead `update` schedules one-shot sounds (seconds); matches the stats interval. */
const INTERVAL = 0.25

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private rainGain: GainNode | null = null
  private buzzGain: GainNode | null = null
  private volume = 0.6
  private enabled = true

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.connect(ctx.destination)
    this.applyVolume()
    this.noise = createNoise(ctx)
    this.rainGain = this.startRain(ctx)
    this.buzzGain = this.startBuzz(ctx)
  }

  setVolume(enabled: boolean, volume: number) {
    this.enabled = enabled
    this.volume = volume
    this.applyVolume()
  }

  update(levels: SoundLevels) {
    const { ctx, rainGain, buzzGain } = this
    if (!ctx || !rainGain || !buzzGain || ctx.state !== 'running') return
    const now = ctx.currentTime

    rainGain.gain.setTargetAtTime(Math.min(0.35, levels.cloud / 300), now, 0.5)
    buzzGain.gain.setTargetAtTime(Math.min(0.06, levels.bees * 0.006) * (0.2 + 0.8 * levels.light), now, 0.3)

    repeat(Math.min(8, levels.fire / 25), (t) => this.crackle(now + t))
    repeat(Math.min(5, levels.steam / 40), (t) => this.bubble(now + t))
    if (levels.light > 0.4) repeat(Math.min(1.5, levels.birds * 0.15), (t) => this.chirp(now + t))
    if (levels.light < 0.3 && levels.grass > 0) repeat(Math.min(1.2, levels.grass / 200), (t) => this.cricket(now + t))
  }

  dispose() {
    void this.ctx?.close()
    this.ctx = null
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.05)
  }

  // ---------- Continuous layers ----------

  private startRain(ctx: AudioContext): GainNode {
    const source = this.noiseSource(ctx, true)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 3500
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter).connect(gain).connect(this.master!)
    source.start()
    return gain
  }

  private startBuzz(ctx: AudioContext): GainNode {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 190
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    // Wobble so it sounds like wings, not a synth.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 7
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 12
    lfo.connect(lfoDepth).connect(osc.frequency)
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(filter).connect(gain).connect(this.master!)
    osc.start()
    lfo.start()
    return gain
  }

  // ---------- One-shot sounds ----------

  private crackle(at: number) {
    const ctx = this.ctx!
    const source = this.noiseSource(ctx, false)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200 + Math.random() * 3000
    filter.Q.value = 1.5
    const gain = envelope(ctx, at, 0.002, 0.04 + Math.random() * 0.05, 0.25 + Math.random() * 0.25)
    source.connect(filter).connect(gain).connect(this.master!)
    source.start(at, Math.random() * 1.5, 0.12)
  }

  private bubble(at: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const base = 180 + Math.random() * 260
    osc.frequency.setValueAtTime(base, at)
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, at + 0.06)
    const gain = envelope(ctx, at, 0.005, 0.07, 0.12)
    osc.connect(gain).connect(this.master!)
    osc.start(at)
    osc.stop(at + 0.12)
  }

  private chirp(at: number) {
    const ctx = this.ctx!
    const notes = 2 + Math.floor(Math.random() * 3)
    const base = 2600 + Math.random() * 1400
    for (let n = 0; n < notes; n++) {
      const t = at + n * 0.09
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(base, t)
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.05)
      const gain = envelope(ctx, t, 0.005, 0.06, 0.08)
      osc.connect(gain).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.08)
    }
  }

  private cricket(at: number) {
    const ctx = this.ctx!
    for (let n = 0; n < 3; n++) {
      const t = at + n * 0.045
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = 4400 + Math.random() * 200
      const gain = envelope(ctx, t, 0.003, 0.025, 0.04)
      osc.connect(gain).connect(this.master!)
      osc.start(t)
      osc.stop(t + 0.04)
    }
  }

  private noiseSource(ctx: AudioContext, loop: boolean): AudioBufferSourceNode {
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = loop
    return source
  }
}

/** 2 seconds of white noise, reused by every noisy sound. */
function createNoise(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Gain node with a quick attack and exponential decay starting at `at`. */
function envelope(ctx: AudioContext, at: number, attack: number, decay: number, peak: number): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  return gain
}

/** Calls `play` about `rate` times (fractional rates are rolled), spread over the interval. */
function repeat(rate: number, play: (offset: number) => void) {
  let count = Math.floor(rate)
  if (Math.random() < rate - count) count++
  for (let n = 0; n < count; n++) play(Math.random() * INTERVAL)
}
