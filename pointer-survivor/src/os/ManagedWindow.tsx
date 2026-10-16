import { useMemo, useRef, type PointerEvent, type ReactNode } from 'react'
import { APPS } from './apps'
import type { Area, WindowManager, WinState } from './useWindowManager'
import { WindowContext, type WindowFrameControls } from './WindowContext'

interface Props {
  win: WinState
  wm: WindowManager
  area: Area
  children: ReactNode
}

/** Keep at least this much of a dragged window on screen so it can be grabbed back. */
const GRAB_MARGIN = 80

/** Positions one app window on the desktop and wires its frame buttons. Stays mounted while minimized. */
export function ManagedWindow({ win, wm, area, children }: Props) {
  const meta = APPS[win.id]
  const slotRef = useRef<HTMLDivElement>(null)
  const width = Math.min(meta.width, area.width)
  const height = meta.height ? Math.min(meta.height, area.height) : undefined

  const controls = useMemo<WindowFrameControls>(
    () => ({
      active: wm.activeId === win.id,
      maximized: win.maximized,
      resizable: meta.resizable !== false,
      close: () => wm.close(win.id),
      minimize: () => wm.minimize(win.id),
      toggleMaximize: () => meta.resizable !== false && wm.toggleMaximize(win.id),
      startDrag: (e: PointerEvent<HTMLElement>) => {
        if (win.maximized || e.button !== 0) return
        if ((e.target as HTMLElement).closest('button')) return
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startY = e.clientY
        const { x, y } = win
        const onMove = (ev: globalThis.PointerEvent) => {
          wm.move(win.id, x + ev.clientX - startX, y + ev.clientY - startY)
        }
        const onUp = () => {
          el.removeEventListener('pointermove', onMove)
          el.removeEventListener('pointerup', onUp)
          el.removeEventListener('pointercancel', onUp)
        }
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerup', onUp)
        el.addEventListener('pointercancel', onUp)
      },
    }),
    [wm, win, meta.resizable],
  )

  const w = slotRef.current?.offsetWidth ?? width
  const style = win.maximized
    ? { left: 0, top: 0, width: '100%', height: '100%', zIndex: win.z }
    : {
        left: Math.min(Math.max(win.x, GRAB_MARGIN - w), area.width - GRAB_MARGIN),
        top: Math.min(Math.max(win.y, 0), area.height - 24),
        width,
        height,
        maxHeight: area.height,
        zIndex: win.z,
      }

  return (
    <div
      ref={slotRef}
      className="win-slot"
      style={style}
      hidden={win.minimized}
      onPointerDownCapture={() => wm.focus(win.id)}
    >
      <WindowContext.Provider value={controls}>{children}</WindowContext.Provider>
    </div>
  )
}
