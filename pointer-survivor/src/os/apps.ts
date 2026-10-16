import type { IconName } from '../game/types'

export type AppId = 'welcome' | 'maps' | 'help' | 'shop' | 'glossary' | 'game' | 'results' | 'credits' | 'recycle'

export interface AppMeta {
  /** taskbar label */
  label: string
  icon: IconName
  width: number
  /** fixed height; omit to size to content */
  height?: number
  /** used to center content-sized windows before they render */
  estHeight?: number
  /** opens maximized */
  maximized?: boolean
  /** false = no maximize button (small dialogs) */
  resizable?: boolean
}

/** Window defaults per app. The content for each id lives in App.tsx. */
export const APPS: Record<AppId, AppMeta> = {
  welcome: { label: 'Welcome', icon: 'computer', width: 560, estHeight: 340 },
  maps: { label: 'My Computer', icon: 'computer', width: 560, estHeight: 380 },
  help: { label: 'Help', icon: 'help', width: 640, height: 540 },
  shop: { label: 'Control Panel', icon: 'controlPanel', width: 640, height: 600 },
  glossary: { label: 'Glossary', icon: 'bug', width: 840, height: 660 },
  game: { label: 'pointer.exe', icon: 'cursor', width: 900, height: 620, maximized: true },
  results: { label: 'Run Report', icon: 'license', width: 440, estHeight: 360 },
  credits: { label: 'About Pointer Survivor', icon: 'cursor', width: 440, estHeight: 440, resizable: false },
  recycle: { label: 'Confirm File Delete', icon: 'recycle', width: 380, estHeight: 160, resizable: false },
}
