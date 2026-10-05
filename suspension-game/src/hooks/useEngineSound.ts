import { useEffect, useRef } from 'react'

export type Sfx = 'star' | 'fuel' | 'flip' | 'air' | 'checkpoint' | 'crash' | 'boost' | 'jump' | 'finish' | 'nofuel'

/** Ronco de motor sintetizado (WebAudio) + efeitos curtos. Nada de arquivos de áudio. */
export class GameAudio {
  private ctx: AudioContext | null = null
  private oscA!: OscillatorNode
  private oscB!: OscillatorNode
  private filter!: BiquadFilterNode
  private engineGain!: GainNode
  private master!: GainNode
  muted = false

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.connect(ctx.destination)
    this.oscA = ctx.createOscillator()
    this.oscB = ctx.createOscillator()
    this.oscA.type = 'sawtooth'
    this.oscB.type = 'square'
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 400
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0
    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)
    this.filter.connect(this.engineGain).connect(this.master)
    this.oscA.start()
    this.oscB.start()
  }

  /** rpm 0..1, throttle 0..1, volume 0..1 */
  engine(rpm: number, throttle: number, volume: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const f = 38 + rpm * 120
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.05)
    this.oscA.frequency.setTargetAtTime(f, t, 0.05)
    this.oscB.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.05)
    this.filter.frequency.setTargetAtTime(250 + rpm * 900 + throttle * 600, t, 0.05)
    this.engineGain.gain.setTargetAtTime(volume * (0.025 + throttle * 0.035 + rpm * 0.02), t, 0.08)
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slideTo?: number) {
    const ctx = this.ctx!
    const t = ctx.currentTime + start
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private noise(start: number, dur: number, vol: number, from: number, to: number) {
    const ctx = this.ctx!
    const t = ctx.currentTime + start
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(from, t)
    f.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
  }

  sfx(kind: Sfx) {
    if (!this.ctx || this.muted) return
    switch (kind) {
      case 'star':
        this.tone(988, 0, 0.12, 'square', 0.06)
        this.tone(1319, 0.07, 0.25, 'square', 0.06)
        break
      case 'fuel':
        this.tone(330, 0, 0.3, 'triangle', 0.15, 660)
        break
      case 'flip':
      case 'air':
        ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.06, 0.18, 'square', 0.05))
        break
      case 'checkpoint':
        this.tone(660, 0, 0.12, 'triangle', 0.12)
        this.tone(990, 0.1, 0.25, 'triangle', 0.12)
        break
      case 'crash':
        this.noise(0, 0.5, 0.5, 1800, 120)
        this.tone(110, 0, 0.4, 'sawtooth', 0.15, 40)
        break
      case 'boost':
        this.noise(0, 0.6, 0.25, 300, 3000)
        break
      case 'jump':
        this.tone(180, 0, 0.35, 'sine', 0.2, 720)
        break
      case 'finish':
        ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.3, 'square', 0.06))
        break
      case 'nofuel':
        this.tone(400, 0, 0.6, 'sawtooth', 0.08, 120)
        break
    }
  }

  close() {
    this.ctx?.close()
    this.ctx = null
  }
}

export function useGameAudio(enabled = true) {
  const audio = useRef<GameAudio | null>(null)
  useEffect(() => {
    if (!enabled) return
    const a = new GameAudio()
    audio.current = a
    // navegadores só liberam áudio depois de um gesto do usuário
    const unlock = () => a.ensure()
    unlock()
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)
    return () => {
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
      a.close()
      audio.current = null
    }
  }, [enabled])
  return audio
}
