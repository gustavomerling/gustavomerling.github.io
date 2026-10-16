/** Tiny procedural WebAudio beeps — no sound files. */
export type SfxName =
  | 'shoot'
  | 'hit'
  | 'kill'
  | 'pickup'
  | 'hurt'
  | 'levelUp'
  | 'click'
  | 'death'
  | 'win'
  | 'buy'
  | 'boom'
  | 'warning'
  | 'taskManager'
  | 'teleport'
  | 'discover'

let ctx: AudioContext | null = null
let muted = false
const lastPlayed: Partial<Record<SfxName, number>> = {}

/** Minimum seconds between two plays of the same sound, so swarms don't get deafening. */
const THROTTLE: Partial<Record<SfxName, number>> = { shoot: 0.09, hit: 0.05, kill: 0.04, pickup: 0.04 }

/** Shared AudioContext (also used by the music player). Null when WebAudio is unavailable. */
export function getAudioContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function ac(): AudioContext | null {
  return muted ? null : getAudioContext()
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + delay
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export function setMuted(value: boolean) {
  muted = value
}

export function playSfx(name: SfxName) {
  if (muted) return
  const now = performance.now() / 1000
  const gap = THROTTLE[name]
  if (gap && now - (lastPlayed[name] ?? 0) < gap) return
  lastPlayed[name] = now
  switch (name) {
    case 'shoot':
      return tone(1400, 0.03, 'square', 0.02)
    case 'hit':
      return tone(300, 0.05, 'square', 0.03, 0, 150)
    case 'kill':
      return tone(600, 0.08, 'triangle', 0.05, 0, 200)
    case 'pickup':
      return tone(1200 + Math.random() * 300, 0.05, 'sine', 0.05)
    case 'hurt':
      return tone(120, 0.18, 'sawtooth', 0.08, 0, 60)
    case 'click':
      return tone(900, 0.02, 'square', 0.04)
    case 'buy':
      tone(660, 0.08, 'square', 0.04)
      return tone(990, 0.12, 'square', 0.04, 0.08)
    case 'levelUp':
      // a nod to the classic "tada"
      tone(523, 0.15, 'triangle', 0.08)
      tone(659, 0.15, 'triangle', 0.08, 0.1)
      tone(784, 0.15, 'triangle', 0.08, 0.2)
      return tone(1047, 0.35, 'triangle', 0.08, 0.3)
    case 'win':
      tone(523, 0.2, 'triangle', 0.08)
      tone(784, 0.2, 'triangle', 0.08, 0.2)
      return tone(1047, 0.6, 'triangle', 0.08, 0.4)
    case 'boom':
      tone(160, 0.25, 'sawtooth', 0.06, 0, 40)
      return tone(90, 0.3, 'square', 0.05, 0.02, 30)
    case 'warning':
      // the "exclamation" ding, three times
      tone(880, 0.18, 'square', 0.06)
      tone(880, 0.18, 'square', 0.06, 0.3)
      return tone(880, 0.18, 'square', 0.06, 0.6)
    case 'taskManager':
      tone(1200, 0.05, 'square', 0.05)
      tone(600, 0.4, 'sawtooth', 0.06, 0.05, 50)
      return tone(300, 0.5, 'square', 0.05, 0.1, 40)
    case 'teleport':
      return tone(200, 0.2, 'sine', 0.06, 0, 1600)
    case 'discover':
      tone(784, 0.08, 'triangle', 0.05)
      return tone(1175, 0.15, 'triangle', 0.05, 0.08)
    case 'death':
      // the "critical stop" thud
      tone(440, 0.25, 'square', 0.06, 0, 110)
      return tone(220, 0.5, 'square', 0.06, 0.25, 55)
  }
}
