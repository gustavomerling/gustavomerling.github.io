import type { AudioMixer } from '@engine/audio/audio';
import { Clock } from '@engine/core/clock';
import type { EventBus } from '@engine/core/events';
import type { Scene } from '@engine/core/scene';
import { World } from '@engine/ecs/world';
import { ParticleSystem } from '@engine/fx/particles';
import type { Input } from '@engine/input/input';
import { Rng } from '@engine/math/rng';
import { overlaps } from '@engine/math/rect';
import { Camera } from '@engine/render/camera';
import type { Renderer } from '@engine/render/renderer';
import { createSfx } from '../audio/sfx';
import { BIOMES, type BiomeDef } from '../content/biomes/catalog';
import { PLAYER_DEF } from '../content/characters/player';
import { TILE } from '../config';
import type { GameEvents } from '../events';
import type { Action } from '../input/actions';
import { generateLevel } from '../procgen/level';
import { drawBackground } from '../render/backgrounds';
import { drawDamageNumbers, drawEntities } from '../render/entities';
import { drawScreenOverlay, drawWorldOverlay } from '../render/overlay';
import { drawPickups, drawPrompt, drawProps, drawRagdolls } from '../render/props';
import { drawExit, drawTiles } from '../render/tilemap';
import { aiSystem } from '../systems/ai';
import { cameraSystem } from '../systems/camera';
import { aimSystem, projectileSystem, throwableSystem, weaponSystem } from '../systems/combat';
import type { RunContext, RunSystem } from '../systems/context';
import { drawDebugWorld, handleDebugKeys } from '../systems/debug';
import { createHudSystem } from '../systems/hud';
import { playerIntentSystem } from '../systems/intent';
import { lifecycleSystem } from '../systems/lifecycle';
import { particleSystem } from '../systems/particles';
import { physicsSystem } from '../systems/physics';
import { pickupSystem } from '../systems/pickups';
import { playerMovementSystem } from '../systems/playerMovement';
import { propsSystem } from '../systems/props';
import { rigSystem } from '../systems/rig';
import { slowmoSystem, snapshotSystem } from '../systems/time';
import { Body, Health, PlayerControl, Position } from '../world/components';
import { bodyRect } from '../world/geometry';
import { spawnBreakable, spawnEnemy, spawnHazard, spawnPlayer } from '../world/prefabs';

export interface RunSceneDeps {
  renderer: Renderer;
  input: Input<Action>;
  audio: AudioMixer;
  bus: EventBus<GameEvents>;
  seed: string;
  biomeId: string;
  frameStats: { fps: number; steps: number };
  debugOverlay: boolean;
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
    aiSystem,
    physicsSystem,
    pickupSystem,
    weaponSystem,
    throwableSystem,
    projectileSystem,
    propsSystem,
    lifecycleSystem,
    particleSystem,
    rigSystem,
    cameraSystem,
    createHudSystem(),
  ];

  constructor(private readonly deps: RunSceneDeps) {}

  get debugOverlay(): boolean {
    return this.ctx.debug.overlay;
  }

  enter(): void {
    const { renderer, input, audio, bus, seed, biomeId } = this.deps;
    const biome: BiomeDef = BIOMES.get(biomeId);
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
      audio,
      sfx: createSfx(audio),
      particles: new ParticleSystem(1500, (x, y) => level.grid.isSolidAtPixel(x, y)),
      rng: Rng.fromString(`${seed}:${biome.id}:gameplay`),
      debug: { overlay: this.deps.debugOverlay, god: false, stepMode: false, stepOnce: false, spawnIndex: 0 },
      feedback: { hitMarker: 0, hitKill: false, hitHead: false, damageDirs: [], prompt: null, interactUsed: false },
      breakables: new Map(),
      noises: [],
      frameStats: this.deps.frameStats,
    };

    spawnPlayer(this.world, PLAYER_DEF, level.spawn);
    const facingRng = Rng.fromString(`${seed}:${biome.id}:facing`);
    for (const s of level.enemySpawns) spawnEnemy(this.world, s.enemyId, s.pos, facingRng.chance(0.5) ? 1 : -1);
    for (const prop of level.props) {
      const center = { x: (prop.col + 0.5) * TILE, y: (prop.row + 0.5) * TILE };
      if (prop.kind === 'lamp') spawnHazard(this.world, 'lamp', { x: center.x, y: prop.row * TILE + 2 });
      else if (prop.kind === 'extinguisher') spawnHazard(this.world, 'extinguisher', center);
      else spawnBreakable(this.world, this.ctx, prop.kind, prop.col, prop.row);
    }
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

    this.ctx.feedback.interactUsed = false;
    this.ctx.clock.step(realDt);
    for (const system of this.systems) system.update(this.world, this.ctx);
    this.world.flush();
    this.checkDeath();
    this.checkExit();
  }

  private checkDeath(): void {
    if (this.dead) return;
    const player = this.world.first(Health, PlayerControl);
    if (!player || player[1].hp > 0) return;
    this.dead = true;
    this.ctx.clock.targetScale = 0.2;
    this.ctx.bus.emit('run:over', undefined);
  }

  render(alpha: number): void {
    const { renderer } = this.deps;
    const { camera, biome, level, clock, input, feedback } = this.ctx;
    const ctx = renderer.ctx;
    const view = { w: renderer.width, h: renderer.height };

    renderer.clear('#000');
    camera.begin(ctx, alpha, clock.realElapsed);
    const worldView = camera.view;
    camera.end(ctx);

    drawBackground(ctx, biome.background, { x: worldView.x, y: worldView.y, ...view });
    camera.begin(ctx, alpha, clock.realElapsed);
    drawTiles(ctx, level.grid, biome.palette, worldView);
    drawExit(ctx, level, biome.palette, biome.exitLabel, clock.realElapsed);
    drawProps(ctx, this.world, clock.realElapsed);
    drawRagdolls(ctx, this.world);
    drawPickups(ctx, this.world, alpha, clock.realElapsed);
    drawEntities(ctx, this.world, alpha, this.ctx.debug.overlay);
    this.ctx.particles.draw(ctx);
    drawWorldOverlay(ctx, this.world);
    if (this.ctx.debug.overlay) drawDebugWorld(ctx, this.world, this.ctx);
    drawPrompt(ctx, feedback);
    drawDamageNumbers(ctx, this.world);
    camera.end(ctx);

    const player = this.world.first(Health, PlayerControl);
    drawScreenOverlay(ctx, this.world, view, {
      pointer: input.pointerInside ? input.pointer : null,
      timeScale: clock.scale,
      feedback,
      health: player ? Math.max(0, player[1].hp / player[1].max) : null,
      time: clock.realElapsed,
    });
    renderer.present();
  }

  private checkExit(): void {
    if (this.exited) return;
    const player = this.world.first(Position, Body, PlayerControl, Health);
    if (!player || player[4].hp <= 0) return;
    const { exit } = this.ctx.level;
    const door = { x: exit.x - 10, y: exit.y - 30, w: 20, h: 30 };
    const wantsExit = (this.ctx.input.pressed('interact') && !this.ctx.feedback.interactUsed) || this.ctx.input.pressed('up');
    if (wantsExit && overlaps(bodyRect(player[1], player[2]), door)) {
      this.exited = true;
      this.ctx.bus.emit('level:exit', undefined);
      this.deps.onExit();
    }
  }
}
