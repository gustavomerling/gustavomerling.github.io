/** Snapshot the React HUD renders. Emitted only when something changed. */
export interface HudState {
  hp: number;
  maxHp: number;
  weaponName: string;
  ammo: number;
  magazine: number;
  reserve: number;
  reloading: boolean;
  fireMode: string;
  attachments: string[];
  /** Other gun carried (null if only one). */
  otherWeapon: string | null;
  /** Bullet-time meter 0..1 (rounded to 2 decimals to limit updates). */
  focus: number;
  slowmo: boolean;
  biomeName: string;
  floorLabel: string;
  /** Current chunk/building name ("Prédio 1"). */
  roomName: string;
  seed: string;
  god: boolean;
  /** Measuring grid on (F2). */
  grid: boolean;
  frozen: boolean;
}

export interface DebugStats {
  fps: number;
  steps: number;
  entities: number;
  timeScale: number;
  playerState: string;
  playerPos: string;
  room: string;
}

/** Engine -> UI messages. UI -> engine goes through GameSession methods. */
export type GameEvents = {
  hud: HudState;
  debug: DebugStats | null;
  'ui:pause': undefined;
  'level:exit': undefined;
  /** The player died. */
  'run:over': undefined;
  /** A replay (F10) started (true) or finished (false). */
  replay: boolean;
};
