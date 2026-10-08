/*
 * Sky and world lighting, shared by both renderers (the WebGL shader mirrors these numbers).
 * Colors are 0..1 RGB.
 */
type RGB = [number, number, number]

export const SKY = {
  dayTop: [0.36, 0.62, 0.92] as RGB,
  dayBottom: [0.75, 0.88, 0.98] as RGB,
  nightTop: [0.02, 0.03, 0.08] as RGB,
  nightBottom: [0.07, 0.09, 0.18] as RGB,
  dusk: [0.9, 0.4, 0.15] as RGB,
}

/** How much light the world gets: never fully black at night. */
export function ambientLight(light: number): number {
  return 0.28 + 0.72 * light
}

/** Orange horizon glow around sunrise/sunset (light ≈ 0.2..0.6). */
export function duskAmount(light: number): number {
  return smoothstep(0, 0.35, light) * (1 - smoothstep(0.35, 0.8, light))
}

/** Sky color at vertical position `v` (0 top .. 1 bottom), as 0..255 RGB. */
export function skyColor(v: number, light: number): RGB {
  const dusk = duskAmount(light) * v * v * 0.6
  return [0, 1, 2].map((c) => {
    const top = SKY.nightTop[c] + (SKY.dayTop[c] - SKY.nightTop[c]) * light
    const bottom = SKY.nightBottom[c] + (SKY.dayBottom[c] - SKY.nightBottom[c]) * light
    const value = top + (bottom - top) * v + SKY.dusk[c] * dusk
    return Math.min(255, Math.round(value * 255))
  }) as RGB
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
