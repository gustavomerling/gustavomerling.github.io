import { platform } from '@engine/platform/platform';
import { useState } from 'react';
import { RUN_MODES, type RunModeId } from '@game/content/modes/catalog';
import { Controls } from '../components/Hud';
import { Logo } from '../components/Logo';
import { Menu, Panel } from '../components/Menu';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { MENU_ICONS } from '../components/MenuIcons';

interface Props {
  onPlay: (mode: RunModeId) => void;
}

export function MainMenuScreen({ onPlay }: Props) {
  const [controls, setControls] = useState(false);

  return (
    <div className="screen main-menu">
      <MenuBackdrop />
      <div className="menu-stage">
        <div className="menu-brand">
          <Logo />
          <p className="tagline">prédios · becos · tiro com mira</p>
        </div>
        <div className="menu-side">
          {controls ? (
            <>
              <Panel kicker="Ajuda" title="Controles">
                <Controls />
              </Panel>
              <Menu
                onBack={() => setControls(false)}
                items={[
                  { id: 'back', label: 'Voltar', description: 'Volta ao menu principal (Esc).', onSelect: () => setControls(false) },
                ]}
              />
            </>
          ) : (
            <div className="menu-card">
              <div className="menu-card-head">
                <span>Menu</span>
                <span>v{__APP_VERSION__}</span>
              </div>
              <Menu
                items={[
                  ...RUN_MODES.all().map((mode) => ({
                    id: mode.id,
                    label: mode.name,
                    icon: MENU_ICONS[mode.id],
                    description: mode.description,
                    onSelect: () => onPlay(mode.id),
                  })),
                  {
                    id: 'controls',
                    label: 'Controles',
                    icon: MENU_ICONS.controls,
                    description: 'Teclas, mira e atalhos de depuração.',
                    onSelect: () => setControls(true),
                  },
                  {
                    id: 'quit',
                    label: 'Sair',
                    icon: MENU_ICONS.quit,
                    description: 'Fecha o jogo.',
                    onSelect: () => platform.quit(),
                    hidden: !platform.isDesktop,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      <footer className="footer">
        <span>
          <kbd>W</kbd>
          <kbd>S</kbd> navegar · <kbd>Enter</kbd> selecionar
        </span>
        <span>
          <kbd>F11</kbd> tela cheia · <kbd>Esc</kbd> voltar
        </span>
      </footer>
    </div>
  );
}
