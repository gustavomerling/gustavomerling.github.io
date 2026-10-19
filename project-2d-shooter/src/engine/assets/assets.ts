export type AssetKind = 'image' | 'json' | 'audio';

export interface AssetEntry {
  key: string;
  kind: AssetKind;
  /** URL relative to the app (use `new URL('./x.png', import.meta.url).href` or files in /public). */
  url: string;
}

type Loaded = HTMLImageElement | unknown | ArrayBuffer;

/**
 * Loads and caches assets by key. Sprites, tilesets, sounds and data all go through here,
 * so a scene can preload its manifest and then fetch everything synchronously.
 */
export class AssetStore {
  private cache = new Map<string, Loaded>();

  async load(manifest: readonly AssetEntry[], onProgress?: (done: number, total: number) => void): Promise<void> {
    let done = 0;
    const pending = manifest.filter((e) => !this.cache.has(e.key));
    await Promise.all(
      pending.map(async (entry) => {
        this.cache.set(entry.key, await loadOne(entry));
        onProgress?.(++done, pending.length);
      }),
    );
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  image(key: string): HTMLImageElement {
    return this.get(key, (v): v is HTMLImageElement => v instanceof HTMLImageElement);
  }

  json<T>(key: string): T {
    return this.get(key, (_v): _v is unknown => true) as T;
  }

  audio(key: string): ArrayBuffer {
    return this.get(key, (v): v is ArrayBuffer => v instanceof ArrayBuffer);
  }

  private get<T>(key: string, guard: (v: Loaded) => v is T): T {
    const v = this.cache.get(key);
    if (v === undefined || !guard(v)) throw new Error(`Asset "${key}" not loaded (or wrong kind)`);
    return v;
  }
}

async function loadOne(entry: AssetEntry): Promise<Loaded> {
  switch (entry.kind) {
    case 'image': {
      const img = new Image();
      img.src = entry.url;
      await img.decode();
      return img;
    }
    case 'json':
      return (await fetchOk(entry.url)).json();
    case 'audio':
      return (await fetchOk(entry.url)).arrayBuffer();
  }
}

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res;
}
