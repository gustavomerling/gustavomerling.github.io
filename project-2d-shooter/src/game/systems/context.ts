import type { AudioMixer } from '@engine/audio/audio';
import type { Clock } from '@engine/core/clock';
import type { EventBus } from '@engine/core/events';
import type { Entity, System } from '@engine/ecs/world';
import type { ParticleSystem } from '@engine/fx/particles';
import type { Input } from '@engine/input/input';
import type { Rng } from '@engine/math/rng';
import type { TileGrid } from '@engine/physics/tilegrid';
import type { Camera } from '@engine/render/camera';
import type { Sfx } from '../audio/sfx';
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
  /** Directions (world angle from the player) damage came from, with seconds left. */
  damageDirs: { angle: number; life: number }[];
  /** "[F] AK-47" next to a weapon on the floor. */
  prompt: { text: string; x: number; y: number } | null;
  /** F was used this step (so it doesn't also trigger the exit). */
  interactUsed: boolean;
}

/** Debug toggles (F-keys), see systems/debug.ts. */
export interface DebugState {
  overlay: boolean;
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
  audio: AudioMixer;
  sfx: Sfx;
  particles: ParticleSystem;
  /** Gameplay randomness (spread, drops). Separate stream from level generation. */
  rng: Rng;
  debug: DebugState;
  feedback: Feedback;
  /** Breakable tile index -> owning prop entity. */
  breakables: Map<number, Entity>;
  /** Sounds enemies can hear (gunshots, explosions); the AI system consumes them on the next step. */
  noises: { x: number; y: number; radius: number }[];
  /** Render-side timing, owned by the session (debug overlay). */
  frameStats: { fps: number; steps: number };
}

export type RunSystem = System<RunContext>;
