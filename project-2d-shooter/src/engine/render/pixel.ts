/**
 * Aliasing-free primitives for pixel art. Canvas `stroke()` antialiases, which looks
 * blurry at 480x270; these plot whole pixels with fillRect instead.
 */

/** Bresenham line with a square brush of `size` pixels. */
export function pixelLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size = 1): void {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  const off = Math.floor((size - 1) / 2);
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x - off, y - off, size, size);
    if (x === xe && y === ye) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Midpoint circle outline; `fill` (optional) paints the inside first. */
export function pixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, stroke: string, fill?: string): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const r = Math.max(1, Math.round(radius));
  if (fill) {
    ctx.fillStyle = fill;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(x0 - w, y0 + dy, w * 2 + 1, 1);
    }
  }
  ctx.fillStyle = stroke;
  let x = r;
  let y = 0;
  let err = 1 - r;
  while (x >= y) {
    for (const [px, py] of [
      [x, y],
      [y, x],
      [-y, x],
      [-x, y],
      [-x, -y],
      [-y, -x],
      [y, -x],
      [x, -y],
    ] as const) {
      ctx.fillRect(x0 + px, y0 + py, 1, 1);
    }
    y++;
    if (err < 0) err += 2 * y + 1;
    else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}
