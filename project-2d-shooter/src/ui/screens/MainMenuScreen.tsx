import { platform } from '@engine/platform/platform';
import { Menu } from '../components/Menu';

interface Props {
  onPlay: () => void;
}

export function MainMenuScreen({ onPlay }: Props) {
  return (
    <div className="screen main-menu">
      <h1 className="title">PROJECT SHOOTER 2D</h1>
      <Menu
        items={[
          { id: 'play', label: 'Jogar', onSelect: onPlay },
          { id: 'quit', label: 'Sair', onSelect: () => platform.quit(), hidden: !platform.isDesktop },
        ]}
      />
      <footer className="footer">
        <span>v{__APP_VERSION__}</span>
        <span>W/S navegar · Enter selecionar · F11 tela cheia</span>
      </footer>
    </div>
  );
}
