import { useEffect } from 'react';
import { settingsStore, uiSound, useSettings } from '../services';
import type { Settings } from '../services';

interface Props {
  onBack: () => void;
}

type NumberKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

export function OptionsScreen({ onBack }: Props) {
  const settings = useSettings();
  const setNum = (key: NumberKey, value: number) => settingsStore.set((s) => ({ ...s, [key]: value }));
  const toggle = (key: BoolKey) => {
    uiSound.select();
    settingsStore.set((s) => ({ ...s, [key]: !s[key] }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      uiSound.back();
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const slider = (key: NumberKey, label: string) => (
    <label className="option-row">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings[key]}
        onChange={(e) => setNum(key, Number(e.target.value))}
        onMouseUp={() => uiSound.select()}
      />
      <span className="option-value">{Math.round(settings[key] * 100)}%</span>
    </label>
  );

  const check = (key: BoolKey, label: string) => (
    <button className="option-row option-toggle" onClick={() => toggle(key)}>
      <span>{label}</span>
      <span className="option-value">{settings[key] ? '[x]' : '[ ]'}</span>
    </button>
  );

  return (
    <div className="screen options">
      <h2>Opções</h2>
      <div className="options-list">
        {slider('masterVolume', 'Volume geral')}
        {slider('sfxVolume', 'Efeitos')}
        {slider('musicVolume', 'Música')}
        {check('fullscreen', 'Tela cheia (F11)')}
        {check('pixelPerfect', 'Escala inteira (pixel perfeito)')}
        {check('showDebug', 'Debug ao iniciar (F3)')}
      </div>
      <button
        className="menu-item is-active"
        onClick={() => {
          uiSound.back();
          onBack();
        }}
      >
        Voltar
      </button>
      <footer className="footer">
        <span>Esc voltar</span>
      </footer>
    </div>
  );
}
