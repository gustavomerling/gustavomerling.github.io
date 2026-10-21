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
  // Two guns at start so weapon switching can be tested.
  startingWeapons: [
    { weaponId: 'glock', attachments: [] },
    { weaponId: 'uzi', attachments: ['extended-mag'] },
  ],
};
