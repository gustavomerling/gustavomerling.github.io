import type { Clock } from '@engine/core/clock';
import type { EventBus } from '@engine/core/events';
import type { System } from '@engine/ecs/world';
import type { Input } from '@engine/input/input';
import type { Rng } from '@engine/math/rng';
import type { TileGrid } from '@engine/physics/tilegrid';
import type { Camera } from '@engine/render/camera';
import type { BiomeDef } from '../content/biomes/catalog';
import type { GameEvents } from '../events';
import type { Action } from '../input/actions';
import type { LevelData } from '../procgen/level';

/** Short-lived UI feedback state, written by gameplay and read by the overlay. */
export interface Feedback {
  /** Seconds left showing the hit marker on the crosshair. */
  hitMarker: number;
  hitKill: boolean;
  hitHead: boolean;
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
  debug: DebugState;
  feedback: Feedback;
  /** Sounds enemies can hear (gunshots); the AI system consumes them on the next step. */
  noises: { x: number; y: number; radius: number }[];
  /** Render-side timing, owned by the session (debug overlay). */
  frameStats: { fps: number; steps: number };
}

export type RunSystem = System<RunContext>;
