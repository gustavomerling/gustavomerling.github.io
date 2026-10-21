import { describe, expect, it } from 'vitest';
import type { Clock } from '@engine/core/clock';
import { World } from '@engine/ecs/world';
import { Rng } from '@engine/math/rng';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import { TILE } from './config';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { NavCache } from './pathing/navgraph';
import { aiSystem } from './systems/ai';
import type { RunContext } from './systems/context';
import { applyDamage } from './systems/damage';
import { physicsSystem } from './systems/physics';
import { Brain, Body, Health, Position, Velocity } from './world/components';
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
    }
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
