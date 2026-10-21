import { useEffect, useState, type ReactNode } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** One line shown under the list while the item is selected. */
  description?: string;
  onSelect: () => void;
  hidden?: boolean;
}

interface Props {
  items: MenuItem[];
  /** Called on Esc. */
  onBack?: () => void;
}

/** Vertical menu: W/S or arrows to move, Enter/Space to pick, mouse hover/click. */
export function Menu({ items, onBack }: Props) {
  const visible = items.filter((i) => !i.hidden);
  const [index, setIndex] = useState(0);
  const active = Math.min(index, visible.length - 1);
  const description = visible[active]?.description ?? '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIndex((i) => (i - 1 + visible.length) % visible.length);
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        setIndex((i) => (i + 1) % visible.length);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        visible[active]?.onSelect();
      } else if (e.code === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, active, onBack]);

  return (
    <div className="menu-wrap">
      <ul className="menu" role="menu">
        {visible.map((item, i) => (
          <li key={item.id} role="none">
            <button
              role="menuitem"
              className={i === active ? 'menu-item is-active' : 'menu-item'}
              onMouseEnter={() => setIndex(i)}
              onClick={() => item.onSelect()}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="menu-hint" aria-live="polite">
        {description}
      </p>
    </div>
  );
}

interface PanelProps {
  /** Small label above the title, e.g. the mode's tag. */
  kicker?: string;
  title: string;
  tone?: 'default' | 'accent' | 'danger';
  children: ReactNode;
}

/** Framed box for the overlays (pause, death, exit, controls). */
export function Panel({ kicker, title, tone = 'default', children }: PanelProps) {
  return (
    <section className={`panel panel-${tone}`}>
      <header className="panel-head">
        {kicker && <span className="panel-kicker">{kicker}</span>}
        <h2 className="panel-title">{title}</h2>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
