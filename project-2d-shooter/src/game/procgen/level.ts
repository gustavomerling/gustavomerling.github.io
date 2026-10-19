import { Rng } from '@engine/math/rng';
import type { Rect } from '@engine/math/rect';
import type { Vec2 } from '@engine/math/vec2';
import { Tile, TileGrid, type TileKind } from '@engine/physics/tilegrid';
import type { BiomeDef } from '../content/biomes/catalog';
import { TILE } from '../config';
import { dirBetween, linearPath, type Cell, type Dir } from './layout';
import { DOOR_ROWS, ROOM_COLS, ROOM_ROWS, ROOM_TEMPLATES, SHAFT_COLS, type RoomTemplate } from './rooms';

export interface PlacedRoom {
  index: number;
  templateId: string;
  cell: Cell;
  /** Room rect in world pixels. */
  rect: Rect;
  connections: Dir[];
}

export interface EnemySpawn {
  enemyId: string;
  /** Bottom-centre (feet) in world pixels. */
  pos: Vec2;
  roomIndex: number;
}

export interface LevelData {
  seed: string;
  biomeId: string;
  grid: TileGrid;
  rooms: PlacedRoom[];
  /** Feet position, world pixels. */
  spawn: Vec2;
  exit: Vec2;
  enemySpawns: EnemySpawn[];
  /** Props to spawn, in world tile coordinates (breakables: bottom-left tile). */
  props: PropSpawn[];
}

export type PropKind = 'crate' | 'door' | 'barrel' | 'lamp' | 'extinguisher';

export interface PropSpawn {
  kind: PropKind;
  col: number;
  row: number;
}

const CHAR_TILE: Record<string, TileKind> = { '#': Tile.Solid, '=': Tile.OneWay };

/** Template characters that place props (see procgen/rooms.ts). */
export const PROP_CHARS: Record<string, PropKind> = { C: 'crate', D: 'door', B: 'barrel', L: 'lamp', F: 'extinguisher' };

/** Climbing platforms placed in the shaft of the lower room of a vertical connection. */
const CLIMB_ROWS = [13, 10, 7, 4, 1];

/**
 * Builds a level for one biome from a seed. Pure and deterministic: same (seed, biome,
 * templates) -> same level. Pipeline: left-to-right chain -> template pick -> stamp -> carve doors
 * -> markers.
 */
export function generateLevel(seed: string, biome: BiomeDef, templates: readonly RoomTemplate[] = ROOM_TEMPLATES): LevelData {
  const rng = Rng.fromString(`${seed}:${biome.id}`);
  const layoutRng = rng.fork('layout');
  const roomRng = rng.fork('rooms');
  const spawnRng = rng.fork('spawns');

  const byId = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) throw new Error(`Biome ${biome.id}: unknown room template "${id}"`);
    return t;
  };
  const fixed = new Set([biome.startTemplate, biome.endTemplate].filter((id): id is string => !!id));
  const tagged = templates.filter((t) => t.tags.some((tag) => biome.roomTags.includes(tag)));
  // Middle rooms avoid the fixed start/end rooms (no second bedroom mid-level), unless nothing else exists.
  const middle = tagged.filter((t) => !fixed.has(t.id));
  const pool = middle.length > 0 ? middle : tagged;
  if (pool.length === 0) throw new Error(`No room templates for biome ${biome.id}`);

  const length = layoutRng.int(biome.rooms.min, biome.rooms.max);
  const path = linearPath(length);
  const pickTemplate = (index: number): RoomTemplate => {
    if (index === 0 && biome.startTemplate) return byId(biome.startTemplate);
    if (index === length - 1 && biome.endTemplate) return byId(biome.endTemplate);
    return roomRng.pick(pool);
  };

  // Crop the world to the used cells.
  const minCx = Math.min(...path.map((c) => c.cx));
  const minCy = Math.min(...path.map((c) => c.cy));
  const spanX = Math.max(...path.map((c) => c.cx)) - minCx + 1;
  const spanY = Math.max(...path.map((c) => c.cy)) - minCy + 1;
  const grid = new TileGrid(spanX * ROOM_COLS, spanY * ROOM_ROWS, TILE);
  grid.data.fill(Tile.Solid);

  const rooms: PlacedRoom[] = path.map((cell, index) => {
    const connections: Dir[] = [];
    if (index > 0) connections.push(dirBetween(cell, path[index - 1]!));
    if (index < path.length - 1) connections.push(dirBetween(cell, path[index + 1]!));
    const local = { cx: cell.cx - minCx, cy: cell.cy - minCy };
    return {
      index,
      templateId: pickTemplate(index).id,
      cell: local,
      rect: { x: local.cx * ROOM_COLS * TILE, y: local.cy * ROOM_ROWS * TILE, w: ROOM_COLS * TILE, h: ROOM_ROWS * TILE },
      connections,
    };
  });

  const markers = new Map<number, ReturnType<typeof stamp>>();
  for (const room of rooms) {
    markers.set(room.index, stamp(grid, room, byId(room.templateId)));
  }
  for (const room of rooms) carveConnections(grid, room);

  const first = rooms[0]!;
  const last = rooms[rooms.length - 1]!;
  const spawn = pickStandable(grid, first, markers.get(first.index)!.spawn, 7);
  const exit = pickStandable(grid, last, markers.get(last.index)!.exit, 25);

  const enemySpawns: EnemySpawn[] = [];
  for (const room of rooms) {
    // A quiet first room; peaceful biomes (the apartment) have no enemy pool.
    if (room.index === 0 || biome.enemyPool.length === 0) continue;
    for (const m of markers.get(room.index)!.enemy) {
      const pos = standableBelow(grid, originCol(room) + m.cx, originRow(room) + m.cy);
      if (pos) enemySpawns.push({ enemyId: spawnRng.weighted(biome.enemyPool.map((e) => ({ item: e.id, weight: e.weight }))), pos, roomIndex: room.index });
    }
  }

  const props: PropSpawn[] = rooms.flatMap((room) =>
    markers.get(room.index)!.props.map((p) => ({ kind: p.kind, col: originCol(room) + p.cx, row: originRow(room) + p.cy })),
  );

  return { seed, biomeId: biome.id, grid, rooms, spawn, exit, enemySpawns, props };
}

const originCol = (room: PlacedRoom) => room.cell.cx * ROOM_COLS;
const originRow = (room: PlacedRoom) => room.cell.cy * ROOM_ROWS;

function stamp(grid: TileGrid, room: PlacedRoom, template: RoomTemplate) {
  const found = { spawn: [] as Cell[], exit: [] as Cell[], enemy: [] as Cell[], props: [] as { kind: PropKind; cx: number; cy: number }[] };
  template.rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]!;
      grid.set(originCol(room) + c, originRow(room) + r, CHAR_TILE[ch] ?? Tile.Empty);
      if (ch === 'P') found.spawn.push({ cx: c, cy: r });
      else if (ch === 'X') found.exit.push({ cx: c, cy: r });
      else if (ch === 'E') found.enemy.push({ cx: c, cy: r });
      else if (PROP_CHARS[ch]) found.props.push({ kind: PROP_CHARS[ch], cx: c, cy: r });
    }
  });
  return found;
}

function carveConnections(grid: TileGrid, room: PlacedRoom): void {
  const oc = originCol(room);
  const or = originRow(room);
  const doorH = DOOR_ROWS.to - DOOR_ROWS.from + 1;
  const shaftW = SHAFT_COLS.to - SHAFT_COLS.from + 1;
  for (const dir of room.connections) {
    switch (dir) {
      case 'left':
        grid.fill(oc, or + DOOR_ROWS.from, 3, doorH, Tile.Empty);
        break;
      case 'right':
        grid.fill(oc + ROOM_COLS - 3, or + DOOR_ROWS.from, 3, doorH, Tile.Empty);
        break;
      case 'down':
        // Floor becomes a drop-through platform; the room below provides the climb.
        grid.fill(oc + SHAFT_COLS.from, or + 1, shaftW, ROOM_ROWS - 2, Tile.Empty);
        grid.fill(oc + SHAFT_COLS.from, or + ROOM_ROWS - 1, shaftW, 1, Tile.OneWay);
        break;
      case 'up':
        grid.fill(oc + SHAFT_COLS.from, or, shaftW, ROOM_ROWS - 1, Tile.Empty);
        for (const r of CLIMB_ROWS) grid.fill(oc + SHAFT_COLS.from, or + r, shaftW, 1, Tile.OneWay);
        break;
    }
  }
}

/** Feet position on the first marker that has floor under it, or a fallback column. */
function pickStandable(grid: TileGrid, room: PlacedRoom, candidates: Cell[], fallbackCol: number): Vec2 {
  for (const m of candidates) {
    const pos = standableBelow(grid, originCol(room) + m.cx, originRow(room) + m.cy);
    if (pos) return pos;
  }
  for (let dc = 0; dc < ROOM_COLS; dc++) {
    const col = originCol(room) + ((fallbackCol + dc) % (ROOM_COLS - 2)) + 1;
    const pos = standableBelow(grid, col, originRow(room) + 1);
    if (pos) return pos;
  }
  throw new Error(`Room ${room.index} has no standable spot`);
}

/** Scans down from (col, row) for two free tiles above a floor tile; returns feet position. */
function standableBelow(grid: TileGrid, col: number, row: number): Vec2 | null {
  for (let r = Math.max(row, 1); r < grid.rows - 1; r++) {
    const free = grid.get(col, r) === Tile.Empty && grid.get(col, r - 1) === Tile.Empty;
    const below = grid.get(col, r + 1);
    if (free && (below === Tile.Solid || below === Tile.OneWay)) return { x: (col + 0.5) * TILE, y: (r + 1) * TILE };
  }
  return null;
}
