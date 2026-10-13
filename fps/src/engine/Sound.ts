/**
 * Every sound in the game, synthesized with Web Audio (no files to load).
 * The context is created on the first `unlock`, which must follow a user gesture.
 */
export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private volume = 0.7
  private muted = false

  /** Creates or resumes the audio context. Call from a click or key press. */
  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) return
      this.ctx = new Context()
      this.master = this.ctx.createGain()
      this.master.connect(this.ctx.destination)
      this.applyVolume()

      const length = this.ctx.sampleRate
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  setVolume(volume: number, muted: boolean) {
    this.volume = volume
    this.muted = muted
    this.applyVolume()
  }

  dispose() {
    this.ctx?.close().catch(() => {})
    this.ctx = null
  }

  jump() {
    this.tone({ from: 300, to: 560, duration: 0.13, type: 'triangle', gain: 0.18 })
    this.noise({ duration: 0.06, gain: 0.05, frequency: 2200 })
  }

  /** `speed` is the falling speed at touchdown. */
  land(speed: number) {
    const strength = Math.min(speed / 14, 1)
    this.noise({ duration: 0.09 + strength * 0.1, gain: 0.12 + strength * 0.25, frequency: 380 + strength * 300 })
    this.tone({ from: 140, to: 60, duration: 0.12, type: 'sine', gain: 0.15 + strength * 0.3 })
  }

  step() {
    this.noise({ duration: 0.045, gain: 0.06, frequency: 700 + Math.random() * 500 })
  }

  fall() {
    this.tone({ from: 520, to: 90, duration: 0.45, type: 'sawtooth', gain: 0.1 })
    this.tone({ from: 260, to: 70, duration: 0.45, type: 'square', gain: 0.05, delay: 0.03 })
  }

  bounce() {
    this.tone({ from: 160, to: 760, duration: 0.32, type: 'sine', gain: 0.3 })
    this.tone({ from: 320, to: 1200, duration: 0.22, type: 'triangle', gain: 0.08, delay: 0.02 })
  }

  crack() {
    this.noise({ duration: 0.18, gain: 0.22, frequency: 1800 })
    this.tone({ from: 120, to: 70, duration: 0.2, type: 'square', gain: 0.05 })
  }

  restart() {
    this.tone({ from: 440, to: 330, duration: 0.12, type: 'triangle', gain: 0.12 })
  }

  levelUp() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) =>
      this.tone({ from: frequency, duration: 0.22, type: 'triangle', gain: 0.14, delay: i * 0.08 }),
    )
  }

  win() {
    ;[392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, i) =>
      this.tone({ from: frequency, duration: 0.5, type: 'triangle', gain: 0.13, delay: i * 0.11 }),
    )
    this.tone({ from: 130.8, duration: 1.4, type: 'sine', gain: 0.2, delay: 0.1 })
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02)
  }

  private tone({
    from,
    to = from,
    duration,
    type,
    gain,
    delay = 0,
  }: {
    from: number
    to?: number
    duration: number
    type: OscillatorType
    gain: number
    delay?: number
  }) {
    const { ctx, master } = this
    if (!ctx || !master || this.muted) return
    const start = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const envelope = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, start)
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration)
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    osc.connect(envelope).connect(master)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  private noise({ duration, gain, frequency }: { duration: number; gain: number; frequency: number }) {
    const { ctx, master, noiseBuffer } = this
    if (!ctx || !master || !noiseBuffer || this.muted) return
    const start = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(gain, start)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter).connect(envelope).connect(master)
    source.start(start, Math.random() * 0.5)
    source.stop(start + duration + 0.02)
  }
}
