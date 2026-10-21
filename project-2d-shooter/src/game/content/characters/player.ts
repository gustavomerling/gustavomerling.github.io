/** The player's starting state for a new run. */
export interface PlayerDef {
  readonly name: string;
  readonly maxHp: number;
  /** Weapon ids + attachment ids for the starting loadout. */
  readonly startingWeapons: readonly { weaponId: string; attachments: readonly string[] }[];
}

export const PLAYER_DEF: PlayerDef = {
  name: 'Jogador',
  maxHp: 100,
  // One gun per hold style, so stances and shot types can be tested (keys 1-4).
  startingWeapons: [
    { weaponId: 'glock', attachments: [] },
    { weaponId: 'uzi', attachments: ['extended-mag'] },
    { weaponId: 'shotgun', attachments: [] },
    { weaponId: 'ak47', attachments: [] },
  ],
};
