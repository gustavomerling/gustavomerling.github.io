/**
 * Single source of truth for the controls. The engine reads `BINDINGS` (key
 * codes), while the HUD and the menu read `CONTROL_HELP` (what to show).
 * Change a key here and every screen follows.
 */
export const BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  run: ['ShiftLeft', 'ShiftRight'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  lantern: ['KeyF'],
}

export type ControlId = 'move' | 'look' | 'run' | 'jump' | 'restart' | 'lantern' | 'mute' | 'pause'

export type ControlHelp = {
  id: ControlId
  /** Label of the keys as the player sees them. */
  keys: string
  /** Action in Portuguese, capitalized (menu); the HUD lowercases it. */
  action: string
  /** Whether the in-game HUD shows this control. */
  inHud: boolean
}

export const CONTROL_HELP: ControlHelp[] = [
  { id: 'move', keys: 'WASD / Setas', action: 'Mover', inHud: true },
  { id: 'look', keys: 'Mouse', action: 'Olhar', inHud: false },
  { id: 'run', keys: 'Shift', action: 'Correr', inHud: true },
  { id: 'jump', keys: 'Espaço', action: 'Pular', inHud: true },
  { id: 'restart', keys: 'R', action: 'Reiniciar nível', inHud: true },
  { id: 'lantern', keys: 'F', action: 'Lanterna', inHud: false },
  { id: 'mute', keys: 'M', action: 'Som liga/desliga', inHud: false },
  { id: 'pause', keys: 'Esc', action: 'Pausar', inHud: true },
]
