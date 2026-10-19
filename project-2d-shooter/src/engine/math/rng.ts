/**
 * Deterministic, seedable PRNG (mulberry32). Every procedural system takes an `Rng`
 * instead of calling Math.random, so a run is fully reproducible from its seed.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromString(seed: string): Rng {
    return new Rng(hashString(seed));
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty list');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Picks by relative weight. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((sum, e) => sum + e.weight, 0);
    if (items.length === 0 || total <= 0) throw new Error('Rng.weighted: no positive weights');
    let roll = this.next() * total;
    for (const e of items) {
      roll -= e.weight;
      if (roll < 0) return e.item;
    }
    return items[items.length - 1]!.item;
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }

  /**
   * Independent child stream. Forking per subsystem ("layout", "loot", ...) means adding
   * a random call in one system never reshuffles the results of another.
   */
  fork(label: string): Rng {
    return new Rng(hashString(label) ^ Math.floor(this.next() * 4294967296));
  }
}

/** FNV-1a 32-bit. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Human-friendly seed for display/sharing, e.g. "K7Q2-M9XA". */
export function randomSeedString(source: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += '-';
    out += alphabet[Math.floor(source() * alphabet.length)];
  }
  return out;
}
