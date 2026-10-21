/** Snapshot the React HUD renders. Emitted only when something changed. */
export interface HudState {
  hp: number;
  maxHp: number;
  weaponName: string;
  /** Gun model id + attachment ids, for the HUD icon. */
  weaponModel: string;
  weaponAttachments: string[];
  ammo: number;
  magazine: number;
  reserve: number;
  reloading: boolean;
  fireMode: string;
  /** Infinite ammo (sword, bow, shield, staves): the HUD shows ∞ instead of a magazine. */
  infinite: boolean;
  /** Short tip for the held weapon ("Mova o mouse rápido para golpear"). */
  weaponHint: string;
  attachments: string[];
  /** Every weapon carried, in slot order (keys 1-5); `active` marks the one in hand. */
  weapons: { name: string; active: boolean }[];
  /** Reload progress 0..1 (rounded), 0 when not reloading. */
  reload: number;
  kills: number;
  headshots: number;
  /** Whole seconds in this scenario. */
  time: number;
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

export interface RunSummary {
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  time: number;
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
  /** Reached the exit (with the score so far); the next scenario loads right after. */
  'level:exit': RunSummary;
  /** The player died (with the attempt's score). */
  'run:over': RunSummary;
  /** A replay (F10) started (true) or finished (false). */
  replay: boolean;
};
