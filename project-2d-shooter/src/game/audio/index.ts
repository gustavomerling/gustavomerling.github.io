import { Synth, type PlayOptions } from '@engine/audio/synth';
import type { EventBus } from '@engine/core/events';
import type { GameEvents } from '../events';
import { settings } from '../prefs';
import { SOUNDS, type SfxId } from './sounds';

export type { SfxId } from './sounds';
export { createAudioSystem } from './system';

const synth = new Synth();

/** Plays one sound now, honouring Opções (settings.volume / settings.sfx). No-op without WebAudio. */
export function playSfx(id: SfxId, opts?: PlayOptions): void {
  if (!synth.available) return;
  const s = settings();
  synth.setVolume(s.volume);
  synth.setEnabled(s.sfx);
  synth.play(id, SOUNDS[id], opts);
}

/** Starts listening for the first user gesture to create the AudioContext (autoplay policy). */
export function initAudio(): void {
  synth.unlockOnGesture();
}

/** Plays every `sfx` event from the game. Returns the unsubscribe. */
export function attachAudio(bus: EventBus<GameEvents>): () => void {
  initAudio();
  const offs = [bus.on('sfx', (e) => playSfx(e.id, e)), bus.on('level:exit', () => playSfx('exit'))];
  return () => offs.forEach((off) => off());
}
