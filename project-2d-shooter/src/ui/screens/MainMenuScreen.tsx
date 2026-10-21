import { platform } from '@engine/platform/platform';
import { useState } from 'react';
import { Controls } from '../components/Hud';
import { Menu } from '../components/Menu';

interface Props {
  onPlay: () => void;
}

export function MainMenuScreen({ onPlay }: Props) {
  const [controls, setControls] = useState(false);
  return (
    <div className="screen main-menu">
      <header>
        <h1 className="title">PROJECT SHOOTER 2D</h1>
        <p className="subtitle">prédios · becos · escritório armado</p>
      </header>
      {controls ? (
        <>
          <Controls />
          <Menu onBack={() => setControls(false)} items={[{ id: 'back', label: 'Voltar', onSelect: () => setControls(false) }]} />
        </>
      ) : (
        <Menu
          items={[
            { id: 'play', label: 'Jogar', onSelect: onPlay },
            { id: 'controls', label: 'Controles', onSelect: () => setControls(true) },
            { id: 'quit', label: 'Sair', onSelect: () => platform.quit(), hidden: !platform.isDesktop },
          ]}
        />
      )}
      <footer className="footer">
        <span>v{__APP_VERSION__}</span>
        <span>W/S navegar · Enter selecionar · F11 tela cheia</span>
      </footer>
    </div>
  );
}
