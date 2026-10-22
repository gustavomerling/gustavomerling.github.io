/**
 * Tiny WebAudio synth/mixer. No audio files: every sound is a list of layers (an oscillator
 * or a slice of filtered white noise) shaped by an attack/decay envelope.
 *
 * master gain -> destination; every voice -> (panner) -> sfx bus -> master.
 * Voice limiting (oldest dropped past `maxVoices`), per-sound cooldown (no stacking of the same
 * sound in the same instant) and a little random pitch variation per play.
 *
 * Without WebAudio (node, tests) every method is a no-op. The context is created on the first
 * user gesture (browser autoplay policy): call `unlockOnGesture()` once.
 */

export interface ToneLayer {
  kind: 'tone';
  wave: OscillatorType;
  /** Start / end frequency (Hz); the sweep is exponential over attack + decay. */
  freq: number;
  freqEnd?: number;
  /** Optional low-pass on the oscillator (Hz): softens saw/square. */
  lowpass?: number;
  /** Vibrato depth (Hz) at 6 Hz; 0 = none. */
  vibrato?: number;
  attack?: number;
  decay: number;
  gain: number;
  /** Seconds after the sound starts. */
  delay?: number;
}

export interface NoiseLayer {
  kind: 'noise';
  filter: BiquadFilterType;
  /** Filter frequency start / end (Hz). */
  freq: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  decay: number;
  gain: number;
  delay?: number;
}

export type SynthLayer = ToneLayer | NoiseLayer;

export interface SynthSound {
  layers: SynthLayer[];
  /** Overall level, multiplied into every layer (default 1). */
  gain?: number;
  /** Minimum seconds between two plays of this sound (default 0.02). */
  cooldown?: number;
  /** Random pitch variation, as a fraction (0.06 = +-6%). Default 0.04. */
  pitchJitter?: number;
}

export interface PlayOptions {
  /** -1 (left) .. 1 (right). */
  pan?: number;
  /** Extra level for this play (distance, enemy vs player). */
  gain?: number;
  /** Fixed pitch multiplier on top of the jitter. */
  pitch?: number;
}

type Ctor = typeof AudioContext;

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly lastPlayed = new Map<string, number>();
  private voices: { end: number; nodes: AudioNode[] }[] = [];
  private volume = 0.7;
  private enabled = true;
  private unlockBound = false;

  constructor(private readonly maxVoices = 24) {}

  get available(): boolean {
    return audioCtor() !== null;
  }

  /** Creates/resumes the context on the first pointer or key press (autoplay policy). */
  unlockOnGesture(): void {
    if (this.unlockBound || !this.available) return;
    this.unlockBound = true;
    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(key: string, sound: SynthSound, opts: PlayOptions = {}): void {
    if (!this.enabled || this.volume <= 0) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfx || !this.noise) return;
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(key);
    if (last !== undefined && now - last < (sound.cooldown ?? 0.02)) return;
    this.lastPlayed.set(key, now);

    this.reap(now);
    while (this.voices.length >= this.maxVoices) this.stopVoice(this.voices.shift()!);

    const jitter = sound.pitchJitter ?? 0.04;
    const pitch = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    const level = (sound.gain ?? 1) * (opts.gain ?? 1);
    if (level <= 0.001) return;

    let out: AudioNode = this.sfx;
    const nodes: AudioNode[] = [];
    if (opts.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, opts.pan));
      p.connect(this.sfx);
      nodes.push(p);
      out = p;
    }
    let end = now;
    for (const layer of sound.layers) end = Math.max(end, this.layer(ctx, layer, now, pitch, level, out, nodes));
    this.voices.push({ end, nodes });
  }

  private layer(ctx: AudioContext, l: SynthLayer, now: number, pitch: number, level: number, out: AudioNode, nodes: AudioNode[]): number {
    const t0 = now + (l.delay ?? 0);
    const attack = Math.max(0.002, l.attack ?? 0.003);
    const t1 = t0 + attack;
    const t2 = t1 + Math.max(0.01, l.decay);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, l.gain * level), t1);
    env.gain.exponentialRampToValueAtTime(0.0001, t2);
    env.connect(out);
    nodes.push(env);

    const sweep = (param: AudioParam, from: number, to: number | undefined) => {
      param.setValueAtTime(from, t0);
      if (to !== undefined && to !== from) param.exponentialRampToValueAtTime(Math.max(1, to), t2);
    };

    let src: AudioScheduledSourceNode;
    if (l.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = l.wave;
      sweep(osc.frequency, l.freq * pitch, l.freqEnd !== undefined ? l.freqEnd * pitch : undefined);
      if (l.vibrato) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 6;
        depth.gain.value = l.vibrato;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(t0);
        lfo.stop(t2 + 0.05);
        nodes.push(lfo, depth);
      }
      if (l.lowpass) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = l.lowpass;
        osc.connect(f).connect(env);
        nodes.push(f);
      } else {
        osc.connect(env);
      }
      src = osc;
    } else {
      const buf = ctx.createBufferSource();
      buf.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = l.filter;
      f.Q.value = l.q ?? 1;
      sweep(f.frequency, l.freq * pitch, l.freqEnd !== undefined ? l.freqEnd * pitch : undefined);
      buf.connect(f).connect(env);
      nodes.push(f);
      src = buf;
      // Random slice of the shared buffer so repeats don't sound identical.
      buf.start(t0, Math.random() * 0.5);
      buf.stop(t2 + 0.02);
      nodes.push(buf);
      return t2;
    }
    src.start(t0);
    src.stop(t2 + 0.02);
    nodes.push(src);
    return t2;
  }

  private reap(now: number): void {
    if (this.voices.length === 0) return;
    const keep: typeof this.voices = [];
    for (const v of this.voices) {
      if (v.end + 0.05 < now) this.disconnect(v);
      else keep.push(v);
    }
    this.voices = keep;
  }

  private stopVoice(v: { nodes: AudioNode[] }): void {
    for (const n of v.nodes) {
      if (n instanceof AudioScheduledSourceNode) {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      }
    }
    this.disconnect(v);
  }

  private disconnect(v: { nodes: AudioNode[] }): void {
    for (const n of v.nodes) n.disconnect();
  }

  private ensure(): void {
    const Ctor = audioCtor();
    if (!Ctor) return;
    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      // Gentle limiter so stacked shots don't clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      this.master.connect(comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.8;
      this.sfx.connect(this.master);
      const len = Math.floor(ctx.sampleRate * 1);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
}
