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

export function playHit(ctx: BaseAudioContext, dest: AudioNode, hit: NoteHit, when: number) {
  if (hit.click) return playClick(ctx, dest, hit, when);
  for (const midi of hit.midis) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const bass = midi < 52;
    const decay = bass ? 2.6 : 1.8;
    const peak = (bass ? 0.2 : 0.16) * hit.vel / Math.sqrt(hit.midis.length);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0008, when + decay);
    // A gentle low-pass keeps the timbre round.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, freq * 6);
    env.connect(lp);
    lp.connect(dest);

    const partials: [OscillatorType, number, number][] = [
      ['sine', 1, 1],
      ['triangle', 1, 0.35],
      ['sine', 2, 0.18],
      ['sine', 3, 0.05],
    ];
    for (const [type, mult, gain] of partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(env);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  }
}

export async function renderAudio(hits: NoteHit[], duration: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const dest = createChain(ctx);
  for (const h of hits) playHit(ctx, dest, h, h.t);
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
