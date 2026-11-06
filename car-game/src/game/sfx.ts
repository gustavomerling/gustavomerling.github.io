/** Efeitos sonoros curtos (Web Audio, sem arquivos): batida, sucesso e falha. */
export function createSfx() {
  let ctx: AudioContext | null = null
  let muted = false
  const get = () => {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) => {
    if (muted) return
    const c = get()
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    const t0 = c.currentTime + start
    o.frequency.setValueAtTime(freq, t0)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(c.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.02)
  }
  return {
    hit: () => tone(120, 0, 0.18, 'square', 0.25, 50),
    success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.22)),
    fail: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.2, 0.4, 'sawtooth', 0.15)),
    tick: () => tone(880, 0, 0.06, 'sine', 0.12),
    setMuted: (m: boolean) => (muted = m),
  }
}
