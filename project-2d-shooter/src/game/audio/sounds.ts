import type { SynthSound } from '@engine/audio/synth';

/**
 * Every sound in the game, synthesized (see engine/audio/synth.ts). To tune one: change its
 * layers here. `tone` = oscillator (wave, freq -> freqEnd sweep); `noise` = filtered white noise
 * (filter type, freq -> freqEnd sweep). `decay` is the length in seconds, `gain` the level.
 */
export type SfxId =
  | 'shot.pistol'
  | 'shot.uzi'
  | 'shot.smg'
  | 'shot.rifle'
  | 'shot.sniper'
  | 'shot.shotgun'
  | 'shot.bow'
  | 'reload.start'
  | 'reload.done'
  | 'empty'
  | 'impact.wall'
  | 'impact.flesh'
  | 'headshot'
  | 'hurt'
  | 'step'
  | 'land'
  | 'swing'
  | 'block'
  | 'parry'
  | 'guardBreak'
  | 'groan'
  | 'grab'
  | 'shriek'
  | 'burst'
  | 'horde'
  | 'death.enemy'
  | 'death.player'
  | 'exit'
  | 'ui.move'
  | 'ui.select';

export const SOUNDS: Record<SfxId, SynthSound> = {
  // --- guns: noise blast (body) + falling sine (thump) [+ high crack] ---
  'shot.pistol': {
    cooldown: 0.04,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 1900, freqEnd: 700, q: 0.8, decay: 0.12, gain: 0.7 },
      { kind: 'tone', wave: 'sine', freq: 170, freqEnd: 55, decay: 0.1, gain: 0.55 },
      { kind: 'noise', filter: 'highpass', freq: 5000, decay: 0.02, gain: 0.25 },
    ],
  },
  'shot.uzi': {
    cooldown: 0.03,
    gain: 0.75,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 2600, freqEnd: 1200, q: 1.2, decay: 0.06, gain: 0.6 },
      { kind: 'tone', wave: 'square', freq: 240, freqEnd: 90, lowpass: 1500, decay: 0.04, gain: 0.18 },
    ],
  },
  'shot.smg': {
    cooldown: 0.03,
    gain: 0.75,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 1800, freqEnd: 800, q: 1, decay: 0.07, gain: 0.6 },
      { kind: 'tone', wave: 'sine', freq: 150, freqEnd: 60, decay: 0.06, gain: 0.35 },
    ],
  },
  'shot.rifle': {
    cooldown: 0.04,
    layers: [
      { kind: 'noise', filter: 'highpass', freq: 3500, decay: 0.03, gain: 0.35 },
      { kind: 'noise', filter: 'bandpass', freq: 1300, freqEnd: 400, q: 0.7, decay: 0.17, gain: 0.8 },
      { kind: 'tone', wave: 'sine', freq: 130, freqEnd: 45, decay: 0.14, gain: 0.7 },
    ],
  },
  'shot.sniper': {
    cooldown: 0.1,
    layers: [
      { kind: 'noise', filter: 'highpass', freq: 3000, decay: 0.04, gain: 0.45 },
      { kind: 'noise', filter: 'lowpass', freq: 2000, freqEnd: 200, decay: 0.55, gain: 0.85 },
      { kind: 'tone', wave: 'sine', freq: 110, freqEnd: 35, decay: 0.3, gain: 0.85 },
    ],
  },
  'shot.shotgun': {
    cooldown: 0.08,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 2200, freqEnd: 250, decay: 0.35, gain: 1 },
      { kind: 'tone', wave: 'sine', freq: 95, freqEnd: 38, decay: 0.25, gain: 0.85 },
      // pump-ish clack after the blast
      { kind: 'noise', filter: 'bandpass', freq: 2500, q: 3, decay: 0.03, gain: 0.25, delay: 0.32 },
      { kind: 'noise', filter: 'bandpass', freq: 1800, q: 3, decay: 0.03, gain: 0.25, delay: 0.42 },
    ],
  },
  'shot.bow': {
    cooldown: 0.08,
    pitchJitter: 0.06,
    layers: [
      { kind: 'tone', wave: 'triangle', freq: 210, freqEnd: 170, decay: 0.22, gain: 0.35 },
      { kind: 'noise', filter: 'bandpass', freq: 900, freqEnd: 2500, q: 1.5, attack: 0.02, decay: 0.16, gain: 0.25 },
    ],
  },
  // --- gun handling ---
  'reload.start': {
    cooldown: 0.1,
    gain: 0.6,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 3200, q: 4, decay: 0.025, gain: 0.5 },
      { kind: 'tone', wave: 'square', freq: 900, lowpass: 2500, decay: 0.02, gain: 0.12, delay: 0.07 },
      { kind: 'noise', filter: 'bandpass', freq: 2200, q: 4, decay: 0.03, gain: 0.45, delay: 0.08 },
    ],
  },
  'reload.done': {
    cooldown: 0.1,
    gain: 0.6,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 1800, q: 3, decay: 0.03, gain: 0.5 },
      { kind: 'tone', wave: 'square', freq: 1200, lowpass: 3000, decay: 0.025, gain: 0.15, delay: 0.05 },
      { kind: 'noise', filter: 'bandpass', freq: 3000, q: 4, decay: 0.025, gain: 0.5, delay: 0.05 },
    ],
  },
  empty: {
    cooldown: 0.1,
    gain: 0.5,
    layers: [{ kind: 'tone', wave: 'square', freq: 1700, lowpass: 4000, decay: 0.015, gain: 0.3 }, { kind: 'noise', filter: 'highpass', freq: 4000, decay: 0.015, gain: 0.3 }],
  },
  // --- hits ---
  'impact.wall': {
    cooldown: 0.03,
    gain: 0.45,
    pitchJitter: 0.15,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 3000, q: 2, decay: 0.04, gain: 0.5 },
      { kind: 'tone', wave: 'triangle', freq: 1100, freqEnd: 500, decay: 0.04, gain: 0.15 },
    ],
  },
  'impact.flesh': {
    cooldown: 0.03,
    gain: 0.6,
    pitchJitter: 0.1,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 700, freqEnd: 200, decay: 0.08, gain: 0.6 },
      { kind: 'tone', wave: 'sine', freq: 120, freqEnd: 60, decay: 0.07, gain: 0.5 },
    ],
  },
  headshot: {
    cooldown: 0.06,
    gain: 0.7,
    layers: [
      { kind: 'noise', filter: 'bandpass', freq: 1400, freqEnd: 500, q: 1.2, decay: 0.1, gain: 0.6 },
      { kind: 'tone', wave: 'triangle', freq: 1900, freqEnd: 1500, decay: 0.12, gain: 0.25, delay: 0.01 },
    ],
  },
  hurt: {
    cooldown: 0.15,
    layers: [
      { kind: 'tone', wave: 'sawtooth', freq: 260, freqEnd: 120, lowpass: 1200, decay: 0.18, gain: 0.35 },
      { kind: 'noise', filter: 'lowpass', freq: 900, decay: 0.1, gain: 0.45 },
    ],
  },
  // --- movement (quiet) ---
  step: {
    cooldown: 0.12,
    gain: 0.18,
    pitchJitter: 0.15,
    layers: [{ kind: 'noise', filter: 'lowpass', freq: 450, freqEnd: 150, decay: 0.05, gain: 1 }],
  },
  land: {
    cooldown: 0.15,
    gain: 0.35,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 380, freqEnd: 120, decay: 0.1, gain: 1 },
      { kind: 'tone', wave: 'sine', freq: 85, freqEnd: 50, decay: 0.08, gain: 0.6 },
    ],
  },
  // --- melee ---
  swing: {
    cooldown: 0.08,
    gain: 0.5,
    pitchJitter: 0.1,
    layers: [{ kind: 'noise', filter: 'bandpass', freq: 700, freqEnd: 2600, q: 2, attack: 0.04, decay: 0.13, gain: 0.8 }],
  },
  block: {
    cooldown: 0.06,
    layers: [
      { kind: 'tone', wave: 'square', freq: 320, freqEnd: 260, lowpass: 1800, decay: 0.08, gain: 0.25 },
      { kind: 'noise', filter: 'bandpass', freq: 1300, q: 1.5, decay: 0.09, gain: 0.55 },
    ],
  },
  parry: {
    cooldown: 0.1,
    pitchJitter: 0.02,
    layers: [
      { kind: 'tone', wave: 'sine', freq: 1760, decay: 0.45, gain: 0.3 },
      { kind: 'tone', wave: 'sine', freq: 2640, decay: 0.3, gain: 0.15 },
      { kind: 'noise', filter: 'highpass', freq: 5000, decay: 0.03, gain: 0.3 },
    ],
  },
  guardBreak: {
    cooldown: 0.2,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 1500, freqEnd: 150, decay: 0.3, gain: 0.8 },
      { kind: 'tone', wave: 'sawtooth', freq: 220, freqEnd: 60, lowpass: 1000, decay: 0.3, gain: 0.35 },
    ],
  },
  // --- zombies ---
  groan: {
    cooldown: 0.8,
    gain: 0.35,
    pitchJitter: 0.15,
    layers: [
      { kind: 'tone', wave: 'sawtooth', freq: 95, freqEnd: 70, lowpass: 450, vibrato: 4, attack: 0.15, decay: 0.7, gain: 0.8 },
      { kind: 'noise', filter: 'bandpass', freq: 400, q: 2, attack: 0.1, decay: 0.6, gain: 0.25 },
    ],
  },
  grab: {
    cooldown: 0.3,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 800, decay: 0.2, gain: 0.6 },
      { kind: 'tone', wave: 'sawtooth', freq: 140, freqEnd: 90, lowpass: 700, vibrato: 8, decay: 0.35, gain: 0.45 },
    ],
  },
  shriek: {
    cooldown: 0.3,
    gain: 0.4,
    pitchJitter: 0.1,
    layers: [
      { kind: 'tone', wave: 'sawtooth', freq: 650, freqEnd: 1250, lowpass: 3000, vibrato: 25, attack: 0.05, decay: 0.45, gain: 0.6 },
      { kind: 'noise', filter: 'bandpass', freq: 2500, q: 2, attack: 0.05, decay: 0.4, gain: 0.3 },
    ],
  },
  burst: {
    cooldown: 0.1,
    layers: [
      { kind: 'noise', filter: 'lowpass', freq: 1200, freqEnd: 90, decay: 0.6, gain: 1 },
      { kind: 'tone', wave: 'sine', freq: 75, freqEnd: 30, decay: 0.5, gain: 0.9 },
      { kind: 'noise', filter: 'bandpass', freq: 500, q: 1, decay: 0.25, gain: 0.4, delay: 0.05 },
    ],
  },
  horde: {
    cooldown: 2,
    pitchJitter: 0,
    layers: [
      { kind: 'tone', wave: 'sawtooth', freq: 55, lowpass: 300, attack: 0.3, decay: 1.6, gain: 0.5 },
      { kind: 'tone', wave: 'triangle', freq: 220, freqEnd: 196, decay: 0.45, gain: 0.3 },
      { kind: 'tone', wave: 'triangle', freq: 220, freqEnd: 147, decay: 0.8, gain: 0.3, delay: 0.5 },
    ],
  },
  // --- outcomes ---
  'death.enemy': {
    cooldown: 0.05,
    gain: 0.4,
    layers: [{ kind: 'noise', filter: 'lowpass', freq: 300, freqEnd: 90, decay: 0.18, gain: 1 }],
  },
  'death.player': {
    cooldown: 1,
    pitchJitter: 0,
    layers: [
      { kind: 'tone', wave: 'sine', freq: 400, freqEnd: 60, decay: 1.1, gain: 0.45 },
      { kind: 'noise', filter: 'lowpass', freq: 500, freqEnd: 80, decay: 0.7, gain: 0.5 },
    ],
  },
  exit: {
    cooldown: 1,
    pitchJitter: 0,
    gain: 0.5,
    layers: [
      { kind: 'tone', wave: 'triangle', freq: 523, decay: 0.15, gain: 0.5 },
      { kind: 'tone', wave: 'triangle', freq: 659, decay: 0.15, gain: 0.5, delay: 0.08 },
      { kind: 'tone', wave: 'triangle', freq: 784, decay: 0.35, gain: 0.5, delay: 0.16 },
    ],
  },
  // --- menu ---
  'ui.move': {
    cooldown: 0.03,
    pitchJitter: 0,
    gain: 0.18,
    layers: [{ kind: 'tone', wave: 'sine', freq: 880, decay: 0.035, gain: 1 }],
  },
  'ui.select': {
    cooldown: 0.08,
    pitchJitter: 0,
    gain: 0.22,
    layers: [{ kind: 'tone', wave: 'sine', freq: 660, freqEnd: 990, decay: 0.09, gain: 1 }],
  },
};

/** Gunshot sound per weapon model id (unknown models fall back to the pistol). */
export const SHOT_BY_MODEL: Record<string, SfxId> = {
  glock: 'shot.pistol',
  uzi: 'shot.uzi',
  bizon: 'shot.smg',
  ak47: 'shot.rifle',
  sniper: 'shot.sniper',
  shotgun: 'shot.shotgun',
  shortbow: 'shot.bow',
};
