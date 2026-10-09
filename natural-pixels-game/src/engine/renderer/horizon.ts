/*
 * The landscape behind the world, drawn in the sky wherever it shows: three layers of hills, far
 * to near — hazy blue mountains with snowy peaks, sage foothills, and green hills with a fringe of
 * trees along the top. Each layer is a ridge line (layered value noise across the world) filled
 * below with its colour, faded into the sky's own colour by distance (so the hills take the
 * light of the hour: golden at dusk, blue and dark at night, grey in the rain). The sun and moon
 * set behind them. Numbers mirror the WebGL shader (shaders.ts, `horizon()`).
 */

export interface HillLayer {
  /** Ridge: base height (0..1 of the world, from the top) and how high the peaks rise above it. */
  base: number
  rise: number
  /** How many hills across the world, and a seed so layers differ. */
  scale: number
  seed: number
  /** Colour (0..1 RGB) and how much of the sky's colour it takes (haze). */
  color: [number, number, number]
  haze: number
  /** Trees along the ridge (height, 0 = none) and snow on the highest peaks. */
  trees: number
  snow: boolean
}

export const HILLS: readonly HillLayer[] = [
  { base: 0.44, rise: 0.22, scale: 3, seed: 11, color: [0.56, 0.6, 0.74], haze: 0.55, trees: 0, snow: true },
  { base: 0.56, rise: 0.14, scale: 5, seed: 37, color: [0.5, 0.62, 0.56], haze: 0.35, trees: 0.008, snow: false },
  { base: 0.67, rise: 0.09, scale: 8, seed: 71, color: [0.42, 0.58, 0.4], haze: 0.15, trees: 0.02, snow: false },
]

/** Peaks this high (0..1 of the ridge noise) wear snow, this far down from the top. */
export const SNOW_LINE = 0.66
export const SNOW_DEPTH = 0.025

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Smooth 1D value noise, 0..1. */
function noise(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const t = f * f * (3 - 2 * f)
  return hash(i, seed) * (1 - t) + hash(i + 1, seed) * t
}

/** A layer's ridge noise at `u` (0..1 across the world): big hills, smaller bumps on them. */
export function ridgeNoise(layer: HillLayer, u: number): number {
  const x = u * layer.scale
  return noise(x + layer.seed, 3.1) * 0.6 + noise(x * 2.3 + layer.seed * 1.7, 3.1) * 0.28 + noise(x * 5.1 + layer.seed * 2.9, 3.1) * 0.12
}

/** Where the layer's ridge is at `u` (0..1 from the top of the world), trees included. */
export function ridgeAt(layer: HillLayer, u: number): number {
  const trees = layer.trees ? noise(u * 90 + layer.seed, 7.7) * layer.trees : 0
  return layer.base - ridgeNoise(layer, u) * layer.rise - trees
}
