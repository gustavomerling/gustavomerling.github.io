/** Pixel glyphs for the caption buttons, matching the Win2000 "Marlett" shapes. */
const GLYPHS = {
  minimize: ['......', '......', '......', '......', '......', 'XXXXXX', 'XXXXXX'],
  maximize: ['XXXXXXXXX', 'XXXXXXXXX', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'X.......X', 'XXXXXXXXX'],
  restore: ['..XXXXXX', '..XXXXXX', '..X....X', 'XXXXXX.X', 'XXXXXX.X', 'X....XXX', 'X....X..', 'X....X..', 'XXXXXX..'],
  close: ['XX....XX', '.XX..XX.', '..XXXX..', '...XX...', '..XXXX..', '.XX..XX.', 'XX....XX'],
} as const

export type GlyphName = keyof typeof GLYPHS

function rects(rows: readonly string[], dx: number, dy: number, fill: string) {
  const out = []
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === 'X') out.push(<rect key={`${fill}${x},${y}`} x={x + dx} y={y + dy} width={1} height={1} fill={fill} />)
    }
  }
  return out
}

export function TitleGlyph({ name, disabled }: { name: GlyphName; disabled?: boolean }) {
  const rows = GLYPHS[name]
  const w = rows[0].length + 1
  const h = rows.length + 1
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden>
      {disabled ? (
        <>
          {rects(rows, 1, 1, '#ffffff')}
          {rects(rows, 0, 0, '#808080')}
        </>
      ) : (
        rects(rows, 0, 0, '#000000')
      )}
    </svg>
  )
}
