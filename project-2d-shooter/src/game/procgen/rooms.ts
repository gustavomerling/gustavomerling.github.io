import { ALLEY_CHUNKS } from './chunks/alley';

/**
 * Hand-made room (chunk) templates, assembled procedurally (the Dead Cells / Spelunky approach:
 * authored rooms keep quality, procedural layout keeps variety).
 *
 * Every template is ROOM_COLS x ROOM_ROWS characters:
 *   #  solid      =  one-way platform      .  empty      H  ladder
 *   W  window (empty tile; drawn on the back wall)
 *   P  player spawn candidate   X  exit candidate   E  enemy spawn
 *
 * Storey grid: the bottom row is the ground; above it, STOREYS storeys of STOREY_ROWS rows each
 * (STOREY_HEADROOM empty rows + 1 slab). Slabs sit on rows 15, 10 and 5; row 0 is the roof.
 *
 * Authoring rules (the generator carves these areas when it connects rooms):
 *   - border rows/cols are solid (outdoor chunks leave the top row open to the sky);
 *   - side doors: DOOR_ROWS next to the left/right walls (keep them clear);
 *   - side windows: centred in the wall of every upper storey (sideWindowRows), on both side
 *     walls. The generator adds a sill/landing next to each one, so keep that area clear too.
 */
export const ROOM_COLS = 30;
export const STOREY_HEADROOM = 4;
export const STOREY_ROWS = STOREY_HEADROOM + 1;
export const STOREYS = 4;
export const ROOM_ROWS = STOREYS * STOREY_ROWS + 1;

/** The ground-floor doorway: the three rows right above the ground. */
export const DOOR_ROWS = { from: ROOM_ROWS - 4, to: ROOM_ROWS - 2 } as const;

/** Rows of the slabs between storeys, top to bottom (5, 10, 15). */
export const SLAB_ROWS: readonly number[] = Array.from({ length: STOREYS - 1 }, (_, i) => (i + 1) * STOREY_ROWS);

/** Height of the side windows that join upper storeys of neighbouring chunks. */
export const SIDE_WINDOW_ROWS = 2;

/**
 * Rows of the side window of the storey standing on `slab`: vertically centred in the storey's
 * headroom (1 tile of wall below, a step you vault, and 1 above).
 */
export function sideWindowRows(slab: number): number[] {
  const top = slab - STOREY_HEADROOM + Math.floor((STOREY_HEADROOM - SIDE_WINDOW_ROWS) / 2);
  return Array.from({ length: SIDE_WINDOW_ROWS }, (_, i) => top + i);
}

/** Width of the sill/landing the generator guarantees next to a side window. */
export const SIDE_WINDOW_SILL = 3;

/** Back-wall colours for one building chunk. */
export interface RoomStyle {
  readonly wall: string;
  readonly window: string;
}

export const DEFAULT_ROOM_STYLE: RoomStyle = { wall: '#1c1c22', window: '#0e0e12' };

export interface RoomTemplate {
  readonly id: string;
  /** Display name ("Prédio 1"). Falls back to the id. */
  readonly name?: string;
  readonly tags: readonly string[];
  readonly style?: RoomStyle;
  /** Open-air chunk (alley): no back wall, the sky shows behind it. */
  readonly outdoor?: boolean;
  readonly rows: readonly string[];
}

export const ROOM_TEMPLATES: readonly RoomTemplate[] = [...ALLEY_CHUNKS];

/** Every character a room template may use. */
export const TEMPLATE_CHARS = '#=.PXEWH';

export function validateTemplate(t: RoomTemplate): string[] {
  const errors: string[] = [];
  if (t.rows.length !== ROOM_ROWS) errors.push(`${t.id}: expected ${ROOM_ROWS} rows, got ${t.rows.length}`);
  t.rows.forEach((row, i) => {
    if (row.length !== ROOM_COLS) errors.push(`${t.id}: row ${i} has ${row.length} cols, expected ${ROOM_COLS}`);
    if ([...row].some((ch) => !TEMPLATE_CHARS.includes(ch))) errors.push(`${t.id}: row ${i} has unknown characters`);
  });
  return errors;
}
