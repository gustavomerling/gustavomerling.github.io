/** The protagonist's starting state for a new run. */
export interface PlayerDef {
  readonly name: string;
  readonly maxHp: number;
  /** Weapon ids + attachment ids for the starting loadout. */
  readonly startingWeapons: readonly { weaponId: string; attachments: readonly string[] }[];
  readonly startingItems: readonly { itemId: string; count: number }[];
}

export const PLAYER_DEF: PlayerDef = {
  name: 'Paulo Pavio',
  maxHp: 100,
  // Two guns at start only for the wireframe phase (to test weapon switching).
  startingWeapons: [
    { weaponId: 'glock', attachments: [] },
    { weaponId: 'uzi', attachments: ['extended-mag'] },
  ],
  startingItems: [
    { itemId: 'grenade', count: 2 },
    { itemId: 'flashbang', count: 1 },
  ],
};
