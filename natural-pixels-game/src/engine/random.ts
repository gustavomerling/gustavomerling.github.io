/** Fast xorshift32 PRNG returning floats in [0, 1). Seedable so scenes can replay later. */
export function createRandom(seed = (Math.random() * 0xffffffff) >>> 0 || 1) {
  let state = seed
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
}

export type Random = ReturnType<typeof createRandom>
