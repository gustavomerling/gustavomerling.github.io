import type { AudioMixer } from '@engine/audio/audio';
import type { WeaponClass } from '../content/weapons/types';

/**
 * Synthesized sound effects (noise + oscillators) until real samples exist.
 * `timeScale` pitches everything down in bullet time. Small random pitch variation keeps
 * repeated shots from sounding robotic.
 */
const vary = (amount = 0.08) => 1 + (Math.random() * 2 - 1) * amount;
const slow = (timeScale: number) => 0.55 + 0.45 * timeScale;

const GUN: Record<WeaponClass, { freq: number; dur: number; thump: number; vol: number }> = {
  pistol: { freq: 2600, dur: 0.12, thump: 140, vol: 0.32 },
  smg: { freq: 3200, dur: 0.08, thump: 170, vol: 0.26 },
  rifle: { freq: 1800, dur: 0.2, thump: 90, vol: 0.4 },
};

export function createSfx(audio: AudioMixer) {
  return {
    gunshot(weaponClass: WeaponClass, silenced: boolean, isPlayer: boolean, timeScale: number): void {
      const g = GUN[weaponClass];
      const rate = slow(timeScale) * vary();
      const vol = g.vol * (isPlayer ? 1 : 0.55);
      if (silenced) {
        audio.noise({ duration: 0.07, volume: vol * 0.5, filter: 'bandpass', freq: 1400, q: 1.2, rate });
        return;
      }
      audio.noise({ duration: g.dur, volume: vol, filter: 'lowpass', freq: g.freq, rate, thump: g.thump });
      // High crack on top.
      audio.noise({ duration: 0.03, volume: vol * 0.6, filter: 'highpass', freq: 4000, rate });
    },
    dryFire(): void {
      audio.beep(1400, 0.02, 'sfx', 'square', 0.06);
    },
    reloadStart(): void {
      audio.noise({ duration: 0.05, volume: 0.12, filter: 'bandpass', freq: 900, q: 4 });
    },
    reloadEnd(): void {
      audio.noise({ duration: 0.04, volume: 0.15, filter: 'bandpass', freq: 1600, q: 5 });
      audio.beep(880, 0.03, 'sfx', 'square', 0.04);
    },
    wallHit(timeScale: number): void {
      audio.noise({ duration: 0.04, volume: 0.08, filter: 'highpass', freq: 3000, rate: slow(timeScale) * vary(0.2) });
    },
    ricochet(timeScale: number): void {
      audio.beep(2400 * slow(timeScale) * vary(0.15), 0.09, 'sfx', 'triangle', 0.05);
    },
    bodyHit(head: boolean, timeScale: number): void {
      audio.noise({ duration: 0.06, volume: 0.18, filter: 'lowpass', freq: 600, rate: slow(timeScale) * vary(), thump: 70 });
      if (head) audio.beep(1500, 0.05, 'sfx', 'square', 0.07);
    },
    playerHurt(): void {
      audio.noise({ duration: 0.1, volume: 0.25, filter: 'lowpass', freq: 500, thump: 60 });
    },
    explosion(timeScale: number): void {
      audio.noise({ duration: 0.8, volume: 0.5, filter: 'lowpass', freq: 700, rate: slow(timeScale), thump: 55 });
    },
    flashbang(): void {
      audio.noise({ duration: 0.3, volume: 0.3, filter: 'highpass', freq: 2500 });
      audio.beep(3200, 1.2, 'sfx', 'sine', 0.05);
    },
    breakWood(): void {
      audio.noise({ duration: 0.18, volume: 0.25, filter: 'bandpass', freq: 500, q: 1.5, rate: vary(0.15) });
    },
    punch(): void {
      audio.noise({ duration: 0.07, volume: 0.25, filter: 'lowpass', freq: 400, thump: 90 });
    },
    whoosh(): void {
      audio.noise({ duration: 0.12, volume: 0.08, filter: 'bandpass', freq: 800, q: 0.8 });
    },
    pickup(kind: 'health' | 'money' | 'ammo' | 'weapon'): void {
      const f = { health: 660, money: 1320, ammo: 880, weapon: 520 }[kind];
      audio.beep(f, 0.05, 'sfx', 'square', 0.06);
      audio.beep(f * 1.5, 0.06, 'sfx', 'square', 0.04);
    },
    slowmo(on: boolean): void {
      audio.beep(on ? 220 : 440, 0.12, 'sfx', 'triangle');
    },
    switchWeapon(): void {
      audio.beep(660, 0.04);
    },
  };
}

export type Sfx = ReturnType<typeof createSfx>;
