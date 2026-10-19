export const Tile = {
  Empty: 0,
  Solid: 1,
  /** Platform you can jump through from below and drop through with down+jump. */
  OneWay: 2,
  /** Blocks like Solid, but belongs to a destructible object (crate, door...) and can be cleared. */
  Breakable: 3,
} as const;

export type TileKind = (typeof Tile)[keyof typeof Tile];

/** Tiles that block movement, bullets and line of sight. */
export const isBlocking = (t: TileKind): boolean => t === Tile.Solid || t === Tile.Breakable;

/** Collision grid. Rendering of tiles is a separate concern (see game tilesets). */
export class TileGrid {
  readonly data: Uint8Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    data?: Uint8Array,
  ) {
    this.data = data ?? new Uint8Array(cols * rows);
    if (this.data.length !== cols * rows) throw new Error('TileGrid: data size mismatch');
  }

  get widthPx(): number {
    return this.cols * this.tileSize;
  }

  get heightPx(): number {
    return this.rows * this.tileSize;
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  /** Outside the grid counts as solid, so nothing escapes the level. */
  get(col: number, row: number): TileKind {
    if (!this.inBounds(col, row)) return Tile.Solid;
    return this.data[row * this.cols + col] as TileKind;
  }

  set(col: number, row: number, kind: TileKind): void {
    if (this.inBounds(col, row)) this.data[row * this.cols + col] = kind;
  }

  fill(col: number, row: number, w: number, h: number, kind: TileKind): void {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) this.set(c, r, kind);
  }

  /** Flat index of a tile (stable key for maps). */
  index(col: number, row: number): number {
    return row * this.cols + col;
  }

  atPixel(x: number, y: number): TileKind {
    return this.get(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /** Blocking (solid or breakable) at this pixel. */
  isSolidAtPixel(x: number, y: number): boolean {
    return isBlocking(this.atPixel(x, y));
  }
}
