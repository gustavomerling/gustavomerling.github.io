import { useCallback, useMemo, useRef, useState } from 'react'
import { APPS, type AppId } from './apps'

export interface WinState {
  id: AppId
  x: number
  y: number
  z: number
  minimized: boolean
  maximized: boolean
}

export interface Area {
  width: number
  height: number
}

/** Below this desktop width every window opens maximized. */
const SMALL_SCREEN = 640
const CASCADE = 26

/**
 * Single-instance windows: opening an app that is already open restores and focuses it.
 * `windows` keeps open order (for the taskbar); `z` decides stacking.
 */
export function useWindowManager(area: Area) {
  const [windows, setWindows] = useState<WinState[]>([])
  const zTop = useRef(1)
  const areaRef = useRef(area)
  areaRef.current = area

  const open = useCallback((id: AppId) => {
    setWindows((ws) => {
      const z = ++zTop.current
      if (ws.some((w) => w.id === id)) return ws.map((w) => (w.id === id ? { ...w, minimized: false, z } : w))
      const meta = APPS[id]
      const a = areaRef.current
      const w = Math.min(meta.width, a.width)
      const h = Math.min(meta.height ?? meta.estHeight ?? 400, a.height)
      const offset = (ws.length % 5) * CASCADE - CASCADE * 2
      return [
        ...ws,
        {
          id,
          x: Math.max(0, Math.round((a.width - w) / 2 + offset)),
          y: Math.max(0, Math.round((a.height - h) / 2 + offset)),
          z,
          minimized: false,
          maximized: !!meta.maximized || a.width < SMALL_SCREEN,
        },
      ]
    })
  }, [])

  const close = useCallback((id: AppId) => setWindows((ws) => ws.filter((w) => w.id !== id)), [])

  const focus = useCallback((id: AppId) => {
    setWindows((ws) => {
      const top = Math.max(0, ...ws.map((w) => w.z))
      const target = ws.find((w) => w.id === id)
      if (!target || (target.z === top && !target.minimized)) return ws
      const z = ++zTop.current
      return ws.map((w) => (w.id === id ? { ...w, z, minimized: false } : w))
    })
  }, [])

  const minimize = useCallback(
    (id: AppId) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w))),
    [],
  )

  const toggleMaximize = useCallback(
    (id: AppId) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w))),
    [],
  )

  const move = useCallback(
    (id: AppId, x: number, y: number) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w))),
    [],
  )

  const closeAll = useCallback(() => setWindows([]), [])

  /** Top-most visible window. */
  const activeId = useMemo(() => {
    let best: WinState | null = null
    for (const w of windows) if (!w.minimized && (!best || w.z > best.z)) best = w
    return best?.id ?? null
  }, [windows])

  /** Taskbar click: minimize if active, otherwise restore + focus. */
  const toggleFromTaskbar = useCallback(
    (id: AppId) => {
      if (id === activeId) minimize(id)
      else focus(id)
    },
    [activeId, minimize, focus],
  )

  return { windows, activeId, open, close, focus, minimize, toggleMaximize, move, closeAll, toggleFromTaskbar }
}

export type WindowManager = ReturnType<typeof useWindowManager>
