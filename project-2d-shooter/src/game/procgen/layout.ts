export type Dir = 'left' | 'right' | 'up' | 'down';

export interface Cell {
  cx: number;
  cy: number;
}

export function dirBetween(a: Cell, b: Cell): Dir {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error('dirBetween: cells are not adjacent');
  return dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
}

/**
 * "Feet on the ground" side-scroller layout: rooms chained left to right on one row.
 * Variety comes from the room templates, not from the path shape.
 * (Vertical connections are still supported by the carver if we ever want them.)
 */
export function linearPath(length: number): Cell[] {
  if (length < 1) throw new Error('linearPath: length must be >= 1');
  return Array.from({ length }, (_, i) => ({ cx: i, cy: 0 }));
}
