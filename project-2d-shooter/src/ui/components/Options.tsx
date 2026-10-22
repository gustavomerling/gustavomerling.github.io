import { useState } from 'react';
import { prefs, type Settings } from '@game/prefs';
import { Menu, type MenuItem } from './Menu';

/** Volume steps for ‹ ›: 0..100% in tens. */
const VOLUME_STEP = 0.1;

const onOff = (v: boolean) => (v ? 'Ligado' : 'Desligado');

/**
 * "Opções": switches stored in `prefs().settings` (read by effects and sound every frame, so changes
 * apply immediately, even from the pause menu). A/D or ←/→ (or Enter) change the value; Esc goes back.
 */
export function OptionsMenu({ onBack }: { onBack: () => void }) {
  const store = prefs();
  const [s, setS] = useState<Settings>(() => store.get().settings);
  const set = (change: Partial<Settings>) => setS(store.update((p) => ({ settings: { ...p.settings, ...change } })).settings);
  const toggle = (key: 'shake' | 'particles' | 'hitstop' | 'sfx') => () => set({ [key]: !s[key] });
  const stepVolume = (dir: -1 | 1) => {
    const next = Math.round((s.volume + dir * VOLUME_STEP) * 10) / 10;
    set({ volume: Math.min(1, Math.max(0, next)) });
  };

  const items: MenuItem[] = [
    {
      id: 'volume',
      label: 'Volume',
      value: `${Math.round(s.volume * 100)}%`,
      description: 'Volume geral do jogo. A/D ou ←/→ mudam de 10 em 10.',
      onCycle: stepVolume,
      onSelect: () => set({ volume: s.volume >= 1 ? 0 : Math.min(1, Math.round((s.volume + VOLUME_STEP) * 10) / 10) }),
    },
    {
      id: 'sfx',
      label: 'Efeitos sonoros',
      value: onOff(s.sfx),
      description: 'Tiros, impactos, passos e golpes.',
      onCycle: toggle('sfx'),
      onSelect: toggle('sfx'),
    },
    {
      id: 'shake',
      label: 'Tremor de tela',
      value: onOff(s.shake),
      description: 'A câmera treme em tiros, explosões e golpes fortes.',
      onCycle: toggle('shake'),
      onSelect: toggle('shake'),
    },
    {
      id: 'hitstop',
      label: 'Pausa no impacto',
      value: onOff(s.hitstop),
      description: 'Congela o jogo por um instante quando um golpe acerta.',
      onCycle: toggle('hitstop'),
      onSelect: toggle('hitstop'),
    },
    {
      id: 'particles',
      label: 'Partículas',
      value: onOff(s.particles),
      description: 'Faíscas, fumaça, poeira, sangue e destroços.',
      onCycle: toggle('particles'),
      onSelect: toggle('particles'),
    },
    { id: 'back', label: 'Voltar', description: 'Volta ao menu anterior (Esc).', onSelect: onBack },
  ];
  return <Menu items={items} onBack={onBack} />;
}
