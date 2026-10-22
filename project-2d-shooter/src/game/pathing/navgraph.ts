import type { Vec2 } from '@engine/math/vec2';
import { moveAndCollide } from '@engine/physics/collide';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import { PLAYER_TUNING, TILE } from '../config';

/** How far (tiles) an edge may drop. */
const MAX_FALL = 10;
/** Share of the theoretical reach counted as reachable: steering and air drift need a margin. */
const REACH_MARGIN = 0.85;
/** Share of the jump's peak height a rising edge may use: headroom margin. */
const RISE_MARGIN = 0.9;
/** Points checked along each jump arc. */
const ARC_STEPS = 8;
/** Body used for the arc check (zombie-sized). */
const HALF_WIDTH = 4;
const HEIGHT = 22;

/** What decides which edges a body can use: how fast it walks in the air and how high it jumps. */
export interface NavMotor {
  moveSpeed: number;
  jumpSpeed: number;
}

export interface NavNode {
  col: number;
  row: number;
  /** Centre of the floor tile, world units. */
  x: number;
  /** Feet position: top of the floor tile. */
  y: number;
}

export interface NavGraph {
  cols: number;
  nodes: NavNode[];
  /** Node index by row * cols + col. */
  at: Map<number, number>;
  /** Edges a -> b: the body can get from node a to node b. */
  out: number[][];
  /** Reverse edges, to search backwards from the goal. */
  into: number[][];
  /** Edges a -> b that need a jump (up a step or across a gap), keyed a * nodes.length + b. */
  jumps: Set<number>;
  /** Edges a -> b taken by climbing a ladder, same key: the ladder's centre x. */
  ladders: Map<number, number>;
}

/**
 * Floor tiles a body can stand on (two free tiles above a solid or one-way top), and the moves
 * between them: walk, step off a ledge, jump up (or across a gap), climb a ladder. A jump is
 * only an edge when its arc, at the body's own speed, clears the walls. Ladders don't block
 * (walking past one or dropping down its shaft are plain edges); climbing one goes from the
 * floor at its foot, or any floor beside it, up to every higher floor beside it.
 */
export function buildNavGraph(grid: TileGrid, motor: NavMotor): NavGraph {
  const { cols, rows } = grid;
  // Off the map counts as solid: the sides and bottom of a level are walls.
  const tile = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? Tile.Solid : grid.get(c, r));
  const floor = (c: number, r: number) => tile(c, r) === Tile.Solid || tile(c, r) === Tile.OneWay;
  const clear = (c: number, r: number) => tile(c, r) === Tile.Empty || tile(c, r) === Tile.Ladder;
  const standable = (c: number, r: number) => floor(c, r) && clear(c, r - 1) && clear(c, r - 2);

  const nodes: NavNode[] = [];
  const at = new Map<number, number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!standable(c, r)) continue;
      at.set(r * cols + c, nodes.length);
      nodes.push({ col: c, row: r, x: (c + 0.5) * TILE, y: r * TILE });
    }
  }
  const idx = (c: number, r: number): number | undefined =>
    c < 0 || r < 0 || c >= cols || r >= rows ? undefined : at.get(r * cols + c);

  const g = PLAYER_TUNING.gravity;
  const out: number[][] = nodes.map(() => []);
  const jumps = new Set<number>();
  const link = (a: number, b: number | undefined) => {
    if (b !== undefined) out[a]!.push(b);
  };

  nodes.forEach((from, a) => {
    const { col: c, row: R } = from;
    for (const s of [-1, 1]) {
      const x = c + s;
      // Walk flat, or step off a ledge and fall to the first floor below.
      if (standable(x, R)) {
        link(a, idx(x, R));
      } else if (clear(x, R) && clear(x, R - 1) && clear(x, R - 2)) {
        for (let r = R + 1; r <= Math.min(rows - 1, R + MAX_FALL); r++) {
          if (clear(x, r)) continue;
          if (standable(x, r)) link(a, idx(x, r));
          break;
        }
      }
    }
    // Jumps: same height across a gap (k = 0), or up to the highest ledge the jump clears.
    // A low ceiling cuts the jump short (the head bonks it), so the arc is capped to the room above.
    let free = 0;
    while (free < 8 && clear(c, R - 1 - free)) free++;
    const room = Math.max(0, free * TILE - HEIGHT - 1);
    const vy = Math.min(motor.jumpSpeed, Math.sqrt(2 * g * room));
    const peak = (vy * vy) / (2 * g);
    for (let k = 0; k === 0 || k * TILE < peak * RISE_MARGIN; k++) {
      const h = k * TILE;
      // Time to reach the landing height on the way down.
      const t2 = (vy + Math.sqrt(vy * vy - 2 * g * h)) / g;
      const maxCols = Math.floor((motor.moveSpeed * t2 * REACH_MARGIN) / TILE);
      for (const s of [-1, 1]) {
        for (let dc = k === 0 ? 2 : 1; dc <= Math.max(1, maxCols); dc++) {
          const b = idx(c + s * dc, R - k);
          if (b === undefined) continue;
          // Gaps: the arc must clear the walls. Steps up: replay the jump with the real collision
          // (the body may slide up a wall or bonk a low ceiling and still make it).
          const ok = k === 0 ? arcClear(grid, from.x, from.y, s * dc * TILE, vy, g, t2) : jumpLands(grid, from, nodes[b]!, motor);
          if (ok && !out[a]!.includes(b)) {
            link(a, b);
            jumps.add(a * nodes.length + b);
          }
        }
      }
    }
  });

  // Ladders: one column segment at a time, from its foot up to every floor beside it.
  const ladders = new Map<number, number>();
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (tile(c, r) !== Tile.Ladder || tile(c, r - 1) === Tile.Ladder) continue;
      let bottom = r;
      while (tile(c, bottom + 1) === Tile.Ladder) bottom++;
      // Stops, lowest first: the floor at the foot, then the floors beside the ladder.
      const stops: number[][] = [];
      const foot = idx(c, bottom + 1);
      if (foot !== undefined) stops.push([foot]);
      for (let rr = bottom; rr >= r; rr--) {
        const side = [idx(c - 1, rr), idx(c + 1, rr)].filter((n): n is number => n !== undefined);
        if (side.length > 0) stops.push(side);
      }
      const x = (c + 0.5) * TILE;
      for (let i = 0; i < stops.length; i++) {
        for (let j = i + 1; j < stops.length; j++) {
          for (const a of stops[i]!) {
            for (const b of stops[j]!) {
              out[a]!.push(b);
              ladders.set(a * nodes.length + b, x);
            }
          }
        }
      }
    }
  }

  const into: number[][] = nodes.map(() => []);
  out.forEach((list, a) => list.forEach((b) => into[b]!.push(a)));
  return { cols, nodes, at, out, into, jumps, ladders };
}

/**
 * Simulates a jump from `from` steered like the AI does (full speed towards the target's
 * centre, stopping over it) and checks the body ends up standing on `to`'s tile.
 */
function jumpLands(grid: TileGrid, from: NavNode, to: NavNode, motor: NavMotor): boolean {
  const dt = 1 / 60;
  const speed = motor.moveSpeed * REACH_MARGIN;
  const box = { x: from.x - HALF_WIDTH, y: from.y - HEIGHT, w: HALF_WIDTH * 2, h: HEIGHT };
  let vy = -motor.jumpSpeed;
  for (let i = 0; i < 90; i++) {
    const dx = to.x - (box.x + HALF_WIDTH);
    const vx = Math.abs(dx) < 2 ? 0 : Math.sign(dx) * speed;
    vy = Math.min(vy + PLAYER_TUNING.gravity * dt, PLAYER_TUNING.maxFallSpeed);
    const hit = moveAndCollide(box, vx * dt, vy * dt, grid);
    if (hit.hitCeiling && vy < 0) vy = 0;
    if (hit.onGround && vy >= 0) {
      const col = Math.floor((box.x + HALF_WIDTH) / TILE);
      return col === to.col && Math.abs(box.y + HEIGHT - to.y) < 0.5;
    }
  }
  return false;
}

/** Samples the jump arc (feet at x0, y0) and checks the body box against solid tiles. */
function arcClear(grid: TileGrid, x0: number, y0: number, dx: number, vy: number, g: number, t2: number): boolean {
  const vx = dx / t2;
  for (let i = 1; i <= ARC_STEPS; i++) {
    const t = (t2 * i) / ARC_STEPS;
    const x = x0 + vx * t;
    const y = y0 - (vy * t - (g * t * t) / 2);
    if (
      grid.isSolidAtPixel(x - HALF_WIDTH, y - 1) ||
      grid.isSolidAtPixel(x + HALF_WIDTH, y - 1) ||
      grid.isSolidAtPixel(x - HALF_WIDTH, y - HEIGHT) ||
      grid.isSolidAtPixel(x + HALF_WIDTH, y - HEIGHT)
    ) {
      return false;
    }
  }
  return true;
}

/** Node under a feet position (a tile or two off is fine), or null when there is no floor there. */
export function nodeNear(graph: NavGraph, x: number, y: number): number | null {
  const c = Math.floor(x / TILE);
  if (c < 0 || c >= graph.cols) return null;
  const r0 = Math.floor(y / TILE);
  let best: number | null = null;
  let bestGap = Infinity;
  for (let r = r0 - 2; r <= r0 + 2; r++) {
    const i = graph.at.get(r * graph.cols + c);
    if (i === undefined) continue;
    const gap = Math.abs(graph.nodes[i]!.y - y);
    if (gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  }
  return bestGap <= 2 * TILE ? best : null;
}

/**
 * Where to steer next: a floor point, and whether it is a jump (up a step or across a gap)
 * or a ladder climb (walk to `ladderX`, climb until the feet reach `y`, then step off to `x`).
 */
export interface NavStep {
  x: number;
  y: number;
  up: boolean;
  ladderX?: number;
}

/**
 * Routes for the enemies that path. One graph per motor (keyed by enemy type), and one distance
 * field per goal: a BFS from the goal, rebuilt only when the goal moves to another floor tile.
 * No randomness, so replays stay exact.
 */
export class NavCache {
  private readonly graphs = new Map<string, NavGraph>();
  private readonly fields = new Map<string, { goal: number; dist: Int32Array }>();

  constructor(private readonly grid: TileGrid) {}

  /**
   * Next floor point on the shortest route from `from` to `goal` (both feet positions).
   * Null when either is off the floor, the body is already on the goal's floor tile, or the
   * goal can't be reached: the caller falls back to a plain chase.
   */
  step(key: string, motor: NavMotor, from: Vec2, goal: Vec2): NavStep | null {
    let graph = this.graphs.get(key);
    if (!graph) {
      graph = buildNavGraph(this.grid, motor);
      this.graphs.set(key, graph);
    }
    const a = nodeNear(graph, from.x, from.y);
    const g = nodeNear(graph, goal.x, goal.y);
    if (a === null || g === null || a === g) return null;

    const dist = this.distances(key, graph, g);
    const here = dist[a]!;
    if (here < 0) return null;

    let best = -1;
    for (const m of graph.out[a]!) {
      const d = dist[m]!;
      if (d >= 0 && d < here && (best < 0 || d < dist[best]!)) best = m;
    }
    if (best < 0) return null;
    const next = graph.nodes[best]!;
    const edge = a * graph.nodes.length + best;
    const ladderX = graph.ladders.get(edge);
    if (ladderX !== undefined) return { x: next.x, y: next.y, up: false, ladderX };
    return { x: next.x, y: next.y, up: graph.jumps.has(edge) };
  }

  private distances(key: string, graph: NavGraph, goal: number): Int32Array {
    const cached = this.fields.get(key);
    if (cached && cached.goal === goal) return cached.dist;
    const dist = new Int32Array(graph.nodes.length).fill(-1);
    const queue = [goal];
    dist[goal] = 0;
    for (let i = 0; i < queue.length; i++) {
      const u = queue[i]!;
      for (const v of graph.into[u]!) {
        if (dist[v]! >= 0) continue;
        dist[v] = dist[u]! + 1;
        queue.push(v);
      }
    }
    this.fields.set(key, { goal, dist });
    return dist;
  }
}
