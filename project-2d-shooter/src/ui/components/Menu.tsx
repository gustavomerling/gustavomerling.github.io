import { useEffect, useRef, useState, type ReactNode } from 'react';
import { initAudio, playSfx } from '../../game/audio';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** One line shown under the list while the item is selected. */
  description?: string;
  onSelect: () => void;
  hidden?: boolean;
  /** Current value of an option item, shown at the right with ‹ › arrows. */
  value?: string;
  /** Option items: A/D, ←/→, d-pad or a click on the arrows cycle the value (dir = -1 | 1). */
  onCycle?: (dir: -1 | 1) => void;
}

interface Props {
  items: MenuItem[];
  /** Called on Esc (or the gamepad's B). */
  onBack?: () => void;
  /** Item highlighted when the menu opens (e.g. the last mode played). */
  initialId?: string;
}

/** Seconds a held direction waits before repeating, then the repeat period. */
const REPEAT_DELAY = 0.38;
const REPEAT_EVERY = 0.11;
const STICK_DEADZONE = 0.55;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

/**
 * Vertical menu. Keyboard: W/S or arrows move (hold to repeat), Enter/Space pick, A/D or ←/→ change an
 * option, Esc goes back. Mouse: hover + click. Gamepad: d-pad or left stick, A/Start pick, B back.
 */
export function Menu({ items, onBack, initialId }: Props) {
  const visible = items.filter((i) => !i.hidden);
  const [index, setIndex] = useState(() => Math.max(0, visible.findIndex((i) => i.id === initialId)));
  const active = Math.min(index, visible.length - 1);
  const description = visible[active]?.description ?? '';

  // Latest values for the long-lived gamepad loop.
  const live = useRef({ visible, active, onBack });
  live.current = { visible, active, onBack };
  // A key press that opened this menu (e.g. Enter on "Voltar") is still bubbling to `window` when the
  // listener below is added; without this it would also pick the first item of the new menu.
  const mountedAt = useRef(performance.now());

  // Soft UI clicks: a tick when the highlight moves (not on open), a chirp on pick.
  const shownActive = useRef(active);
  useEffect(() => {
    initAudio();
    if (shownActive.current !== active) playSfx('ui.move');
    shownActive.current = active;
  }, [active]);

  useEffect(() => {
    const move = (d: number) => setIndex((i) => (Math.min(i, visible.length - 1) + d + visible.length) % visible.length);
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.timeStamp < mountedAt.current) return;
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
        const cycle = visible[active]?.onCycle;
        if (cycle) {
          e.preventDefault();
          cycle(code === 'KeyA' || code === 'ArrowLeft' ? -1 : 1);
          playSfx('ui.move');
        }
      } else if (e.repeat) {
        // Holding Enter/Esc must not fire twice (e.g. pick a mode and instantly pick again in the next menu).
      } else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
        e.preventDefault();
        playSfx('ui.select');
        visible[active]?.onSelect();
      } else if (code === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, active, onBack]);

  // Gamepad: polled every frame while the menu is mounted (the browser has no gamepad events for buttons).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    let raf = 0;
    let last = performance.now();
    // Buttons already down when the menu opened are ignored until released (the A that opened it).
    let prev: boolean[] | null = null;
    const held = { dir: '', time: 0, next: 0 };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const pad = [...navigator.getGamepads()].find((p) => p && p.connected);
      if (!pad) return;
      const down = pad.buttons.map((b) => b.pressed);
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      const was = prev ?? down;
      prev = down;
      const tapped = (i: number) => down[i] === true && !was[i];
      const { visible: v, active: a, onBack: back } = live.current;

      const dir =
        down[12] || ay < -STICK_DEADZONE ? 'up'
        : down[13] || ay > STICK_DEADZONE ? 'down'
        : down[14] || ax < -STICK_DEADZONE ? 'left'
        : down[15] || ax > STICK_DEADZONE ? 'right'
        : '';
      let fire = false;
      if (dir !== held.dir) {
        held.dir = dir;
        held.time = 0;
        held.next = REPEAT_DELAY;
        fire = dir !== '';
      } else if (dir) {
        held.time += dt;
        if (held.time >= held.next) {
          held.next += REPEAT_EVERY;
          fire = true;
        }
      }
      if (fire && v.length > 0) {
        if (dir === 'up') setIndex((i) => (Math.min(i, v.length - 1) - 1 + v.length) % v.length);
        else if (dir === 'down') setIndex((i) => (Math.min(i, v.length - 1) + 1) % v.length);
        else v[a]?.onCycle?.(dir === 'left' ? -1 : 1);
      }
      if (tapped(0) || tapped(9)) {
        playSfx('ui.select');
        v[a]?.onSelect();
      }
      else if (tapped(1)) back?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="menu-wrap">
      <ul className="menu" role="menu">
        {visible.map((item, i) => (
          <li key={item.id} role="none">
            <button
              role="menuitem"
              className={i === active ? 'menu-item is-active' : 'menu-item'}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                playSfx('ui.select');
                item.onSelect();
              }}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              {item.label}
              {item.value !== undefined && (
                <span className="menu-value">
                  {item.onCycle && (
                    <span
                      className="menu-arrow"
                      aria-label="anterior"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onCycle?.(-1);
                      }}
                    >
                      ‹
                    </span>
                  )}
                  <span className="menu-value-text">{item.value}</span>
                  {item.onCycle && (
                    <span
                      className="menu-arrow"
                      aria-label="próximo"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onCycle?.(1);
                      }}
                    >
                      ›
                    </span>
                  )}
                </span>
              )}
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
