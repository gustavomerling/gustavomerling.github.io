import type { Clock } from '@engine/core/clock';
import type { EventBus } from '@engine/core/events';
import type { System } from '@engine/ecs/world';
import type { Input } from '@engine/input/input';
import type { Rng } from '@engine/math/rng';
import type { TileGrid } from '@engine/physics/tilegrid';
import type { Camera } from '@engine/render/camera';
import type { Vec2 } from '@engine/math/vec2';
import type { BiomeDef } from '../content/biomes/catalog';
import type { HordeDef } from '../content/modes/catalog';
import type { GameEvents } from '../events';
import type { Action } from '../input/actions';
import type { NavCache } from '../pathing/navgraph';
import type { LevelData } from '../procgen/level';

/**
 * Reinforcements in progress (zombie mode), updated by systems/horde.ts every step. Create it
 * with `createHordeState`. The HUD may read anything here; only the horde system writes it.
 */
export interface HordeState {
  def: HordeDef;
  /** Feet positions where enemies can appear. */
  spots: Vec2[];
  /** 'calm' = breather (nothing new spawns), 'surge' = groups keep coming. */
  phase: 'calm' | 'surge';
  /** Seconds until the phase changes. */
  timer: number;
  /** True in the last `def.warning` seconds of a breather: a surge is coming. */
  warning: boolean;
  /** Surges started so far. */
  wave: number;
  /** Pressure 0..1 (time alive + map progress); every Ramp in the def follows it. */
  intensity: number;
  /** Zombies hunting the player nearby (within def.despawnDistance) and the current cap. */
  alive: number;
  maxAlive: number;
  /** A zombie holds the player, and the break-free progress 0..1 (mash A/D/Space). */
  grabbed: boolean;
  struggle: number;
}

/** Short-lived UI feedback state, written by gameplay and read by the overlay. */
export interface Feedback {
  /** Seconds left showing the hit marker on the crosshair. */
  hitMarker: number;
  hitKill: boolean;
  hitHead: boolean;
  /** Radius (px at the cursor) the next shot may land in: the crosshair opens this far. */
  spread: number;
  /** Gun not ready (reloading / swapping): crosshair dims. */
  busy: boolean;
  /** Screen-space cues written by the HUD system (systems/hud.ts), drawn by render/overlay.ts. */
  cues?: HudCues;
}

/** Screen-space readability cues (virtual screen units). Purely presentational: never read by gameplay. */
export interface HudCues {
  /** Size of the view, for edge indicators. */
  screenW: number;
  screenH: number;
  /** Player centre on screen. */
  player: Vec2;
  /** Seconds left of the "took damage" cue (counts down in real time). */
  hurt: number;
  /** Direction the last damage came from (radians, screen space); null = unknown. */
  hurtFrom: number | null;
  /** Seconds left of the kill confirmation on the crosshair, and whether it was a headshot. */
  kill: number;
  killHead: boolean;
  /** Reload progress 0..1 drawn around the crosshair (0 = not reloading). */
  reload: number;
  /** Text under the crosshair ('R' low ammo, 'SEM MUNIÇÃO'); '' = none. */
  ammoHint: string;
  ammoEmpty: boolean;
  /** Exit position on screen and distance in tiles (indicator shows only when it is off-screen). */
  exit: Vec2 | null;
  exitTiles: number;
}

/** Score for this attempt (HUD, death screen). */
export interface RunStats {
  kills: number;
  headshots: number;
  /** Trigger pulls (a shotgun blast counts once). */
  shots: number;
  /** Shots that hurt someone (once per shot, however many pellets or bodies). */
  hits: number;
  /** Seconds alive in this scenario. */
  time: number;
}

/** Debug toggles (F-keys), see systems/debug.ts. */
export interface DebugState {
  overlay: boolean;
  /** Measuring grid over the world (F2). */
  grid: boolean;
  god: boolean;
  stepMode: boolean;
  stepOnce: boolean;
  spawnIndex: number;
}

/** Everything a gameplay system may touch during a step. */
export interface RunContext {
  clock: Clock;
  /** Player's step seconds (slow motion affects the player less than the world). */
  playerDt: number;
  input: Input<Action>;
  grid: TileGrid;
  camera: Camera;
  level: LevelData;
  biome: BiomeDef;
  bus: EventBus<GameEvents>;
  /** Gameplay randomness (spread, AI). Separate stream from level generation. */
  rng: Rng;
  /** Null in modes without reinforcements. */
  horde: HordeState | null;
  /** Routes for pathing enemies (built lazily per enemy type). */
  nav: NavCache;
  debug: DebugState;
  feedback: Feedback;
  stats: RunStats;
  /** Sounds enemies can hear (gunshots); the AI system consumes them on the next step. */
  noises: { x: number; y: number; radius: number }[];
  /** Render-side timing, owned by the session (debug overlay). */
  frameStats: { fps: number; steps: number };
}

export type RunSystem = System<RunContext>;
