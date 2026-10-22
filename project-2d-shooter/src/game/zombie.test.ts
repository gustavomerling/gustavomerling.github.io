import { describe, expect, it } from 'vitest';
import type { Clock } from '@engine/core/clock';
import { World } from '@engine/ecs/world';
import { Rng } from '@engine/math/rng';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import { Camera } from '@engine/render/camera';
import { TILE } from './config';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { RUN_MODES } from './content/modes/catalog';
import { NavCache } from './pathing/navgraph';
import { aiSystem } from './systems/ai';
import type { RunContext } from './systems/context';
import { applyDamage } from './systems/damage';
import { createHordeState, hordeSystem, pickSpot } from './systems/horde';
import { physicsSystem } from './systems/physics';
import { spaceZombies, ZOMBIE } from './systems/zombies';
import { Arsenal, Brain, Body, Health, Npc, Position, Velocity, Zombie } from './world/components';
import { spawnEnemy, spawnPlayer } from './world/prefabs';

/** Only the pieces the AI and damage systems touch in these tests. */
function testCtx(grid: TileGrid): RunContext {
  return {
    clock: { dt: 1 / 60 } as Clock,
    playerDt: 1 / 60,
    grid,
    nav: new NavCache(grid),
    rng: Rng.fromString('zombie-test'),
    noises: [],
    debug: { god: false },
    stats: { kills: 0, headshots: 0, shots: 0, hits: 0, time: 0 },
    feedback: { hitMarker: 0, hitKill: false, hitHead: false, spread: 0, busy: false },
  } as unknown as RunContext;
}

const at = { x: 100, y: 190 };

describe('zombie rules', () => {
  it('the zombie pool is slower and marked headshot-only + legs give out', () => {
    for (const id of ['zombie', 'runner', 'bloater']) {
      const def = ENEMIES.get(id);
      expect(def.moveSpeed, id).toBeLessThan(100);
      expect(def.headshotOnly, id).toBe(true);
      expect(def.crawlsWhenLegShot, id).toBe(true);
      expect(def.zombie, id).toBeDefined();
    }
  });

  it('each zombie has its own role: the zombie grabs, the runner rushes, the bloater bursts', () => {
    expect(ENEMIES.get('zombie').zombie!.grab).toBeDefined();
    expect(ENEMIES.get('runner').zombie!.rush).toBeDefined();
    expect(ENEMIES.get('runner').zombie!.grab).toBeUndefined();
    expect(ENEMIES.get('bloater').zombie!.burst).toBeDefined();
    expect(ENEMIES.get('bloater').zombie!.grab).toBeDefined();
    // A rushing runner outpaces a walking player, but not a sprinting one.
    const rush = ENEMIES.get('runner').zombie!.rush!;
    expect(rush.speed).toBeGreaterThan(95);
    expect(rush.speed).toBeLessThan(155);
  });

  it('body shots stop at 1 HP; only a headshot kills', () => {
    const world = new World();
    const ctx = testCtx(new TileGrid(20, 20, TILE));
    const e = spawnEnemy(world, 'zombie', { x: 100, y: 200 }, 1);
    const health = world.get(e, Health)!;

    expect(applyDamage(world, ctx, e, { amount: 1000, zone: 'torso', at, angle: 0, by: 'player' })).toBe('hit');
    expect(health.hp).toBe(1);
    expect(ctx.stats.kills).toBe(0);

    expect(applyDamage(world, ctx, e, { amount: 1, zone: 'head', at, angle: 0, by: 'player' })).toBe('killed');
    expect(health.hp).toBe(0);
    expect(ctx.stats.kills).toBe(1);
    expect(ctx.stats.headshots).toBe(1);
  });

  it('a leg hit drops the collider (feet stay put) and sets the crawl state', () => {
    const world = new World();
    const ctx = testCtx(new TileGrid(20, 20, TILE));
    const e = spawnEnemy(world, 'bloater', { x: 100, y: 200 }, 1);
    const body = world.get(e, Body)!;
    const pos = world.get(e, Position)!;
    const health = world.get(e, Health)!;
    const feet = pos.y + body.h;
    const height = body.h;

    applyDamage(world, ctx, e, { amount: 10, zone: 'leg', at, angle: 0, by: 'player' });

    expect(world.get(e, Brain)!.downed).toBe(true);
    expect(body.h).toBeLessThan(height);
    expect(pos.y + body.h).toBeCloseTo(feet);
    expect(health.hp).toBe(110);

    applyDamage(world, ctx, e, { amount: 1000, zone: 'torso', at, angle: 0, by: 'player' });
    expect(health.hp).toBe(1);
    expect(ctx.stats.kills).toBe(0);
  });

  it('does not spin when the target is straight below an unreachable floor', () => {
    // Two sealed floors: the zombie stands on the upper slab, the player is just below it.
    const grid = new TileGrid(16, 12, TILE);
    grid.fill(0, 5, 16, 1, Tile.Solid);
    grid.fill(0, 10, 16, 2, Tile.Solid);
    const world = new World();
    spawnPlayer(world, PLAYER_DEF, { x: 8 * TILE + 10, y: 10 * TILE });
    const zombie = spawnEnemy(world, 'zombie', { x: 8 * TILE, y: 5 * TILE }, 1);
    const ctx = testCtx(grid);
    const brain = world.get(zombie, Brain)!;
    const vel = world.get(zombie, Velocity)!;

    const facings: number[] = [];
    for (let i = 0; i < 180; i++) {
      aiSystem.update(world, ctx);
      physicsSystem.update(world, ctx);
      facings.push(brain.facing);
    }

    const flips = facings.filter((f, i) => i > 0 && f !== facings[i - 1]).length;
    expect(flips).toBe(0);
    expect(vel.x).toBe(0);
  });
});

describe('gunmen flank by route', () => {
  it('a gunman that lost sight climbs the ladder to your last known spot', () => {
    // Ground at row 12, a slab at row 6 with a ladder through it at column 8.
    const grid = new TileGrid(24, 14, TILE);
    grid.fill(0, 12, 24, 2, Tile.Solid);
    grid.fill(1, 6, 22, 1, Tile.Solid);
    for (let r = 5; r <= 11; r++) grid.set(8, r, Tile.Ladder);
    const world = new World();
    const guard = spawnEnemy(world, 'security', { x: 2 * TILE, y: 12 * TILE - 24 }, 1);
    const ctx = testCtx(grid);
    const brain = world.get(guard, Brain)!;
    const pos = world.get(guard, Position)!;
    const body = world.get(guard, Body)!;
    brain.alert = 1000;
    brain.lastSeen = { x: 18.5 * TILE, y: 6 * TILE - 12 };

    let climbed = false;
    for (let i = 0; i < 900; i++) {
      aiSystem.update(world, ctx);
      physicsSystem.update(world, ctx);
      if (brain.climb) climbed = true;
    }

    expect(climbed).toBe(true);
    expect(pos.y + body.h).toBeLessThanOrEqual(6 * TILE + 1);
    expect(pos.x + body.w / 2).toBeGreaterThan(8 * TILE);
  });
});
/** A flat floor at row 12 (feet y = 192). */
function flat(cols = 60): TileGrid {
  const grid = new TileGrid(cols, 14, TILE);
  grid.fill(0, 12, cols, 2, Tile.Solid);
  return grid;
}
const FLOOR = 12 * TILE;

function steps(world: World, ctx: RunContext, n: number, each?: (i: number) => void): void {
  for (let i = 0; i < n; i++) {
    each?.(i);
    aiSystem.update(world, ctx);
    physicsSystem.update(world, ctx);
    world.flush();
  }
}

/** Fake input: only `pressed` is used by the grab. */
function fakeInput(pressed: (action: string) => boolean): RunContext['input'] {
  return { pressed, isDown: () => false } as unknown as RunContext['input'];
}

describe('zombie grab', () => {
  function grabScene() {
    const world = new World();
    const ctx = testCtx(flat());
    const player = spawnPlayer(world, PLAYER_DEF, { x: 100, y: FLOOR });
    const zombie = spawnEnemy(world, 'zombie', { x: 112, y: FLOOR }, -1);
    return { world, ctx, player, zombie };
  }
  const traits = ENEMIES.get('zombie').zombie!;
  /** Steps until the windup is over and the grab landed. */
  const toGrab = Math.ceil(traits.windup * 60) + 4;

  it('is telegraphed, pins the player, then bites', () => {
    const { world, ctx, player, zombie } = grabScene();
    const hp = world.get(player, Health)!;
    const z = world.get(zombie, Zombie)!;

    // Windup first: no grab and no damage during the telegraph.
    steps(world, ctx, Math.floor(traits.windup * 60) - 2);
    expect(world.get(zombie, Brain)!.windupLeft).toBeGreaterThan(0);
    expect(z.grab).toBeNull();
    steps(world, ctx, 6);
    expect(z.grab).not.toBeNull();
    expect(hp.hp).toBe(100);

    // Pinned: trying to walk or jump away does nothing.
    const vel = world.get(player, Velocity)!;
    vel.x = 150;
    vel.y = -300;
    aiSystem.update(world, ctx);
    expect(vel.x).toBe(0);
    expect(vel.y).toBe(0);

    steps(world, ctx, Math.ceil(traits.grab!.hold * 60) + 2);
    expect(z.grab).toBeNull();
    expect(hp.hp).toBe(100 - traits.grab!.bite);
  });

  it('mashing A/D/Space breaks free before the bite', () => {
    const { world, ctx, player, zombie } = grabScene();
    const z = world.get(zombie, Zombie)!;
    steps(world, ctx, toGrab);
    expect(z.grab).not.toBeNull();
    let tick = 0;
    ctx.input = fakeInput((a) => a === 'left' && tick % 4 === 0);
    steps(world, ctx, traits.grab!.struggle * 4, (i) => (tick = i));
    expect(z.grab).toBeNull();
    expect(world.get(player, Health)!.hp).toBe(100);
    expect(world.get(zombie, Brain)!.staggerLeft).toBeGreaterThan(0);
  });

  it('shooting the grabber anywhere makes it let go', () => {
    const { world, ctx, player, zombie } = grabScene();
    const z = world.get(zombie, Zombie)!;
    steps(world, ctx, toGrab);
    expect(z.grab).not.toBeNull();
    applyDamage(world, ctx, zombie, { amount: 10, zone: 'torso', at, angle: 0, by: 'player' });
    steps(world, ctx, 1);
    expect(z.grab).toBeNull();
    steps(world, ctx, 30);
    expect(world.get(player, Health)!.hp).toBe(100);
  });

  it('a crawler only nips: weak bite, never a grab', () => {
    const { world, ctx, player, zombie } = grabScene();
    applyDamage(world, ctx, zombie, { amount: 1, zone: 'leg', at, angle: 0, by: 'player' });
    world.get(zombie, Brain)!.staggerLeft = 0;
    world.get(zombie, Velocity)!.x = 0;
    let grabbed = false;
    steps(world, ctx, 90, () => (grabbed ||= world.get(zombie, Zombie)!.grab !== null));
    expect(grabbed).toBe(false);
    expect(world.get(player, Health)!.hp).toBe(100 - ZOMBIE.crawlDamage);
  });

  it('a slide (i-frames) makes the attack whiff', () => {
    const { world, ctx, player, zombie } = grabScene();
    steps(world, ctx, Math.floor(traits.windup * 60) - 2);
    world.get(player, Health)!.invulnLeft = 1;
    steps(world, ctx, 6);
    expect(world.get(zombie, Zombie)!.grab).toBeNull();
    expect(world.get(zombie, Brain)!.cooldownLeft).toBeGreaterThan(0);
  });
});

describe('runner rush', () => {
  it('stops to tense up, then sprints faster than it walks', () => {
    const world = new World();
    const ctx = testCtx(flat());
    spawnPlayer(world, PLAYER_DEF, { x: 100, y: FLOOR });
    const runner = spawnEnemy(world, 'runner', { x: 220, y: FLOOR }, -1);
    const def = ENEMIES.get('runner');
    const vel = world.get(runner, Velocity)!;
    const z = world.get(runner, Zombie)!;
    steps(world, ctx, 2);
    expect(z.rush).toBe('tell');
    expect(vel.x).toBe(0);
    steps(world, ctx, Math.ceil(def.zombie!.rush!.tell * 60) + 2);
    expect(z.rush).toBe('run');
    expect(Math.abs(vel.x)).toBeGreaterThan(def.moveSpeed * 1.5);
  });

  it('does not rush from another floor', () => {
    const grid = flat();
    grid.fill(0, 6, 60, 1, Tile.Solid);
    const world = new World();
    const ctx = testCtx(grid);
    spawnPlayer(world, PLAYER_DEF, { x: 100, y: 6 * TILE });
    const runner = spawnEnemy(world, 'runner', { x: 200, y: FLOOR }, -1);
    steps(world, ctx, 30);
    expect(world.get(runner, Zombie)!.rush).toBe('none');
  });
});

describe('crowd', () => {
  it('zombies walking the same way queue up instead of stacking', () => {
    const world = new World();
    const ctx = testCtx(flat(80));
    spawnPlayer(world, PLAYER_DEF, { x: 1000, y: FLOOR });
    const ids = [0, 1, 2, 3].map((i) => spawnEnemy(world, 'zombie', { x: 800 + i * 2, y: FLOOR }, 1));
    for (const e of ids) world.get(e, Brain)!.alert = 10;
    steps(world, ctx, 240);
    const xs = ids.map((e) => world.get(e, Position)!.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(ZOMBIE.spacingHard - 1);
  });

  it('only the one behind waits; the one in front keeps going', () => {
    const world = new World();
    const a = spawnEnemy(world, 'zombie', { x: 100, y: FLOOR }, 1);
    const b = spawnEnemy(world, 'zombie', { x: 104, y: FLOOR }, 1);
    for (const e of [a, b]) {
      world.get(e, Body)!.onGround = true;
      world.get(e, Velocity)!.x = 38;
    }
    spaceZombies(world);
    expect(world.get(b, Velocity)!.x).toBe(38);
    expect(world.get(a, Velocity)!.x).toBe(0);
  });
});

describe('horde pacing', () => {
  const def = RUN_MODES.get('zombie').horde!;

  function hordeScene(playerX = 1200) {
    const grid = flat(160);
    const world = new World();
    spawnPlayer(world, PLAYER_DEF, { x: playerX, y: FLOOR });
    const ctx = testCtx(grid);
    const spots = Array.from({ length: 150 }, (_, c) => ({ x: (c + 0.5) * TILE, y: FLOOR }));
    ctx.horde = createHordeState(def, spots);
    const camera = new Camera(480, 270);
    camera.x = playerX;
    camera.y = FLOOR - 40;
    ctx.camera = camera;
    return { world, ctx, camera };
  }

  function run(world: World, ctx: RunContext, seconds: number, onStep?: () => void): void {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      hordeSystem.update(world, ctx);
      world.flush();
      onStep?.();
    }
  }

  const zombies = (world: World) => [...world.query(Npc, Position, Body)];

  it('a quiet start, then a surge from behind, out of view, one at a time', () => {
    const { world, ctx, camera } = hordeScene();
    run(world, ctx, def.firstSurge - 0.5);
    expect(zombies(world).length).toBe(0);
    expect(ctx.horde!.warning).toBe(true);
    let count = 0;
    run(world, ctx, 6, () => {
      const now = zombies(world).length;
      expect(now - count).toBeLessThanOrEqual(1);
      count = now;
    });
    expect(ctx.horde!.phase).toBe('surge');
    expect(ctx.horde!.wave).toBe(1);
    expect(count).toBeGreaterThan(0);
    for (const [, , pos, body] of zombies(world)) {
      const x = pos.x + body.w / 2;
      expect(Math.abs(x - camera.x)).toBeGreaterThan(camera.viewWidth / 2);
      expect(x).toBeLessThan(1200);
    }
  });

  it('surges end in a breather where nothing new comes', () => {
    const { world, ctx } = hordeScene();
    run(world, ctx, def.firstSurge + def.surge.start + 0.5);
    expect(ctx.horde!.phase).toBe('calm');
    const seen = new Set(zombies(world).map(([e]) => e));
    run(world, ctx, def.calm.start - def.warning - 1, () => {
      for (const [e] of zombies(world)) expect(seen.has(e)).toBe(true);
    });
  });

  it('never more than the cap near the player', () => {
    const { world, ctx } = hordeScene();
    run(world, ctx, 120, () => expect(ctx.horde!.alive).toBeLessThanOrEqual(ctx.horde!.maxAlive));
  });

  it('pressure grows with time', () => {
    const { world, ctx } = hordeScene();
    run(world, ctx, 1);
    const early = ctx.horde!.intensity;
    run(world, ctx, 60);
    expect(ctx.horde!.intensity).toBeGreaterThan(early);
  });

  it('no spawn on a floor that has no route to the player', () => {
    // The player stands inside a sealed box: every spot outside it is unreachable.
    const grid = flat(160);
    grid.fill(70, 4, 1, 8, Tile.Solid);
    grid.fill(90, 4, 1, 8, Tile.Solid);
    grid.fill(70, 4, 21, 1, Tile.Solid);
    const world = new World();
    spawnPlayer(world, PLAYER_DEF, { x: 80 * TILE, y: FLOOR });
    const ctx = testCtx(grid);
    ctx.horde = createHordeState(def, Array.from({ length: 60 }, (_, c) => ({ x: (c + 0.5) * TILE, y: FLOOR })));
    expect(pickSpot(world, ctx, ctx.horde, 'zombie', { x: 80 * TILE, feet: FLOOR })).toBeNull();
  });

  it('zombies left far behind are recycled (not a kill)', () => {
    const { world, ctx } = hordeScene(2000);
    const e = spawnEnemy(world, 'zombie', { x: 2000 - def.despawnDistance - 50, y: FLOOR }, 1);
    run(world, ctx, 0.1);
    expect(world.has(e, Npc)).toBe(false);
    expect(ctx.stats.kills).toBe(0);
  });

  it('finite ammo: reserves are set at the start and kills give some back, up to a ceiling', () => {
    const { world, ctx } = hordeScene();
    run(world, ctx, 0.1);
    const [, arsenal] = world.first(Arsenal)!;
    const glock = arsenal.weapons.find((w) => w.weapon.def.id === 'glock')!;
    const mag = glock.weapon.stats.magazine;
    const start = Math.round(mag * def.ammo.startMagazines);
    expect(glock.reserve).toBe(start);
    ctx.stats.kills += 2;
    run(world, ctx, 0.1);
    expect(glock.reserve).toBe(start + 2 * Math.ceil(mag * def.ammo.perKill));
    ctx.stats.kills += 100;
    run(world, ctx, 0.1);
    expect(glock.reserve).toBe(Math.round(mag * def.ammo.maxMagazines));
  });

  it('a bloater bursts: zombies around it die (kills count), the player nearby gets hurt', () => {
    const { world, ctx } = hordeScene();
    const bloater = spawnEnemy(world, 'bloater', { x: 1225, y: FLOOR }, -1);
    const near = spawnEnemy(world, 'zombie', { x: 1250, y: FLOOR }, -1);
    const far = spawnEnemy(world, 'zombie', { x: 1400, y: FLOOR }, -1);
    run(world, ctx, 1 / 60);
    applyDamage(world, ctx, bloater, { amount: 1, zone: 'head', at, angle: 0, by: 'player' });
    world.destroy(bloater); // what lifecycle does with the dead, before the end of the step
    world.flush();
    run(world, ctx, 1 / 60);
    expect(world.get(near, Health)!.hp).toBe(0);
    expect(world.get(far, Health)!.hp).toBeGreaterThan(0);
    expect(ctx.stats.kills).toBe(2);
    const [, health] = world.first(Health, Arsenal)!;
    expect(health.hp).toBe(100 - ENEMIES.get('bloater').zombie!.burst!.damage);
  });
});
