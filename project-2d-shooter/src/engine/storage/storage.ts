/** Minimal key-value backend; localStorage in the browser and in the desktop build. */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryBackend implements StorageBackend {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export function defaultBackend(): StorageBackend {
  try {
    const probe = '__probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return new MemoryBackend();
  }
}

/**
 * A versioned, validated document in storage (settings, meta-progression, ...).
 * Corrupt or older data never crashes the game: it is migrated or replaced by defaults.
 */
export class StoredDocument<T> {
  constructor(
    private readonly backend: StorageBackend,
    private readonly key: string,
    private readonly version: number,
    private readonly defaults: () => T,
    /** Turns unknown parsed data (possibly an older version) into a valid T, or null to reset. */
    private readonly migrate: (data: unknown, fromVersion: number) => T | null = () => null,
  ) {}

  load(): T {
    const raw = this.backend.getItem(this.key);
    if (raw === null) return this.defaults();
    try {
      const parsed = JSON.parse(raw) as { v?: unknown; data?: unknown };
      if (parsed.v === this.version) return { ...this.defaults(), ...(parsed.data as Partial<T>) };
      if (typeof parsed.v === 'number') return this.migrate(parsed.data, parsed.v) ?? this.defaults();
    } catch {
      // fall through to defaults
    }
    return this.defaults();
  }

  save(value: T): void {
    this.backend.setItem(this.key, JSON.stringify({ v: this.version, data: value }));
  }

  reset(): void {
    this.backend.removeItem(this.key);
  }
}
