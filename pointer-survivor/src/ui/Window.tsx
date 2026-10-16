import type { CSSProperties, ReactNode } from 'react'
import type { IconName } from '../game/types'
import { useWindowFrame, WindowContext } from '../os/WindowContext'
import { Icon } from './Icon'
import { TitleGlyph } from './TitleGlyph'

interface Props {
  title: string
  icon?: IconName
  children: ReactNode
  /** Close [x] handler. Managed windows default to closing themselves. */
  onClose?: () => void
  /** Classic File/Edit/View menu bar (decorative). */
  menu?: string[]
  /** Status bar fields under the body. */
  status?: ReactNode[]
  flush?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Win2000 window chrome. Inside a ManagedWindow it becomes draggable/minimizable/maximizable;
 * anywhere else (modals, dialogs) it's a static frame.
 */
export function Window({ title, icon, children, onClose, menu, status, flush, className, style }: Props) {
  const frame = useWindowFrame()
  const close = onClose ?? frame?.close
  const inactive = frame ? !frame.active : false

  return (
    <section
      className={`window ${frame ? 'managed' : ''} ${inactive ? 'inactive' : ''} ${className ?? ''}`}
      style={style}
      role="dialog"
      aria-label={title}
    >
      <header
        className="title-bar"
        onPointerDown={frame?.startDrag}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) frame?.toggleMaximize()
        }}
      >
        {icon && <Icon name={icon} />}
        <span className="title-bar-text">{title}</span>
        <div className="title-bar-controls">
          <button className="title-btn" onClick={frame?.minimize} disabled={!frame} aria-label="Minimize" tabIndex={-1}>
            <TitleGlyph name="minimize" disabled={!frame} />
          </button>
          <button
            className="title-btn"
            onClick={frame?.toggleMaximize}
            disabled={!frame?.resizable}
            aria-label={frame?.maximized ? 'Restore' : 'Maximize'}
            tabIndex={-1}
          >
            <TitleGlyph name={frame?.maximized ? 'restore' : 'maximize'} disabled={!frame?.resizable} />
          </button>
          <button className="title-btn close" onClick={close} disabled={!close} aria-label="Close" tabIndex={-1}>
            <TitleGlyph name="close" disabled={!close} />
          </button>
        </div>
      </header>
      {menu && (
        <nav className="menu-bar" aria-hidden>
          {menu.map((m) => (
            <span key={m}>
              <u>{m[0]}</u>
              {m.slice(1)}
            </span>
          ))}
        </nav>
      )}
      {/* dialogs nested in this window must not inherit its frame controls */}
      <WindowContext.Provider value={null}>
        <div className={`window-body ${flush ? 'flush' : ''}`}>{children}</div>
        {status && (
          <footer className="status-bar">
            {status.map((s, i) => (
              <div key={i} className={`status-bar-field ${i > 0 ? 'fit' : ''}`}>
                {s}
              </div>
            ))}
          </footer>
        )}
      </WindowContext.Provider>
    </section>
  )
}
