// RNG com semente (mulberry32): a mesma semente sempre gera a mesma sequência.
export type Rng = {
  // Número em [0, 1).
  next: () => number
  // Número com distribuição normal (média 0, desvio 1).
  gaussian: () => number
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // Box-Muller.
  const gaussian = () => {
    const u = 1 - next()
    const v = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return { next, gaussian }
}
