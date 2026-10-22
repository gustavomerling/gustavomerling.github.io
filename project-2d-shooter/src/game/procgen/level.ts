import { Rng } from '@engine/math/rng';
import type { Rect } from '@engine/math/rect';
import type { Vec2 } from '@engine/math/vec2';
import { Tile, TileGrid, type TileKind } from '@engine/physics/tilegrid';
import type { BiomeDef, EncounterRules } from '../content/biomes/catalog';
import { TILE } from '../config';
import { linearPath, type Cell, type Dir } from './layout';
import {
  DEFAULT_ROOM_STYLE,
  DOOR_ROWS,
  ROOM_COLS,
  ROOM_ROWS,
  ROOM_TEMPLATES,
  SIDE_WINDOW_SILL,
  SLAB_ROWS,
  STOREY_ROWS,
  sideWindowRows,
  type RoomStyle,
  type RoomTemplate,
} from './rooms';

export interface PlacedRoom {
  index: number;
  templateId: string;
  /** Display name ("Prédio 1"). */
  name: string;
  /** Back-wall colours. */
  style: RoomStyle;
  /** Open-air chunk: no back wall. */
  outdoor: boolean;
  /** Only the ground door is carved (flat single-storey chunk). */
  noUpperDoors: boolean;
  /** Stamped mirrored left-right (ladders and holes swap sides; the way in is still on the left). */
  mirrored: boolean;
  cell: Cell;
  /** Room rect in world units. */
  rect: Rect;
  connections: Dir[];
  /** Window tiles, world tile coordinates. */
  windows: Cell[];
}

export interface EnemySpawn {
  enemyId: string;
  /** Bottom-centre (feet) in world units. */
  pos: Vec2;
  roomIndex: number;
}

export interface LevelData {
  seed: string;
  biomeId: string;
  grid: TileGrid;
  rooms: PlacedRoom[];
  /** Feet position, world units. */
  spawn: Vec2;
  exit: Vec2;
  enemySpawns: EnemySpawn[];
}

const CHAR_TILE: Record<string, TileKind> = { '#': Tile.Solid, '=': Tile.OneWay, H: Tile.Ladder };

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
  // Forked after the older streams, so adding them changed nothing that was already generated.
  const mirrorRng = rng.fork('mirror');
  const encounterRng = rng.fork('encounters');

  const byId = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) throw new Error(`Biome ${biome.id}: unknown room template "${id}"`);
    return t;
  };
  const fixed = new Set([biome.startTemplate, biome.endTemplate].filter((id): id is string => !!id));
  const tagged = templates.filter((t) => t.tags.some((tag) => biome.roomTags.includes(tag)));
  // Middle rooms avoid the fixed start/end rooms, unless nothing else exists.
  const middle = tagged.filter((t) => !fixed.has(t.id));
  const pool = middle.length > 0 ? middle : tagged;
  if (pool.length === 0) throw new Error(`No room templates for biome ${biome.id}`);

  const length = layoutRng.int(biome.rooms.min, biome.rooms.max);
  const path = linearPath(length);
  // Rhythm: building, alley, building, alley... (an alley always sits between two buildings, so
  // the room before a fixed end building stays indoor), and never the same chunk twice in a row.
  const wantsOutdoor = (index: number) => index % 2 === 1 && index < length - 1;
  const picked: RoomTemplate[] = [];
  const pickTemplate = (index: number): RoomTemplate => {
    if (index === 0 && biome.startTemplate) return byId(biome.startTemplate);
    if (index === length - 1 && biome.endTemplate) return byId(biome.endTemplate);
    const prev = picked[index - 1];
    const next = index === length - 2 && biome.endTemplate ? byId(biome.endTemplate) : undefined;
    const fresh = pool.filter((t) => t.id !== prev?.id && t.id !== next?.id);
    const kind = fresh.filter((t) => !!t.outdoor === wantsOutdoor(index));
    const options = kind.length > 0 ? kind : fresh.length > 0 ? fresh : pool;
    // Variety: the chunks used the fewest times so far in this level go first.
    const uses = (t: RoomTemplate) => picked.filter((p) => p.id === t.id).length;
    const least = Math.min(...options.map(uses));
    return roomRng.pick(options.filter((t) => uses(t) === least));
  };

  const grid = new TileGrid(length * ROOM_COLS, ROOM_ROWS, TILE);
  grid.data.fill(Tile.Solid);

  const rooms: PlacedRoom[] = path.map((cell, index) => {
    const connections: Dir[] = [];
    if (index > 0) connections.push('left');
    if (index < length - 1) connections.push('right');
    const template = pickTemplate(index);
    picked.push(template);
    const fixedHere = (index === 0 && !!biome.startTemplate) || (index === length - 1 && !!biome.endTemplate);
    const mirrored = !fixedHere && mirrorRng.chance(biome.mirrorChance ?? 0);
    return {
      index,
      templateId: template.id,
      name: template.name ?? template.id,
      style: template.style ?? DEFAULT_ROOM_STYLE,
      outdoor: template.outdoor === true,
      noUpperDoors: template.noUpperDoors === true,
      mirrored,
      cell,
      rect: { x: cell.cx * ROOM_COLS * TILE, y: 0, w: ROOM_COLS * TILE, h: ROOM_ROWS * TILE },
      connections,
      windows: [],
    };
  });

  const markers = new Map<number, ReturnType<typeof stamp>>();
  for (const room of rooms) {
    const found = stamp(grid, room, byId(room.templateId));
    markers.set(room.index, found);
    room.windows = found.windows.map((w) => ({ cx: originCol(room) + w.cx, cy: w.cy }));
  }
  for (const room of rooms) carveConnections(grid, room);

  const first = rooms[0]!;
  const last = rooms[rooms.length - 1]!;
  const spawn = pickStandable(grid, first, markers.get(first.index)!.spawn, 3);
  const exit = pickStandable(grid, last, markers.get(last.index)!.exit, ROOM_COLS - 4);

  const enemySpawns: EnemySpawn[] = [];
  const rules = biome.encounters ?? ALL_MARKERS;
  const taken = new Set<string>();
  for (const room of rooms) {
    // A quiet first room; peaceful biomes have no enemy pool.
    if (room.index === 0 || biome.enemyPool.length === 0) continue;
    // 0 in the first room with enemies, 1 in the last room.
    const progress = rooms.length > 2 ? (room.index - 1) / (rooms.length - 2) : 1;
    const candidates: { pos: Vec2; storey: number }[] = [];
    for (const m of markers.get(room.index)!.enemy) {
      if (m.cx < rules.entryClearance) continue;
      const pos = standableBelow(grid, originCol(room) + m.cx, m.cy);
      if (!pos) continue;
      const key = `${pos.x},${pos.y}`;
      if (taken.has(key) || Math.hypot(pos.x - spawn.x, pos.y - spawn.y) <= rules.safeRadius * TILE) continue;
      taken.add(key);
      candidates.push({ pos, storey: Math.floor(pos.y / TILE / STOREY_ROWS) });
    }
    const pool = biome.enemyPool.filter((e) => (e.from ?? 0) <= progress + 1e-9);
    const weighted = (pool.length > 0 ? pool : biome.enemyPool).map((e) => ({ item: e.id, weight: e.weight }));
    for (const c of pickEncounters(candidates, rules, progress, encounterRng)) {
      enemySpawns.push({ enemyId: spawnRng.weighted(weighted), pos: c.pos, roomIndex: room.index });
    }
  }

  return { seed, biomeId: biome.id, grid, rooms, spawn, exit, enemySpawns };
}

const originCol = (room: PlacedRoom) => room.cell.cx * ROOM_COLS;

/** No ramp, no clearance: every marker spawns (biomes without `encounters`). */
const ALL_MARKERS: EncounterRules = { density: { from: 1, to: 1 }, minPerRoom: 0, entryClearance: 0, safeRadius: 0 };

/**
 * Which of a room's candidate spots get an enemy: the ramped share of them, spread over the
 * storeys (one per storey in turn, in a shuffled order) so a fight is never all on one floor.
 * Returned in the candidates' order, so the enemy-type draws stay in marker order.
 */
function pickEncounters<T extends { storey: number }>(candidates: readonly T[], rules: EncounterRules, progress: number, rng: Rng): T[] {
  const share = rules.density.from + (rules.density.to - rules.density.from) * progress;
  const count = Math.min(candidates.length, Math.max(rules.minPerRoom, Math.round(candidates.length * share)));
  if (count >= candidates.length) return [...candidates];
  const byStorey = new Map<number, number[]>();
  candidates.forEach((c, i) => byStorey.set(c.storey, [...(byStorey.get(c.storey) ?? []), i]));
  const queues = rng.shuffle([...byStorey.values()].map((list) => rng.shuffle(list)));
  const chosen = new Set<number>();
  for (let round = 0; chosen.size < count; round++) {
    for (const q of queues) if (round < q.length && chosen.size < count) chosen.add(q[round]!);
  }
  return candidates.filter((_, i) => chosen.has(i));
}

/** Feet position on the first marker that has floor under it, or a fallback column. */
function pickStandable(grid: TileGrid, room: PlacedRoom, candidates: Cell[], fallbackCol: number): Vec2 {
  for (const m of candidates) {
    const pos = standableBelow(grid, originCol(room) + m.cx, m.cy);
    if (pos) return pos;
  }
  for (let dc = 0; dc < ROOM_COLS; dc++) {
    const col = originCol(room) + ((fallbackCol + dc) % (ROOM_COLS - 2)) + 1;
    const pos = standableBelow(grid, col, DOOR_ROWS.from);
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

/** Every feet position on a solid or one-way floor with two free tiles above it (reinforcement spots). */
export function floorSpots(grid: TileGrid): Vec2[] {
  const spots: Vec2[] = [];
  for (let col = 0; col < grid.cols; col++) {
    for (let row = 2; row < grid.rows; row++) {
      const below = grid.get(col, row);
      if ((below !== Tile.Solid && below !== Tile.OneWay) || grid.get(col, row - 1) !== Tile.Empty || grid.get(col, row - 2) !== Tile.Empty) continue;
      spots.push({ x: (col + 0.5) * TILE, y: row * TILE });
    }
  }
  return spots;
}

function stamp(grid: TileGrid, room: PlacedRoom, template: RoomTemplate) {
  const found = { spawn: [] as Cell[], exit: [] as Cell[], enemy: [] as Cell[], windows: [] as Cell[] };
  template.rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const ch = line[room.mirrored ? line.length - 1 - c : c]!;
      grid.set(originCol(room) + c, r, CHAR_TILE[ch] ?? Tile.Empty);
      if (ch === 'P') found.spawn.push({ cx: c, cy: r });
      else if (ch === 'X') found.exit.push({ cx: c, cy: r });
      else if (ch === 'E') found.enemy.push({ cx: c, cy: r });
      else if (ch === 'W') found.windows.push({ cx: c, cy: r });
    }
  });
  return found;
}

/**
 * Openings between neighbours. One border column per room, so the two together make a
 * 2-tile-thick passage: the ground-floor door, plus a side window centred in the wall of every
 * upper storey (you vault onto its 1-tile sill). Next to each window there is always a floor at the
 * slab: the slab itself inside a building, or a one-way landing (alleys, double-height halls).
 */
function carveConnections(grid: TileGrid, room: PlacedRoom): void {
  const doorH = DOOR_ROWS.to - DOOR_ROWS.from + 1;
  for (const dir of room.connections) {
    const col = dir === 'left' ? originCol(room) : originCol(room) + ROOM_COLS - 1;
    const inward = dir === 'left' ? 1 : -1;
    grid.fill(col, DOOR_ROWS.from, 1, doorH, Tile.Empty);
    if (room.noUpperDoors) continue;
    for (const slab of SLAB_ROWS) {
      const rows = sideWindowRows(slab);
      // Solid wall from the slab up to the sill, then the opening.
      grid.fill(col, rows[rows.length - 1]! + 1, 1, slab - rows[rows.length - 1]!, Tile.Solid);
      for (const r of rows) grid.set(col, r, Tile.Empty);
      for (let i = 1; i <= SIDE_WINDOW_SILL; i++) {
        const c = col + inward * i;
        if (grid.get(c, slab) !== Tile.Empty) break;
        grid.set(c, slab, Tile.OneWay);
      }
    }
  }
}
