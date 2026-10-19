import { AudioMixer } from '@engine/audio/audio';
import { platform } from '@engine/platform/platform';
import { defaultBackend, StoredDocument } from '@engine/storage/storage';
import { createStore, useStore } from './store';

/** App-wide singletons shared by menus and the game session. */

export const audio = new AudioMixer();

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  fullscreen: boolean;
  /** Whole-number upscaling only (pixel perfect, more black borders). */
  pixelPerfect: boolean;
  showDebug: boolean;
}

const settingsDoc = new StoredDocument<Settings>(defaultBackend(), 'lasanha.settings', 1, () => ({
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.7,
  fullscreen: false,
  pixelPerfect: false,
  showDebug: false,
}));

export const settingsStore = createStore<Settings>(settingsDoc.load());

export const useSettings = (): Settings => useStore(settingsStore);

/** Persist + apply side effects whenever settings change. */
settingsStore.subscribe(() => {
  const s = settingsStore.get();
  settingsDoc.save(s);
  applySettings(s);
});

export function applySettings(s: Settings): void {
  audio.setVolumes({ master: s.masterVolume, sfx: s.sfxVolume, music: s.musicVolume });
  void platform.setFullscreen(s.fullscreen);
}

/** UI feedback sounds (placeholder synth until real SFX exist). */
export const uiSound = {
  move: () => audio.beep(520, 0.03),
  select: () => audio.beep(880, 0.06),
  back: () => audio.beep(330, 0.05),
};
