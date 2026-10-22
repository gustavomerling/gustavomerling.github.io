import type { ReactElement } from 'react';

/**
 * Emblem: a pixel-art gunman with a red scarf in front of a crosshair, drawn on a 24x24 grid.
 * Legend: # outline, w body, r scarf, d dark scarf, g gun, a accent (crosshair).
 */
const MARK = [
  '..........aaaa..........',
  '........aa....aa........',
  '......aa........aa......',
  '.....a............a.....',
  '....a.....###......a....',
  '....a....#www#.....a....',
  '...a.....#www#......a...',
  '...a.....#www#......a...',
  '..a....###rrr##.....a...',
  'aaaa..#rrrrrrdd#....aaaa',
  '..a..#dd#wwww#ggggggg.a.',
  '..a.#dd##wwww#ggggg#..a.',
  '..a.#d#.#wwww##g##....a.',
  '..a.#d#.#wwww#.#......a.',
  '...a.#..#wwww#.......a..',
  '...a....######.......a..',
  '....a...#ww#ww#.....a...',
  '....a...#ww##ww#....a...',
  '.....a..#ww#.#ww#..a....',
  '......a.#ww#..#ww#a.....',
  '.......####...####......',
  '..........aaaa..........',
  '..........a..a..........',
  '..........aaaa..........',
];
const MARK_FILL: Record<string, string> = {
  '#': 'var(--bg)',
  w: 'var(--player)',
  r: 'var(--danger)',
  d: 'color-mix(in srgb, var(--danger) 60%, var(--bg))',
  g: 'var(--dim)',
  a: 'var(--accent)',
};

export function LogoMark() {
  const cells: ReactElement[] = [];
  MARK.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const fill = MARK_FILL[ch];
      if (fill) cells.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }),
  );
  return (
    <svg className="logo-mark" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
    </svg>
  );
}

/** "2D" as a 9x7 pixel glyph pair: the 2 has a flat base so it can't read as a mirrored S. */
const TWO_D = [
  '.##..###.',
  '#..#.#..#',
  '...#.#..#',
  '..#..#..#',
  '.#...#..#',
  '#....#..#',
  '####.###.',
];

function TwoD() {
  return (
    <svg className="logo-2d" viewBox="0 0 9 7" shapeRendering="crispEdges" aria-label="2D">
      {TWO_D.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '#' ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

/** Brand block: emblem + wordmark. The title is the h1 of the page. */
export function Logo() {
  return (
    <div className="logo">
      <LogoMark />
      <div className="logo-word">
        <span className="logo-kicker">Project</span>
        <h1 className="logo-title" aria-label="Project Shooter 2D">
          Shooter<sup><TwoD /></sup>
        </h1>
      </div>
    </div>
  );
}
