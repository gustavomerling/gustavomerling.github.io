export type Entity = number;

/** Typed key for a component store. Create one per component with `defineComponent`. */
export interface ComponentType<T> {
  readonly id: number;
  readonly name: string;
  /** Phantom field carrying the data type; never set at runtime. */
  readonly __data?: T;
}

let nextComponentId = 0;

export function defineComponent<T>(name: string): ComponentType<T> {
  return { id: nextComponentId++, name };
}

type DataOf<C> = C extends ComponentType<infer T> ? T : never;
type DataTuple<Cs extends readonly ComponentType<unknown>[]> = { [K in keyof Cs]: DataOf<Cs[K]> };

/**
 * Minimal entity-component store. Entities are ids, components are plain data objects,
 * behaviour lives in systems. Deliberately small: enough structure to keep player, NPCs,
 * projectiles and pickups composable, without archetype machinery we don't need yet.
 */
export class World {
  private nextEntity: Entity = 1;
  private alive = new Set<Entity>();
  private stores = new Map<number, Map<Entity, unknown>>();
  private pendingDestroy = new Set<Entity>();

  create(): Entity {
    const e = this.nextEntity++;
    this.alive.add(e);
    return e;
  }

  /** Marks for removal; applied on `flush()` so systems can destroy while iterating. */
  destroy(e: Entity): void {
    if (this.alive.has(e)) this.pendingDestroy.add(e);
  }

  flush(): void {
    for (const e of this.pendingDestroy) {
      this.alive.delete(e);
      for (const store of this.stores.values()) store.delete(e);
    }
    this.pendingDestroy.clear();
  }

  isAlive(e: Entity): boolean {
    return this.alive.has(e) && !this.pendingDestroy.has(e);
  }

  get entityCount(): number {
    return this.alive.size;
  }

  add<T>(e: Entity, type: ComponentType<T>, data: T): T {
    if (!this.alive.has(e)) throw new Error(`World.add(${type.name}): entity ${e} is not alive`);
    this.store(type).set(e, data);
    return data;
  }

  remove<T>(e: Entity, type: ComponentType<T>): void {
    this.stores.get(type.id)?.delete(e);
  }

  has<T>(e: Entity, type: ComponentType<T>): boolean {
    return this.stores.get(type.id)?.has(e) ?? false;
  }

  get<T>(e: Entity, type: ComponentType<T>): T | undefined {
    return this.stores.get(type.id)?.get(e) as T | undefined;
  }

  require<T>(e: Entity, type: ComponentType<T>): T {
    const data = this.get(e, type);
    if (data === undefined) throw new Error(`Entity ${e} has no ${type.name}`);
    return data;
  }

  /** Iterates entities having all given components: `for (const [e, pos, vel] of world.query(Pos, Vel))`. */
  *query<const Cs extends readonly ComponentType<unknown>[]>(...types: Cs): Generator<[Entity, ...DataTuple<Cs>]> {
    if (types.length === 0) return;
    const stores = types.map((t) => this.stores.get(t.id));
    if (stores.some((s) => s === undefined)) return;
    const present = stores as Map<Entity, unknown>[];
    // Drive iteration from the smallest store.
    const driver = present.reduce((a, b) => (b.size < a.size ? b : a));
    for (const e of [...driver.keys()]) {
      if (this.pendingDestroy.has(e)) continue;
      const row: unknown[] = [e];
      let ok = true;
      for (const store of present) {
        if (!store.has(e)) {
          ok = false;
          break;
        }
        row.push(store.get(e));
      }
      if (ok) yield row as [Entity, ...DataTuple<Cs>];
    }
  }

  /** First entity matching the query, if any (handy for singletons like the player). */
  first<const Cs extends readonly ComponentType<unknown>[]>(...types: Cs): [Entity, ...DataTuple<Cs>] | undefined {
    for (const row of this.query(...types)) return row;
    return undefined;
  }

  private store<T>(type: ComponentType<T>): Map<Entity, T> {
    let store = this.stores.get(type.id);
    if (!store) {
      store = new Map();
      this.stores.set(type.id, store);
    }
    return store as Map<Entity, T>;
  }
}

/** A unit of behaviour run every step, in pipeline order. */
export interface System<Ctx> {
  readonly name: string;
  update(world: World, ctx: Ctx): void;
}
