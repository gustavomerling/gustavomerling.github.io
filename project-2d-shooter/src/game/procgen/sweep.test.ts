import { describe, expect, it } from 'vitest';
import { Tile } from '@engine/physics/tilegrid';
import { BIOMES, type BiomeDef } from '../content/biomes/catalog';
import { ENEMIES } from '../content/enemies/catalog';
import { RUN_MODES } from '../content/modes/catalog';
import { AI, PLAYER_TUNING, TILE } from '../config';
import { buildNavGraph, nodeNear, type NavGraph, type NavMotor } from '../pathing/navgraph';
import { generateLevel, type LevelData } from './level';
import { ROOM_COLS, ROOM_TEMPLATES } from './rooms';

/**
 * Seed sweep: many generated levels, each checked with the same route graph the enemies use,
 * built for the player's own jump. Wall jumps are left out, so this is the conservative side.
 */
const SEEDS = 150;

const PLAYER: NavMotor = { moveSpeed: PLAYER_TUNING.airSpeed, jumpSpeed: PLAYER_TUNING.jumpSpeed };

function reach(graph: NavGraph, from: number, edges: 'out' | 'into'): Uint8Array {
  const seen = new Uint8Array(graph.nodes.length);
  const queue = [from];
  seen[from] = 1;
  for (let i = 0; i < queue.length; i++) {
    for (const n of graph[edges][queue[i]!]!) {
      if (seen[n]) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  return seen;
}

function node(graph: NavGraph, p: { x: number; y: number }, what: string): number {
  const n = nodeNear(graph, p.x, p.y);
  if (n === null) throw new Error(`${what} is not on a floor node`);
  return n;
}

const campaign = BIOMES.get('alleys');
const zombie: BiomeDef = { ...campaign, enemyPool: RUN_MODES.get('zombie').enemyPool! };

describe('procgen seed sweep', () => {
  it('same seed -> the exact same level (tiles, rooms, spawn, exit, enemies)', () => {
    for (let s = 0; s < 40; s++) {
      for (const biome of [campaign, zombie]) {
        const a = generateLevel(`DET-${s}`, biome);
        const b = generateLevel(`DET-${s}`, biome);
        expect(Array.from(a.grid.data)).toEqual(Array.from(b.grid.data));
        expect(a.rooms).toEqual(b.rooms);
        expect([a.spawn, a.exit]).toEqual([b.spawn, b.exit]);
        expect(a.enemySpawns).toEqual(b.enemySpawns);
      }
    }
  });

  it('the exit is reachable with the player jump, and nothing the player can reach is a dead end', () => {
    for (let s = 0; s < SEEDS; s++) {
      const level = generateLevel(`SWEEP-${s}`, campaign);
      const graph = buildNavGraph(level.grid, PLAYER);
      const start = node(graph, level.spawn, 'spawn');
      const exit = node(graph, level.exit, 'exit');
      const fromStart = reach(graph, start, 'out');
      const toExit = reach(graph, exit, 'into');
      expect(fromStart[exit], `${level.seed}: exit unreachable`).toBe(1);
      const stuck = graph.nodes.filter((_, i) => fromStart[i] && !toExit[i]).map((n) => where(level, n.col, n.row));
      expect(stuck.slice(0, 6), `${level.seed}: softlock spots`).toEqual([]);
    }
  });

  it('every enemy stands on floor, outside the start room, away from the player, and can route to the exit', () => {
    // The slowest body that follows routes: if it gets out, the rest do.
    const slowest = Math.min(...ENEMIES.all().filter((e) => e.pathing || e.routes).map((e) => e.moveSpeed));
    const motor: NavMotor = { moveSpeed: slowest, jumpSpeed: AI.melee.jumpSpeed };
    const trapped = new Set<string>();
    for (let s = 0; s < SEEDS; s++) {
      for (const biome of [campaign, zombie]) {
        const level = generateLevel(`SWEEP-${s}`, biome);
        const graph = buildNavGraph(level.grid, motor);
        const toExit = reach(graph, node(graph, level.exit, 'exit'), 'into');
        const taken = new Set<string>();
        for (const e of level.enemySpawns) {
          const col = Math.floor(e.pos.x / TILE);
          const row = e.pos.y / TILE;
          const at = `${level.seed} ${e.enemyId} ${where(level, col, row)}`;
          expect(Number.isInteger(row), at).toBe(true);
          expect(level.grid.get(col, row - 1), at).toBe(Tile.Empty);
          expect(level.grid.get(col, row - 2), at).toBe(Tile.Empty);
          expect([Tile.Solid, Tile.OneWay], at).toContain(level.grid.get(col, row));
          expect(e.roomIndex, at).toBeGreaterThan(0);
          expect(taken.has(`${col},${row}`), `${at}: two enemies on one tile`).toBe(false);
          taken.add(`${col},${row}`);
          expect(Math.hypot(e.pos.x - level.spawn.x, e.pos.y - level.spawn.y), `${at}: too close to the start`).toBeGreaterThan(12 * TILE);
          if (!toExit[node(graph, e.pos, at)]) trapped.add(where(level, col, row));
        }
      }
    }
    expect([...trapped].sort(), 'enemy spots with no route out').toEqual([]);
  });
  it('every E marker stands right on a floor tile (it never drops to another storey)', () => {
    for (const t of ROOM_TEMPLATES) {
      t.rows.forEach((row, r) => {
        [...row].forEach((ch, c) => {
          if (ch === 'E') expect('#='.includes(t.rows[r + 1]?.[c] ?? '.'), `${t.id} E at ${c},${r}`).toBe(true);
        });
      });
    }
  });

  it('variety: no chunk twice in one level, and every chunk shows up both ways round', () => {
    const seen = new Set<string>();
    for (let s = 0; s < SEEDS; s++) {
      const level = generateLevel(`SWEEP-${s}`, campaign);
      const middle = level.rooms.slice(1, -1).map((r) => r.templateId);
      expect(new Set(middle).size, `${level.seed}: ${middle.join(' ')}`).toBe(middle.length);
      for (const r of level.rooms.slice(1, -1)) seen.add(`${r.templateId}${r.mirrored ? '(m)' : ''}`);
      expect(level.rooms[0]!.mirrored || level.rooms[level.rooms.length - 1]!.mirrored).toBe(false);
    }
    const middle = ROOM_TEMPLATES.filter((t) => t.tags.includes('alley') && t.id !== campaign.startTemplate && t.id !== campaign.endTemplate);
    expect([...seen].sort()).toEqual(middle.flatMap((t) => [t.id, `${t.id}(m)`]).sort());
  });

  it('difficulty ramps up: later rooms get more of their markers filled, heavy enemies only later', () => {
    let early = 0;
    let late = 0;
    for (let s = 0; s < SEEDS; s++) {
      const level = generateLevel(`SWEEP-${s}`, campaign);
      const last = level.rooms.length - 1;
      early += level.enemySpawns.filter((e) => e.roomIndex === 1).length;
      late += level.enemySpawns.filter((e) => e.roomIndex === last).length;
      for (const e of level.enemySpawns) {
        const from = campaign.enemyPool.find((p) => p.id === e.enemyId)?.from ?? 0;
        expect((e.roomIndex - 1) / (level.rooms.length - 2), `${level.seed} ${e.enemyId} in room ${e.roomIndex}`).toBeGreaterThanOrEqual(from - 1e-9);
      }
      // Every room after the first has a fight.
      for (let i = 1; i <= last; i++) expect(level.enemySpawns.some((e) => e.roomIndex === i), `${level.seed} room ${i}`).toBe(true);
    }
    expect(late).toBeGreaterThan(early * 1.4);
  });
});

function where(level: LevelData, col: number, row: number): string {
  const room = level.rooms[Math.floor(col / ROOM_COLS)];
  return `${room?.templateId ?? '?'}${room && 'mirrored' in room && room.mirrored ? '(m)' : ''} ${col % ROOM_COLS},${row}`;
}
