import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { Input } from '@engine/input/input';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import type { Renderer } from '@engine/render/renderer';
import { TILE } from '../config';
import { DEFAULT_BINDINGS } from '../input/actions';
import type { GameEvents } from '../events';
import { RunScene } from '../scenes/RunScene';
import { spawnEnemy } from '../world/prefabs';
import { Health, PlayerControl, Position } from '../world/components';
import { buildNavGraph, NavCache, type NavMotor } from './navgraph';

const WALKER: NavMotor = { moveSpeed: 55, jumpSpeed: 300 };
const RUNNER: NavMotor = { moveSpeed: 125, jumpSpeed: 300 };

/** Grid with `solid(c, r)` cells filled. */
function grid(cols: number, rows: number, solid: (c: number, r: number) => boolean): TileGrid {
  const g = new TileGrid(cols, rows, TILE);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (solid(c, r)) g.set(c, r, Tile.Solid);
  return g;
}

/** Ground at row 10 (cols 0-11), a plateau one tile higher from col 12 on. */
const stepped = () => grid(24, 14, (c, r) => (c < 12 ? r >= 10 : r >= 9));

describe('navigation graph', () => {
  it('nodes are floor tiles with two free tiles above', () => {
    const g = buildNavGraph(stepped(), WALKER);
    const at = (c: number, r: number) => g.at.get(r * g.cols + c);
    expect(at(0, 10)).toBeDefined();
    expect(at(12, 9)).toBeDefined();
    expect(at(0, 9)).toBeUndefined(); // air
    expect(at(0, 11)).toBeUndefined(); // inside the ground
  });

  it('walks flat and climbs a one-tile step', () => {
    const g = buildNavGraph(stepped(), WALKER);
    const node = (c: number, r: number) => g.at.get(r * g.cols + c)!;
    expect(g.out[node(2, 10)]).toContain(node(3, 10));
    expect(g.out[node(11, 10)]).toContain(node(12, 9));
  });

  it('does not climb a four-tile wall', () => {
    const tall = grid(24, 14, (c, r) => (c < 12 ? r >= 10 : r >= 6));
    const g = buildNavGraph(tall, WALKER);
    const node = (c: number, r: number) => g.at.get(r * g.cols + c)!;
    expect(g.out[node(11, 10)]).not.toContain(node(12, 6));
    expect(g.out[node(11, 10)]!.every((b) => g.nodes[b]!.row >= 9)).toBe(true);
  });

  it('drops off a ledge into a pit', () => {
    // Pit at column 6 down to the floor at row 12.
    const pit = grid(24, 14, (c, r) => (c < 12 && r >= 10 && !(c === 6 && r < 12)) || r >= 13);
    const g = buildNavGraph(pit, WALKER);
    const node = (c: number, r: number) => g.at.get(r * g.cols + c)!;
    expect(g.out[node(5, 10)]).toContain(node(6, 12));
  });

  it('a fast body jumps a one-tile gap at the same height, a slow one does not', () => {
    // Floor at row 10, a one-tile gap at column 6 (a pit, solid at row 12).
    const gap = grid(24, 14, (c, r) => (r >= 10 && c !== 6) || r >= 12);
    const runner = buildNavGraph(gap, RUNNER);
    const rnode = (c: number, r: number) => runner.at.get(r * runner.cols + c)!;
    expect(runner.out[rnode(5, 10)]).toContain(rnode(7, 10));
    const slow = buildNavGraph(gap, WALKER);
    const snode = (c: number, r: number) => slow.at.get(r * slow.cols + c)!;
    expect(slow.out[snode(5, 10)]).not.toContain(snode(7, 10));
  });

  it('does not jump a four-tile gap', () => {
    const wide = grid(24, 14, (c, r) => (r >= 10 && (c < 5 || c > 8)) || r >= 12);
    const g = buildNavGraph(wide, RUNNER);
    const node = (c: number, r: number) => g.at.get(r * g.cols + c)!;
    expect(g.out[node(4, 10)]).not.toContain(node(9, 10));
  });
});

describe('NavCache', () => {
  it('walks a route up the step and reaches the goal', () => {
    const nav = new NavCache(stepped());
    let pos = { x: 2.5 * TILE, y: 10 * TILE };
    const goal = { x: 20.5 * TILE, y: 9 * TILE };
    let jumps = 0;
    let steps = 0;
    for (; steps < 200; steps++) {
      const s = nav.step('walker', WALKER, pos, goal);
      if (!s) break;
      if (s.up) jumps++;
      pos = { x: s.x, y: s.y };
    }
    expect(pos).toEqual(goal);
    expect(jumps).toBe(1);
  });

  it('returns null when the goal is cut off', () => {
    // Ground everywhere, and a wall at columns 12-13 from the top down: the two sides are cut off.
    const cut = grid(24, 14, (c, r) => r >= 10 || ((c === 12 || c === 13) && r >= 0));
    const nav = new NavCache(cut);
    expect(nav.step('walker', WALKER, { x: 2.5 * TILE, y: 10 * TILE }, { x: 20.5 * TILE, y: 10 * TILE })).toBeNull();
  });
});

describe('zombies on a generated level', () => {
  /** Puts the player at the far end, a zombie at the start, and checks it gets there. */
  function chase(seed: string, enemy: string, seconds: number): number {
    const input = new Input(DEFAULT_BINDINGS);
    const scene = new RunScene({
      renderer: { width: 480, height: 270 } as Renderer,
      input,
      bus: new EventBus<GameEvents>(),
      seed,
      biomeId: 'alleys',
      mode: 'zombie',
      frameStats: { fps: 0, steps: 0 },
      debugOverlay: false,
      grid: false,
      onExit: () => undefined,
      onReplay: () => undefined,
    });
    scene.enter();
    const w = scene.world;
    const { level } = scene;
    const player = w.first(Position, Health, PlayerControl)!;
    player[1].x = level.exit.x - 20;
    player[1].y = level.exit.y - 24;
    player[2].hp = 1e9;
    const zombie = spawnEnemy(w, enemy, { x: level.spawn.x, y: level.spawn.y }, 1);
    const zPos = w.get(zombie, Position)!;

    let steps = 0;
    for (; steps < seconds * 60; steps++) {
      scene.update(1 / 60);
      const close = Math.abs(zPos.x - player[1].x) < 24 && Math.abs(zPos.y - player[1].y) < 40;
      if (close) break;
    }
    return steps / 60;
  }

  it('a zombie walks the level to the player', () => {
    expect(chase('PATH-A', 'zombie', 240)).toBeLessThan(240);
  }, 15_000);

  it('a runner walks the level to the player', () => {
    expect(chase('PATH-B', 'runner', 120)).toBeLessThan(120);
  }, 15_000);
});
