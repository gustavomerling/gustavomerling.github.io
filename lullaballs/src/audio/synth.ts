import { mulberry32 } from '../engine/util';
import type { NoteHit } from './notes';

export const SAMPLE_RATE = 48000;

/** Soft music-box / felt piano voice with a long reverb tail: calm, never harsh. */
export function createChain(ctx: BaseAudioContext): AudioNode {
  const input = ctx.createGain();
  input.gain.value = 0.7;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.38;
  input.connect(comp);
  input.connect(reverb);
  reverb.connect(wet);
  wet.connect(comp);
  comp.connect(ctx.destination);
  dryOf.set(input, comp);
  return input;
}

/** The chain's way around the reverb, for sounds that must stay dry. */
const dryOf = new WeakMap<AudioNode, AudioNode>();
const noiseOf = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext) {
  let buf = noiseOf.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
    const d = buf.getChannelData(0);
    const rng = mulberry32(7);
    for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
    noiseOf.set(ctx, buf);
  }
  return buf;
}

/**
 * Dry "tock" of two marbles knocking: a short filtered noise snap plus a quick falling ping, no reverb.
 * Harder knocks are louder and brighter.
 */
function playClick(ctx: BaseAudioContext, dest: AudioNode, hit: NoteHit, when: number) {
  const out = dryOf.get(dest) ?? dest;
  const v = Math.max(0, Math.min(1, hit.vel));
  // A small, deterministic variation so a flurry of knocks doesn't sound like one sample repeated.
  const vary = 0.92 + 0.16 * (Math.sin(hit.t * 12_345.678) * 0.5 + 0.5);
  const peak = (0.04 + 0.26 * Math.pow(v, 1.3));

  const snap = ctx.createBufferSource();
  snap.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (1700 + 2600 * v) * vary;
  bp.Q.value = 1.4;
  const snapEnv = ctx.createGain();
  snapEnv.gain.setValueAtTime(0, when);
  snapEnv.gain.linearRampToValueAtTime(peak, when + 0.001);
  snapEnv.gain.exponentialRampToValueAtTime(0.0005, when + 0.03 + 0.02 * v);
  snap.connect(bp);
  bp.connect(snapEnv);
  snapEnv.connect(out);
  snap.start(when);
  snap.stop(when + 0.06);

  const ping = ctx.createOscillator();
  ping.type = 'triangle';
  const f = (900 + 500 * v) * vary;
  ping.frequency.setValueAtTime(f, when);
  ping.frequency.exponentialRampToValueAtTime(f * 0.6, when + 0.03);
  const pingEnv = ctx.createGain();
  pingEnv.gain.setValueAtTime(0, when);
  pingEnv.gain.linearRampToValueAtTime(peak * 0.6, when + 0.001);
  pingEnv.gain.exponentialRampToValueAtTime(0.0005, when + 0.045);
  ping.connect(pingEnv);
  pingEnv.connect(out);
  ping.start(when);
  ping.stop(when + 0.06);
}

function impulse(ctx: BaseAudioContext, seconds: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const rng = mulberry32(42);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

interface Voice {
  name: string;
  /** Oscillator type, frequency multiple and level of each partial. */
  partials: [OscillatorType, number, number][];
  attack: number;
  /** Seconds to fade out (bass notes ring a bit longer). */
  decay: number;
  /** Seconds held at full level before fading (organ). */
  hold?: number;
  /** Low-pass cutoff as a multiple of the note's frequency. */
  bright: number;
  /** Semitones added to the melody (not to the bass): music boxes and celestas sound an octave up. */
  shift?: number;
}

/** Timbres a post can use; the felt piano is the original voice. */
export const INSTRUMENTS: Record<string, Voice> = {
  felt: {
    name: 'Piano de feltro', attack: 0.008, decay: 1.8, bright: 6,
    partials: [['sine', 1, 1], ['triangle', 1, 0.35], ['sine', 2, 0.18], ['sine', 3, 0.05]],
  },
  musicbox: {
    name: 'Caixinha de música', attack: 0.002, decay: 1.3, bright: 12, shift: 12,
    partials: [['sine', 1, 1], ['sine', 4, 0.22], ['sine', 6.2, 0.06]],
  },
  celesta: {
    name: 'Celesta', attack: 0.003, decay: 1.6, bright: 10, shift: 12,
    partials: [['sine', 1, 1], ['sine', 2, 0.28], ['sine', 4, 0.12]],
  },
  harpsichord: {
    name: 'Cravo', attack: 0.002, decay: 1.0, bright: 7,
    partials: [['sawtooth', 1, 0.45], ['sine', 1, 0.6], ['square', 2, 0.08]],
  },
  kalimba: {
    name: 'Kalimba', attack: 0.003, decay: 1.1, bright: 9,
    partials: [['sine', 1, 1], ['triangle', 1, 0.2], ['sine', 5.4, 0.1]],
  },
  organ: {
    name: 'Órgão suave', attack: 0.04, decay: 1.2, hold: 0.22, bright: 5,
    partials: [['sine', 1, 1], ['sine', 2, 0.5], ['sine', 3, 0.22], ['sine', 4, 0.1], ['sine', 0.5, 0.25]],
  },
};

export function playHit(ctx: BaseAudioContext, dest: AudioNode, hit: NoteHit, when: number, instrument = 'felt') {
  // Every sound is placed left or right where it happened.
  const panner = ctx.createStereoPanner();
  panner.pan.value = hit.pan ?? 0;
  panner.connect(dest);
  dryOf.set(panner, dryOf.get(dest) ?? dest);
  if (hit.click) return playClick(ctx, panner, hit, when);
  if (hit.pad) playPad(ctx, dest, hit.pad, when);
  const voice = INSTRUMENTS[instrument] ?? INSTRUMENTS.felt;
  const level = 1.58 / voice.partials.reduce((sum, [, , g]) => sum + g, 0);
  hit.midis.forEach((midi, idx) => {
    const at = when + idx * (hit.roll ?? 0);
    const bass = midi < 52;
    const freq = 440 * Math.pow(2, (midi + (bass ? 0 : voice.shift ?? 0) - 69) / 12);
    const decay = bass ? voice.decay + 0.8 : voice.decay;
    const peak = (bass ? 0.2 : 0.16) * level * hit.vel / Math.sqrt(hit.midis.length);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peak, at + voice.attack);
    if (voice.hold) env.gain.setValueAtTime(peak, at + voice.attack + voice.hold);
    env.gain.exponentialRampToValueAtTime(0.0008, at + voice.attack + (voice.hold ?? 0) + decay);
    // A gentle low-pass keeps the timbre round.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(8000, freq * voice.bright);
    env.connect(lp);
    lp.connect(panner);

    const end = at + voice.attack + (voice.hold ?? 0) + decay + 0.05;
    for (const [type, mult, gain] of voice.partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(env);
      osc.start(at);
      osc.stop(end);
    }
  });
}

/** A warm, slowly swelling pad (two detuned voices per note) that fades over a few seconds, centered. */
function playPad(ctx: BaseAudioContext, dest: AudioNode, midis: number[], when: number) {
  const env = ctx.createGain();
  const peak = 0.05 / Math.sqrt(midis.length);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(peak, when + 0.45);
  env.gain.exponentialRampToValueAtTime(0.0005, when + 4.5);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  env.connect(lp);
  lp.connect(dest);
  for (const midi of midis) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    for (const [type, cents] of [['sine', -5], ['triangle', 5]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(env);
      osc.start(when);
      osc.stop(when + 4.6);
    }
  }
}

export async function renderAudio(hits: NoteHit[], duration: number, instrument?: string): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const dest = createChain(ctx);
  for (const h of hits) playHit(ctx, dest, h, h.t, instrument);
  const buf = await ctx.startRendering();
  fadeOut(buf, 1.5);
  return buf;
}

function fadeOut(buf: AudioBuffer, seconds: number) {
  const n = Math.min(buf.length, Math.floor(seconds * buf.sampleRate));
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[buf.length - n + i] *= 1 - i / n;
  }
}
