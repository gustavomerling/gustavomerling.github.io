import type { ReactNode } from 'react'
import type { IconName } from '../game/types'

/** 16x16 pixel-art icons drawn with plain rects. Add new ones here and to IconName. */
const ICONS: Record<IconName, ReactNode> = {
  cursor: <path d="M3 1v12l3-3 2 5 2-1-2-5h4z" fill="#fff" stroke="#000" />,
  computer: (
    <>
      <rect x="1" y="1" width="14" height="10" fill="#d4d0c8" stroke="#000" />
      <rect x="3" y="3" width="10" height="6" fill="#0a246a" />
      <rect x="4" y="4" width="4" height="1" fill="#a6caf0" />
      <rect x="5" y="11" width="6" height="2" fill="#808080" />
      <rect x="2" y="13" width="12" height="2" fill="#d4d0c8" stroke="#000" />
    </>
  ),
  controlPanel: (
    <>
      <rect x="1" y="2" width="14" height="12" fill="#d4d0c8" stroke="#000" />
      <rect x="3" y="4" width="2" height="8" fill="#808080" />
      <rect x="2" y="7" width="4" height="2" fill="#0a246a" />
      <rect x="7" y="4" width="2" height="8" fill="#808080" />
      <rect x="6" y="5" width="4" height="2" fill="#c00000" />
      <rect x="11" y="4" width="2" height="8" fill="#808080" />
      <rect x="10" y="9" width="4" height="2" fill="#008000" />
    </>
  ),
  help: (
    <>
      <path d="M2 2h9l3 3v9H2z" fill="#ffffe1" stroke="#000" />
      <rect x="5" y="4" width="5" height="1" fill="#0a246a" />
      <rect x="9" y="5" width="1" height="3" fill="#0a246a" />
      <rect x="7" y="8" width="2" height="2" fill="#0a246a" />
      <rect x="7" y="11" width="2" height="2" fill="#0a246a" />
      <rect x="5" y="5" width="1" height="1" fill="#0a246a" />
    </>
  ),
  recycle: (
    <>
      <path d="M3 4h10l-1 11H4z" fill="#c0e0c0" stroke="#000" />
      <rect x="2" y="2" width="12" height="2" fill="#a0c0a0" stroke="#000" />
      <rect x="6" y="6" width="1" height="7" fill="#408040" />
      <rect x="9" y="6" width="1" height="7" fill="#408040" />
    </>
  ),
  floppy: (
    <>
      <rect x="1" y="1" width="14" height="14" fill="#202060" stroke="#000" />
      <rect x="4" y="1" width="8" height="5" fill="#c0c0c0" />
      <rect x="9" y="2" width="2" height="3" fill="#202060" />
      <rect x="3" y="8" width="10" height="7" fill="#fff" />
      <rect x="4" y="10" width="8" height="1" fill="#808080" />
    </>
  ),
  ram: (
    <>
      <rect x="0" y="5" width="16" height="6" fill="#008040" stroke="#000" />
      <rect x="2" y="6" width="3" height="3" fill="#202020" />
      <rect x="6" y="6" width="3" height="3" fill="#202020" />
      <rect x="10" y="6" width="3" height="3" fill="#202020" />
      <rect x="1" y="11" width="14" height="2" fill="#e0c040" />
    </>
  ),
  cpu: (
    <>
      <rect x="3" y="3" width="10" height="10" fill="#606060" stroke="#000" />
      <rect x="5" y="5" width="6" height="6" fill="#c0c0c0" />
      <path d="M5 1v2M8 1v2M11 1v2M5 13v2M8 13v2M11 13v2M1 5h2M1 8h2M1 11h2M13 5h2M13 8h2M13 11h2" stroke="#e0c040" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="7" fill="#fff" stroke="#000" />
      <rect x="7.5" y="3" width="1" height="5.5" fill="#000" />
      <rect x="7.5" y="7.5" width="4" height="1" fill="#c00000" />
    </>
  ),
  mouse: (
    <>
      <path d="M8 1c-3 0-5 2-5 5v4c0 3 2 5 5 5s5-2 5-5V6c0-3-2-5-5-5z" fill="#e8e8e8" stroke="#000" />
      <rect x="7.5" y="1" width="1" height="6" fill="#000" />
      <rect x="3" y="6" width="10" height="1" fill="#000" />
    </>
  ),
  magnet: (
    <>
      <path d="M2 2h4v7a2 2 0 004 0V2h4v7a6 6 0 01-12 0z" fill="#c00000" stroke="#000" />
      <rect x="2" y="2" width="4" height="3" fill="#c0c0c0" />
      <rect x="10" y="2" width="4" height="3" fill="#c0c0c0" />
    </>
  ),
  shield: (
    <>
      <path d="M8 1l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V3z" fill="#c04000" stroke="#000" />
      <path d="M3 6h10M3 9h10M8 3v11" stroke="#802000" />
    </>
  ),
  heart: <path d="M8 14L2 8V4l2-2h2l2 2 2-2h2l2 2v4z" fill="#ff2040" stroke="#000" />,
  scandisk: (
    <>
      <circle cx="8" cy="8" r="7" fill="#c0c0c0" stroke="#000" />
      <circle cx="8" cy="8" r="2" fill="#fff" stroke="#000" />
      <path d="M8 1a7 7 0 017 7H8z" fill="#0a246a" />
    </>
  ),
  license: (
    <>
      <rect x="1" y="2" width="14" height="11" fill="#ffffe1" stroke="#000" />
      <rect x="3" y="4" width="8" height="1" fill="#000" />
      <rect x="3" y="6" width="10" height="1" fill="#808080" />
      <rect x="3" y="8" width="6" height="1" fill="#808080" />
      <circle cx="12" cy="11" r="2.5" fill="#c00000" />
    </>
  ),
  select: (
    <>
      <rect x="1.5" y="1.5" width="13" height="13" fill="rgba(10,36,106,0.2)" stroke="#000" strokeDasharray="2 1" />
      <path d="M7 6v7l2-2 1 3 1-1-1-3h3z" fill="#fff" stroke="#000" strokeWidth="0.8" />
    </>
  ),
  folder: (
    <>
      <path d="M1 3h5l1 2h8v9H1z" fill="#ffe080" stroke="#000" />
      <rect x="1" y="12" width="14" height="2" fill="#c8a040" />
    </>
  ),
  fonts: (
    <>
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000" />
      <path d="M3 13L6 4h1l3 9M4 10h5" stroke="#000" strokeWidth="1.2" fill="none" />
      <path d="M10 13l1.5-4h1l1.5 4" stroke="#c00000" fill="none" />
    </>
  ),
  warning: (
    <>
      <path d="M8 1l7 14H1z" fill="#ffe000" stroke="#000" />
      <rect x="7" y="5" width="2" height="6" fill="#000" />
      <rect x="7" y="12" width="2" height="2" fill="#000" />
    </>
  ),
  bug: (
    <>
      <ellipse cx="8" cy="9" rx="4" ry="5" fill="#2e6b1f" stroke="#000" />
      <rect x="6" y="2" width="4" height="3" fill="#1a3d12" />
      <path d="M4 7H1M4 10H1M4 13H2M12 7h3M12 10h3M12 13h2" stroke="#000" />
    </>
  ),
  popup: (
    <>
      <rect x="1" y="2" width="14" height="12" fill="#d4d0c8" stroke="#000" />
      <rect x="2" y="3" width="12" height="3" fill="#0a246a" />
      <rect x="11" y="3.5" width="2" height="2" fill="#c00000" />
      <rect x="4" y="8" width="8" height="3" fill="#ff0000" />
    </>
  ),
  virus: (
    <>
      <circle cx="8" cy="8" r="4.5" fill="#b01818" stroke="#000" />
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M13 3l-2 2M3 13l2-2" stroke="#b01818" strokeWidth="1.5" />
    </>
  ),
  doubleClick: (
    <>
      <circle cx="9" cy="9" r="6" fill="none" stroke="#0a246a" />
      <circle cx="9" cy="9" r="3.5" fill="none" stroke="#0a246a" />
      <path d="M2 1v9l2-2 2 4 1-1-2-4h3z" fill="#fff" stroke="#000" strokeWidth="0.8" />
    </>
  ),
  rightClick: (
    <>
      <path d="M8 1c-3 0-5 2-5 5v4c0 3 2 5 5 5s5-2 5-5V6c0-3-2-5-5-5z" fill="#e8e8e8" stroke="#000" />
      <path d="M8.5 1.5c2 0 4 1.5 4 4.5h-4z" fill="#c00000" />
      <rect x="7.5" y="1" width="1" height="6" fill="#000" />
      <rect x="3" y="6" width="10" height="1" fill="#000" />
    </>
  ),
  dragDrop: (
    <>
      <path d="M2 1h6l3 3v8H2z" fill="#fff" stroke="#000" />
      <rect x="4" y="5" width="5" height="1" fill="#0a246a" />
      <rect x="4" y="7" width="5" height="1" fill="#0a246a" />
      <path d="M10 9l5 3-2 .5 1.5 2.5-1 .5-1.5-2.5-1.5 1.5z" fill="#fff" stroke="#000" strokeWidth="0.7" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 1c-3 0-5 2-5 5v4c0 3 2 5 5 5s5-2 5-5V6c0-3-2-5-5-5z" fill="#e8e8e8" stroke="#000" />
      <rect x="7" y="3" width="2" height="5" fill="#404040" />
      <path d="M8 10l2 2H6zM8 15l2-2" stroke="#0a246a" fill="#0a246a" />
    </>
  ),
  monitors: (
    <>
      <rect x="0.5" y="2.5" width="7" height="6" fill="#0a246a" stroke="#000" />
      <rect x="8.5" y="2.5" width="7" height="6" fill="#0a246a" stroke="#000" />
      <rect x="2" y="10" width="4" height="2" fill="#808080" />
      <rect x="10" y="10" width="4" height="2" fill="#808080" />
      <rect x="1" y="12" width="14" height="2" fill="#c0c0c0" stroke="#000" />
    </>
  ),
  cache: (
    <>
      <rect x="2" y="2" width="12" height="12" fill="#e0e0ff" stroke="#000" />
      <rect x="4" y="4" width="3" height="3" fill="#0a246a" />
      <rect x="9" y="4" width="3" height="3" fill="#3a6ea5" />
      <rect x="4" y="9" width="3" height="3" fill="#3a6ea5" />
      <rect x="9" y="9" width="3" height="3" fill="#0a246a" />
    </>
  ),
  clover: (
    <>
      <circle cx="5.5" cy="5.5" r="3" fill="#30a030" stroke="#104010" />
      <circle cx="10.5" cy="5.5" r="3" fill="#30a030" stroke="#104010" />
      <circle cx="5.5" cy="10" r="3" fill="#30a030" stroke="#104010" />
      <circle cx="10.5" cy="10" r="3" fill="#30a030" stroke="#104010" />
      <path d="M8 8l3 7" stroke="#104010" />
    </>
  ),
  screensaver: (
    <>
      <rect x="1" y="1" width="14" height="10" fill="#000" stroke="#404040" />
      <rect x="3" y="3" width="1" height="1" fill="#fff" />
      <rect x="9" y="4" width="1" height="1" fill="#fff" />
      <rect x="6" y="7" width="2" height="2" fill="#ffe000" />
      <rect x="12" y="8" width="1" height="1" fill="#fff" />
      <rect x="5" y="11" width="6" height="2" fill="#808080" />
      <rect x="3" y="13" width="10" height="2" fill="#c0c0c0" stroke="#000" />
    </>
  ),
  drive: (
    <>
      <rect x="1" y="5" width="14" height="7" fill="#c0c0c0" stroke="#000" />
      <rect x="2" y="6" width="12" height="1" fill="#fff" />
      <rect x="3" y="9" width="6" height="1" fill="#404040" />
      <rect x="12" y="9" width="1" height="1" fill="#30ff30" />
    </>
  ),
  globe: (
    <>
      <circle cx="8" cy="8" r="7" fill="#3a8ae0" stroke="#000" />
      <path d="M3 5c2 0 3 2 2 3s-1 3 1 4M9 2c0 2 2 2 3 3s0 3 2 3M9 14c0-2 2-2 2-4" stroke="#30a030" strokeWidth="1.6" fill="none" />
    </>
  ),
  terminal: (
    <>
      <rect x="1" y="2" width="14" height="12" fill="#000" stroke="#808080" />
      <path d="M3 5l3 2-3 2" stroke="#c0c0c0" fill="none" />
      <rect x="7" y="9" width="4" height="1" fill="#c0c0c0" />
    </>
  ),
  lock: (
    <>
      <path d="M5 7V5a3 3 0 016 0v2" stroke="#404040" strokeWidth="1.5" fill="none" />
      <rect x="3" y="7" width="10" height="8" fill="#e0b030" stroke="#000" />
      <rect x="7" y="10" width="2" height="3" fill="#000" />
    </>
  ),
  taskManager: (
    <>
      <rect x="1" y="1" width="14" height="14" fill="#000" stroke="#808080" />
      <path d="M2 12l3-3 2 2 3-5 2 3 2-2" stroke="#30ff30" fill="none" />
      <rect x="2" y="13" width="12" height="1" fill="#008000" />
    </>
  ),
  notFound: (
    <>
      <path d="M2 1h8l4 4v10H2z" fill="#fff" stroke="#808080" strokeDasharray="2 1" />
      <path d="M6 6.5a2 2 0 114 .5c0 1.5-2 1.5-2 3M8 12v1" stroke="#808080" strokeWidth="1.5" fill="none" />
    </>
  ),
  note: (
    <>
      <path d="M6 3l8-2v9" stroke="#000" strokeWidth="1.5" fill="none" />
      <path d="M6 3v10" stroke="#000" strokeWidth="1.5" />
      <ellipse cx="4.5" cy="13" rx="2.5" ry="2" fill="#000" />
      <ellipse cx="12.5" cy="10.5" rx="2.5" ry="2" fill="#000" />
    </>
  ),
}

interface Props {
  name: IconName
  size?: number
  title?: string
}

export function Icon({ name, size = 16, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  )
}
