import { useEffect, useState, type ReactNode, type Ref } from 'react'
import type { IconName } from '../game/types'
import { Icon } from './Icon'
import { StartMenu, type StartMenuEntry } from './StartMenu'

export interface TaskItem {
  id: string
  label: string
  icon: IconName
  active: boolean
}

interface Props {
  /** desktop icons (left column) */
  icons?: ReactNode
  /** windows layer */
  children: ReactNode
  areaRef?: Ref<HTMLDivElement>
  tasks: TaskItem[]
  onTask(id: string): void
  startItems: StartMenuEntry[]
  tray?: ReactNode
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  return <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
}

/** Teal desktop + Win2000 taskbar with Start menu. */
export function Desktop({ icons, children, areaRef, tasks, onTask, startItems, tray }: Props) {
  const [startOpen, setStartOpen] = useState(false)

  return (
    <div className="desktop">
      <main className="desktop-area" ref={areaRef}>
        <div className="desktop-icons">{icons}</div>
        {children}
      </main>
      {startOpen && <StartMenu items={startItems} onClose={() => setStartOpen(false)} />}
      <footer className="taskbar">
        <button
          type="button"
          className={`btn start-btn ${startOpen ? 'pressed' : ''}`}
          onClick={() => setStartOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={startOpen}
        >
          <Icon name="cursor" />
          Start
        </button>
        <div className="taskbar-sep" />
        <div className="tasks">
          {tasks.map((t) => (
            <button key={t.id} type="button" className={`btn task ${t.active ? 'active' : ''}`} onClick={() => onTask(t.id)}>
              <Icon name={t.icon} />
              <span className="task-label">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="tray">
          {tray}
          <Clock />
        </div>
      </footer>
    </div>
  )
}

interface DesktopIconProps {
  icon: IconName
  label: string
  onOpen(): void
}

/** Opens on double-click (mouse) or single tap (touch / pen). */
export function DesktopIcon({ icon, label, onOpen }: DesktopIconProps) {
  const [selected, setSelected] = useState(false)
  return (
    <button
      type="button"
      className={`desktop-icon ${selected ? 'selected' : ''}`}
      onPointerUp={(e) => {
        setSelected(true)
        if (e.pointerType !== 'mouse') onOpen()
      }}
      onDoubleClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onBlur={() => setSelected(false)}
    >
      <Icon name={icon} size={32} />
      <span>{label}</span>
    </button>
  )
}
