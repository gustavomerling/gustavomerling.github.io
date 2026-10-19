import { useEffect, useState } from 'react';
import { uiSound } from '../services';

export interface MenuItem {
  id: string;
  label: string;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setIndex((i) => (i - 1 + visible.length) % visible.length);
        uiSound.move();
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        setIndex((i) => (i + 1) % visible.length);
        uiSound.move();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        uiSound.select();
        visible[index]?.onSelect();
      } else if (e.code === 'Escape' && onBack) {
        uiSound.back();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, index, onBack]);

  return (
    <ul className="menu" role="menu">
      {visible.map((item, i) => (
        <li key={item.id} role="none">
          <button
            role="menuitem"
            className={i === index ? 'menu-item is-active' : 'menu-item'}
            onMouseEnter={() => {
              if (i !== index) uiSound.move();
              setIndex(i);
            }}
            onClick={() => {
              uiSound.select();
              item.onSelect();
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
