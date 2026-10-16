import { createContext, useContext, type PointerEvent } from 'react'

/** What a managed window's frame needs. Null for plain dialogs (e.g. modals inside a window). */
export interface WindowFrameControls {
  active: boolean
  maximized: boolean
  resizable: boolean
  close(): void
  minimize(): void
  toggleMaximize(): void
  startDrag(e: PointerEvent<HTMLElement>): void
}

export const WindowContext = createContext<WindowFrameControls | null>(null)

export function useWindowFrame() {
  return useContext(WindowContext)
}
