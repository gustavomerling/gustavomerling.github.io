import { describe, expect, it } from 'vitest';
import type { Clock } from '@engine/core/clock';
import { World } from '@engine/ecs/world';
import { Rng } from '@engine/math/rng';
import { Tile } from '@engine/physics/tilegrid';
import { BIOMES } from './content/biomes/catalog';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { RUN_MODES } from './content/modes/catalog';
import { TILE } from './config';
import { floorSpots, generateLevel } from './procgen/level';
import type { RunContext } from './systems/context';
import { hordeSystem } from './systems/horde';
import { Npc, Position } from './world/components';
import { spawnPlayer } from './world/prefabs';

describe('run modes', () => {
  it('every mode pool references real enemies', () => {
    for (const mode of RUN_MODES.all()) {
      for (const e of [...(mode.enemyPool ?? []), ...(mode.horde?.pool ?? [])]) expect(ENEMIES.has(e.id), `${mode.id}: ${e.id}`).toBe(true);
    }
  });

  it('zombie mode fills the level with zombies only', () => {
    const mode = RUN_MODES.get('zombie');
    const level = generateLevel('ZOMBIE', { ...BIOMES.get('alleys'), enemyPool: mode.enemyPool! });
    expect(level.enemySpawns.length).toBeGreaterThan(0);
    for (const s of level.enemySpawns) expect(ENEMIES.get(s.enemyId).omniscient).toBe(true);
  });

  it('reinforcement spots stand on a floor with two free tiles above', () => {
    const level = generateLevel('FLOOR', BIOMES.get('alleys'));
    const spots = floorSpots(level.grid);
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      const col = Math.floor(s.x / TILE);
      const row = s.y / TILE;
      expect([Tile.Solid, Tile.OneWay]).toContain(level.grid.get(col, row));
      expect(level.grid.get(col, row - 1)).toBe(Tile.Empty);
      expect(level.grid.get(col, row - 2)).toBe(Tile.Empty);
    }
  });

  it('reinforcements spawn behind the player, inside the distance band', () => {
    const world = new World();
    spawnPlayer(world, PLAYER_DEF, { x: 1000, y: 200 });
    const floor = (x: number) => ({ x, y: 200 });
    const ctx = {
      clock: { dt: 1 } as Clock,
      rng: Rng.fromString('horde-test'),
      horde: {
        def: { interval: 1, maxAlive: 5, minDistance: 260, maxDistance: 420, pool: [{ id: 'zombie', weight: 1 }] },
        // Too close, in the band (400 behind), and in front of the player: only the middle one is valid.
        spots: [floor(900), floor(600), floor(1100)],
        timer: 0.5,
      },
    } as unknown as RunContext;

    hordeSystem.update(world, ctx);

    const spawned = [...world.query(Npc, Position)];
    expect(spawned.length).toBe(1);
    const [, , pos] = spawned[0]!;
    expect(pos.x).toBeLessThan(1000);
    expect(pos.x).toBeGreaterThan(1000 - 420 - TILE);
  });
});
