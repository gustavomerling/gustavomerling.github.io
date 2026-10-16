import { getAudioContext } from '../audio'
import { SONGS, type SongDef, type SongId } from './songs'

const STEPS = 16
const LOOKAHEAD = 0.12
const TICK_MS = 25
const MASTER_VOLUME = 0.55

const HIGH = 'qwertyu'

/** Degree char -> semitones above the song root, or null for rest/hold. */
function degree(song: SongDef, ch: string): number | null {
  const d = '1234567'.indexOf(ch)
  if (d >= 0) return song.scale[d]
  const h = HIGH.indexOf(ch)
  if (h >= 0) return song.scale[h] + 12
  return null
}

/** Semitones of the n-th chord tone (0 root, 1 third, 2 fifth) built on a scale degree. */
function chordTone(song: SongDef, rootDegree: number, n: number): number {
  const idx = rootDegree - 1 + n * 2
  return song.scale[idx % 7] + Math.floor(idx / 7) * 12
}

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/**
 * Tiny step sequencer: lead + bass + arpeggio + noise drums, scheduled ahead on the
 * shared AudioContext. One instance plays one song at a time.
 */
class MusicPlayer {
  private song: SongDef | null = null
  private songId: SongId | null = null
  private step = 0
  private nextTime = 0
  private timer: ReturnType<typeof setInterval> | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private muted = false
  private paused = false

  play(id: SongId) {
    if (this.songId === id && this.timer) return
    this.stopTimer()
    this.song = SONGS[id]
    this.songId = id
    this.step = 0
    this.paused = false
    this.startTimer()
  }

  stop() {
    this.stopTimer()
    this.song = null
    this.songId = null
  }

  setPaused(paused: boolean) {
    if (paused === this.paused) return
    this.paused = paused
    if (paused) this.stopTimer()
    else if (this.song) this.startTimer()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    const ctx = getAudioContext()
    if (this.master && ctx) this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05)
  }

  private startTimer() {
    const ctx = getAudioContext()
    if (!ctx || !this.song) return
    if (!this.master) {
      this.master = ctx.createGain()
      this.master.connect(ctx.destination)
    }
    this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOLUME, ctx.currentTime, 0.05)
    this.nextTime = ctx.currentTime + 0.05
    this.timer = setInterval(() => this.schedule(ctx), TICK_MS)
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    const ctx = getAudioContext()
    if (this.master && ctx) {
      // fade out whatever is already scheduled
      const g = this.master
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.04)
      this.master = null
      setTimeout(() => g.disconnect(), 400)
    }
  }

  private schedule(ctx: AudioContext) {
    const song = this.song
    if (!song) return
    const stepDur = 60 / song.bpm / 4
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(ctx, song, this.step, this.nextTime, stepDur)
      this.nextTime += stepDur
      this.step = (this.step + 1) % (song.melody.length * STEPS)
    }
  }

  private playStep(ctx: AudioContext, song: SongDef, step: number, t: number, stepDur: number) {
    const bar = Math.floor(step / STEPS)
    const s = step % STEPS
    const chord = song.chords[bar % song.chords.length]

    // lead: note length = this step + following holds
    const line = song.melody[bar]
    const semis = degree(song, line[s])
    if (semis !== null) {
      let len = 1
      while (s + len < STEPS && line[s + len] === '-') len++
      this.voice(ctx, song.lead, freq(song.root + semis), t, len * stepDur * 0.95, 0.07)
    }

    const b = song.bass[s]
    if (b !== '.') {
      const root = song.root - 24 + chordTone(song, chord, 0)
      const note = b === 'o' ? root + 12 : b === 'f' ? root + 7 : root
      this.voice(ctx, 'triangle', freq(note), t, stepDur * 0.9, 0.2)
    }

    const a = song.arp[s]
    if (a !== '.') {
      const note = song.root + 12 + chordTone(song, chord, Number(a))
      this.voice(ctx, 'square', freq(note), t, stepDur * 0.5, 0.018)
    }

    if (song.drums.kick[s] === 'x') this.kick(ctx, t)
    if (song.drums.snare[s] === 'x') this.hit(ctx, t, 0.12, 1800, 0.09)
    if (song.drums.hat[s] === 'x') this.hit(ctx, t, 0.03, 7000, 0.03)
  }

  private voice(ctx: AudioContext, type: OscillatorType, f: number, t: number, dur: number, vol: number) {
    if (!this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f, t)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.setValueAtTime(vol * 0.7, t + Math.min(dur, 0.06))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private kick(ctx: AudioContext, t: number) {
    if (!this.master) return
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    g.gain.setValueAtTime(0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 0.16)
  }

  private hit(ctx: AudioContext, t: number, dur: number, cutoff: number, vol: number) {
    if (!this.master) return
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = cutoff
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }
}

export const music = new MusicPlayer()

/** Dev check: every melody bar must be exactly 16 steps. */
for (const [id, song] of Object.entries(SONGS)) {
  song.melody.forEach((bar, i) => {
    if (bar.length !== STEPS) console.warn(`song ${id} bar ${i + 1}: ${bar.length} steps, expected ${STEPS}`)
  })
}
