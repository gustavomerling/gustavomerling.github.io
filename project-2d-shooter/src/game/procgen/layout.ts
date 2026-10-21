export type Dir = 'left' | 'right';

export interface Cell {
  cx: number;
  cy: number;
}

/**
 * "Feet on the ground" side-scroller layout: rooms chained left to right on one row.
 * Variety comes from the room templates, not from the path shape.
 */
export function linearPath(length: number): Cell[] {
  if (length < 1) throw new Error('linearPath: length must be >= 1');
  return Array.from({ length }, (_, i) => ({ cx: i, cy: 0 }));
}
