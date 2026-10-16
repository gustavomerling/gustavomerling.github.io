/**
 * Classic arrow pointer, authored with the tip at (0,0) pointing "up-left" like the real one.
 * We rotate it so the tip faces the heading.
 */
const ARROW: [number, number][] = [
  [0, 0],
  [0, 16],
  [4, 12],
  [7, 18],
  [9, 17],
  [6, 11],
  [11, 11],
]

/** Angle of the tip as seen from the arrow's visual center. */
const CENTER = { x: 4, y: 10 }
const TIP_ANGLE = Math.atan2(0 - CENTER.y, 0 - CENTER.x)

export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, scale = 1, blink = false) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading - TIP_ANGLE)
  ctx.scale(scale, scale)
  ctx.translate(-CENTER.x, -CENTER.y)
  ctx.beginPath()
  ARROW.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
  ctx.closePath()
  ctx.fillStyle = blink ? '#ff8080' : '#ffffff'
  ctx.fill()
  ctx.lineWidth = 1.2
  ctx.lineJoin = 'miter'
  ctx.strokeStyle = '#000000'
  ctx.stroke()
  ctx.restore()
}
