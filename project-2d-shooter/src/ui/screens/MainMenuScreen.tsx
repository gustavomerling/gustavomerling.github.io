import { platform } from '@engine/platform/platform';
import { Menu } from '../components/Menu';

interface Props {
  onNewRun: () => void;
  onOptions: () => void;
}

export function MainMenuScreen({ onNewRun, onOptions }: Props) {
  return (
    <div className="screen main-menu">
      <header>
        <h1 className="logo small">LASANHA</h1>
        <p className="tagline">domingo, 21h47. no grupo do escritório, uma foto: a sua lasanha.</p>
      </header>
      <Menu
        items={[
          { id: 'new', label: 'Nova run', onSelect: onNewRun },
          { id: 'options', label: 'Opções', onSelect: onOptions },
          { id: 'quit', label: 'Sair', onSelect: () => platform.quit(), hidden: !platform.isDesktop },
        ]}
      />
      <footer className="footer">
        <span>v{__APP_VERSION__} · protótipo wireframe</span>
        <span>W/S navegar · Enter selecionar</span>
      </footer>
    </div>
  );
}
