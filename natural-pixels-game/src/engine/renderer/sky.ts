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

/** How much light the world gets: never fully black at night, dimmer under rain clouds, bright in a flash. */
export function ambientLight(light: number, overcast = 0, flash = 0): number {
  return (0.28 + 0.72 * light) * (1 - 0.45 * overcast) + flash * 0.6
}

/** Grey storm sky the colors fade towards as it rains. */
const STORM: RGB = [0.32, 0.35, 0.4]

/** Orange horizon glow around sunrise/sunset (light ≈ 0.2..0.6). */
export function duskAmount(light: number): number {
  return smoothstep(0, 0.35, light) * (1 - smoothstep(0.35, 0.8, light))
}

/** Sky color at vertical position `v` (0 top .. 1 bottom), as 0..255 RGB. */
export function skyColor(v: number, light: number, overcast = 0, flash = 0): RGB {
  const dusk = duskAmount(light) * v * v * 0.6 * (1 - overcast)
  return [0, 1, 2].map((c) => {
    const top = SKY.nightTop[c] + (SKY.dayTop[c] - SKY.nightTop[c]) * light
    const bottom = SKY.nightBottom[c] + (SKY.dayBottom[c] - SKY.nightBottom[c]) * light
    let value = top + (bottom - top) * v + SKY.dusk[c] * dusk
    value += (STORM[c] * (0.25 + 0.75 * light) - value) * overcast + flash * 0.5
    return Math.min(255, Math.round(value * 255))
  }) as RGB
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
