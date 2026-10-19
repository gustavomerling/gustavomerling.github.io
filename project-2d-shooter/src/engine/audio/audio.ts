export type AudioBus = 'music' | 'sfx' | 'ui';

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  ui: number;
}

/**
 * Web Audio mixer with one gain node per bus. The context is created lazily and resumed
 * on the first user gesture (browser autoplay rules). `beep` is a placeholder voice for the
 * wireframe phase, before real samples exist.
 */
export class AudioMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses = new Map<AudioBus, GainNode>();
  private decoded = new Map<string, AudioBuffer>();
  private volumes: Volumes = { master: 0.8, music: 0.7, sfx: 0.9, ui: 0.8 };

  /** Call from a user gesture handler (click/keydown). Safe to call repeatedly. */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  setVolumes(v: Partial<Volumes>): void {
    this.volumes = { ...this.volumes, ...v };
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.volumes.master;
    for (const [bus, node] of this.buses) node.gain.value = this.volumes[bus];
  }

  async decode(key: string, data: ArrayBuffer): Promise<void> {
    const ctx = this.ensure();
    this.decoded.set(key, await ctx.decodeAudioData(data.slice(0)));
  }

  play(key: string, bus: AudioBus = 'sfx', { volume = 1, rate = 1 } = {}): void {
    const buffer = this.decoded.get(key);
    if (!buffer || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.bus(bus));
    src.start();
  }

  /** Synth blip for prototyping UI/gameplay feedback without assets. */
  beep(frequency: number, durationSeconds = 0.06, bus: AudioBus = 'ui', type: OscillatorType = 'square', volume = 0.15): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationSeconds);
    osc.connect(gain).connect(this.bus(bus));
    osc.start(t);
    osc.stop(t + durationSeconds);
  }

  /**
   * Filtered noise burst (+ optional low "thump" oscillator): the basis of synthesized
   * gunshots, impacts and explosions until real samples exist. `rate` < 1 pitches it down
   * and stretches it (slow motion).
   */
  noise({
    duration,
    volume = 0.3,
    filter = 'lowpass',
    freq = 2000,
    q = 0.7,
    bus = 'sfx',
    rate = 1,
    thump = 0,
  }: {
    duration: number;
    volume?: number;
    filter?: BiquadFilterType;
    freq?: number;
    q?: number;
    bus?: AudioBus;
    rate?: number;
    thump?: number;
  }): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = duration / Math.max(0.2, rate);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.playbackRate.value = rate;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.frequency.value = freq * rate;
    bq.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(gain).connect(this.bus(bus));
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur);

    if (thump > 0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(thump * rate, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, thump * 0.4 * rate), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume * 0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.bus(bus));
      osc.start(t);
      osc.stop(t + dur);
    }
  }

  private noiseBuf: AudioBuffer | null = null;

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.setVolumes({});
    return this.ctx;
  }

  private bus(bus: AudioBus): GainNode {
    let node = this.buses.get(bus);
    if (!node && this.ctx && this.master) {
      node = this.ctx.createGain();
      node.gain.value = this.volumes[bus];
      node.connect(this.master);
      this.buses.set(bus, node);
    }
    return node!;
  }
}
