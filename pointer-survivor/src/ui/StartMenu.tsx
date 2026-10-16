import { useEffect, useRef } from 'react'
import type { IconName } from '../game/types'
import { Icon } from './Icon'

export type StartMenuEntry = { label: string; icon: IconName; onSelect(): void; bold?: boolean } | 'separator'

interface Props {
  items: StartMenuEntry[]
  onClose(): void
}

/** Win2000 Start menu with the vertical product banner. */
export function StartMenu({ items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!ref.current?.contains(t) && !t.closest('.start-btn')) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="start-menu" ref={ref} role="menu">
      <div className="start-banner" aria-hidden>
        <span>
          <b>Pointer Survivor</b> 2000
        </span>
      </div>
      <div className="start-items">
        {items.map((item, i) =>
          item === 'separator' ? (
            <div key={i} className="start-sep" />
          ) : (
            <button
              key={item.label}
              role="menuitem"
              className="start-item"
              onClick={() => {
                onClose()
                item.onSelect()
              }}
            >
              <Icon name={item.icon} size={24} />
              <span style={{ fontWeight: item.bold ? 'bold' : undefined }}>{item.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  )
}
