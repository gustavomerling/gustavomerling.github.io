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
  return input;
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
