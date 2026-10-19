/**
 * Catalog of content definitions (weapons, enemies, biomes...) keyed by id.
 * Definitions are plain data; registries make them discoverable and fail loudly on typos.
 */
export class Registry<T extends { readonly id: string }> {
  private items = new Map<string, T>();

  constructor(
    readonly kind: string,
    initial: readonly T[] = [],
  ) {
    for (const item of initial) this.register(item);
  }

  register(item: T): T {
    if (this.items.has(item.id)) throw new Error(`${this.kind}: duplicate id "${item.id}"`);
    this.items.set(item.id, item);
    return item;
  }

  get(id: string): T {
    const item = this.items.get(id);
    if (!item) throw new Error(`${this.kind}: unknown id "${id}"`);
    return item;
  }

  tryGet(id: string): T | undefined {
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  all(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }
}
