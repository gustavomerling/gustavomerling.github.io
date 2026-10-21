import { Clock } from '@engine/core/clock';
import type { EventBus } from '@engine/core/events';
import type { Scene } from '@engine/core/scene';
import { World } from '@engine/ecs/world';
import type { Input } from '@engine/input/input';
import { Rng } from '@engine/math/rng';
import { overlaps } from '@engine/math/rect';
import { Camera } from '@engine/render/camera';
import type { Renderer } from '@engine/render/renderer';
import { BIOMES, type BiomeDef } from '../content/biomes/catalog';
import { PLAYER_DEF } from '../content/characters/player';
import { RUN_MODES, type RunModeId } from '../content/modes/catalog';
import { NavCache } from '../pathing/navgraph';
import type { GameEvents } from '../events';
import type { Action } from '../input/actions';
import { floorSpots, generateLevel, type LevelData } from '../procgen/level';
import { drawDebris, drawDecals, drawFlashes, drawPickups, drawSmoke } from '../render/effects';
import { drawCharacters, drawProjectiles, drawRagdolls } from '../render/entities';
import { drawScreenOverlay, drawWorldOverlay } from '../render/overlay';
import { drawSky } from '../render/sky';
import { drawBackdrop, drawExit, drawGrid, drawTiles } from '../render/tilemap';
import { aiSystem } from '../systems/ai';
import { cameraSystem } from '../systems/camera';
import { aimSystem, projectileSystem, weaponSystem } from '../systems/combat';
import type { RunContext, RunSystem } from '../systems/context';
import { drawDebugWorld, handleDebugKeys } from '../systems/debug';
import { effectsSystem } from '../systems/effects';
import { hordeSystem } from '../systems/horde';
import { playerMeleeSystem } from '../systems/melee';
import { pickupSystem } from '../systems/pickups';
import { createHudSystem } from '../systems/hud';
import { playerIntentSystem } from '../systems/intent';
import { lifecycleSystem } from '../systems/lifecycle';
import { medievalSystem } from '../systems/medieval';
import { physicsSystem } from '../systems/physics';
import { playerMovementSystem } from '../systems/playerMovement';
import { rigSystem } from '../systems/rig';
import { slowmoSystem, snapshotSystem } from '../systems/time';
import { Body, Health, PlayerControl, Position } from '../world/components';
import { bodyRect } from '../world/geometry';
import { spawnEnemy, spawnPlayer } from '../world/prefabs';

export interface RunSceneDeps {
  renderer: Renderer;
  input: Input<Action>;
  bus: EventBus<GameEvents>;
  seed: string;
  biomeId: string;
  /** Run mode (see content/modes). Defaults to the campaign. */
  mode?: RunModeId;
  frameStats: { fps: number; steps: number };
  debugOverlay: boolean;
  /** Measuring grid visible (F2). */
  grid: boolean;
  /** Player reached the exit. */
  onExit: () => void;
  /** F10: replay this attempt from the start. */
  onReplay: () => void;
}

/** One scenario of a run: generates the level, owns the ECS world and the system pipeline. */
export class RunScene implements Scene {
  readonly name = 'run';
  readonly world = new World();
  private ctx!: RunContext;
  private exited = false;
  private dead = false;

  /** Order matters: read input -> decide -> move -> act -> resolve -> present. */
  private readonly systems: RunSystem[] = [
    snapshotSystem,
    slowmoSystem,
    aimSystem,
    playerIntentSystem,
    playerMovementSystem,
    playerMeleeSystem,
    medievalSystem,
    hordeSystem,
    aiSystem,
    physicsSystem,
    weaponSystem,
    projectileSystem,
    lifecycleSystem,
    rigSystem,
    effectsSystem,
    pickupSystem,
    cameraSystem,
    createHudSystem(),
  ];

  constructor(private readonly deps: RunSceneDeps) {}

  get debugOverlay(): boolean {
    return this.ctx.debug.overlay;
  }

  get gridVisible(): boolean {
    return this.ctx.debug.grid;
  }

  /** Generated level (rooms, grid, spawn/exit). Exposed for tests and tooling. */
  get level(): LevelData {
    return this.ctx.level;
  }

  /** Exposed for tests and tooling. */
  get camera(): Camera {
    return this.ctx.camera;
  }

  enter(): void {
    const { renderer, input, bus, seed, biomeId } = this.deps;
    const mode = RUN_MODES.get(this.deps.mode ?? 'campaign');
    const base = BIOMES.get(mode.biomeId ?? biomeId);
    const biome: BiomeDef = mode.enemyPool ? { ...base, enemyPool: mode.enemyPool } : base;
    const level = generateLevel(seed, biome);
    const camera = new Camera(renderer.width, renderer.height);
    camera.bounds = { x: 0, y: 0, w: level.grid.widthPx, h: level.grid.heightPx };

    this.ctx = {
      clock: new Clock(),
      playerDt: 0,
      input,
      grid: level.grid,
      camera,
      level,
      biome,
      bus,
      rng: Rng.fromString(`${seed}:${biome.id}:gameplay`),
      horde: mode.horde ? { def: mode.horde, spots: floorSpots(level.grid), timer: 2 } : null,
      nav: new NavCache(level.grid),
      debug: { overlay: this.deps.debugOverlay, grid: this.deps.grid, god: false, stepMode: false, stepOnce: false, spawnIndex: 0 },
      feedback: { hitMarker: 0, hitKill: false, hitHead: false, spread: 0, busy: false },
      stats: { kills: 0, headshots: 0, shots: 0, hits: 0, time: 0 },
      noises: [],
      frameStats: this.deps.frameStats,
    };

    spawnPlayer(this.world, mode.loadout ? { ...PLAYER_DEF, startingWeapons: mode.loadout } : PLAYER_DEF, level.spawn);
    const facingRng = Rng.fromString(`${seed}:${biome.id}:facing`);
    for (const s of level.enemySpawns) spawnEnemy(this.world, s.enemyId, s.pos, facingRng.chance(0.5) ? 1 : -1);
    camera.snapTo(level.spawn.x, level.spawn.y - 40);
  }

  update(realDt: number): void {
    const { input, bus, debug } = this.ctx;
    if (input.pressed('pause')) {
      bus.emit('ui:pause', undefined);
      return;
    }
    if (handleDebugKeys(this.world, this.ctx).replay) {
      this.deps.onReplay();
      return;
    }
    if (debug.stepMode && !debug.stepOnce) return; // frozen (F8), F9 advances one step

    // The window may have changed shape: the view always fills it.
    this.ctx.camera.resize(this.deps.renderer.width, this.deps.renderer.height);
    this.ctx.clock.step(realDt);
    for (const system of this.systems) system.update(this.world, this.ctx);
    this.world.flush();
    if (!this.dead) this.ctx.stats.time += this.ctx.clock.realDt;
    this.checkDeath();
    this.checkExit();
  }

  private checkDeath(): void {
    if (this.dead) return;
    const player = this.world.first(Health, PlayerControl);
    if (!player || player[1].hp > 0) return;
    this.dead = true;
    this.ctx.clock.targetScale = 0.2;
    this.ctx.bus.emit('run:over', { ...this.ctx.stats });
  }

  render(alpha: number): void {
    const { renderer } = this.deps;
    const { camera, biome, level, clock, input, feedback, debug } = this.ctx;
    const ctx = renderer.ctx;

    renderer.clear(biome.palette.sky);
    camera.begin(ctx, alpha);
    const view = camera.view;
    camera.end(ctx);
    drawSky(ctx, view, level.grid.heightPx, clock.realElapsed, biome.sky ?? 'city');
    camera.begin(ctx, alpha);
    drawBackdrop(ctx, level, view);
    drawTiles(ctx, level.grid, biome.palette, view);
    if (debug.grid) drawGrid(ctx, level.grid, view);
    drawExit(ctx, level, biome.palette, biome.exitLabel, clock.realElapsed);
    drawDecals(ctx, this.world);
    drawRagdolls(ctx, this.world);
    drawDebris(ctx, this.world, alpha);
    drawPickups(ctx, this.world, clock.realElapsed);
    drawCharacters(ctx, this.world, alpha, clock.realElapsed, debug.overlay);
    drawSmoke(ctx, this.world);
    drawProjectiles(ctx, this.world, alpha);
    drawFlashes(ctx, this.world);
    drawWorldOverlay(ctx, this.world, level.grid, clock.realElapsed);
    if (debug.overlay) drawDebugWorld(ctx, this.world, this.ctx);
    camera.end(ctx);

    const pointer = input.pointerInside ? input.pointer : null;
    const world = pointer ? { x: pointer.x + view.x, y: pointer.y + view.y } : null;
    const ts = level.grid.tileSize;
    drawScreenOverlay(ctx, {
      pointer,
      feedback,
      pointerTile: debug.grid && world ? { col: Math.floor(world.x / ts), row: Math.floor(world.y / ts) } : null,
    });
  }

  private checkExit(): void {
    if (this.exited) return;
    const player = this.world.first(Position, Body, PlayerControl, Health);
    if (!player || player[4].hp <= 0) return;
    const { exit } = this.ctx.level;
    const door = { x: exit.x - 10, y: exit.y - 30, w: 20, h: 30 };
    const wantsExit = this.ctx.input.pressed('interact') || this.ctx.input.pressed('up');
    if (wantsExit && overlaps(bodyRect(player[1], player[2]), door)) {
      this.exited = true;
      this.ctx.bus.emit('level:exit', { ...this.ctx.stats });
      this.deps.onExit();
    }
  }
}
