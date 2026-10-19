import type { AttachmentDef } from '../attachments/types';
import type { FireMode, WeaponBehavior, WeaponDef, WeaponStats } from './types';

/** A gun with its attachments applied: what systems actually use. */
export interface AssembledWeapon {
  readonly def: WeaponDef;
  readonly attachments: readonly AttachmentDef[];
  readonly stats: Readonly<WeaponStats>;
  readonly fireMode: FireMode;
  readonly behaviors: ReadonlySet<WeaponBehavior>;
}

/** Stats that must stay whole numbers after multipliers. */
const INTEGER_STATS: ReadonlySet<keyof WeaponStats> = new Set(['magazine', 'pellets']);

/**
 * Pure function: base weapon + attachments -> final stats/behaviours.
 * Throws on invalid combos (missing slot, two in one slot, wrong class) so bad loot
 * tables are caught by tests rather than by players.
 */
export function assembleWeapon(def: WeaponDef, attachments: readonly AttachmentDef[] = []): AssembledWeapon {
  const usedSlots = new Set<string>();
  for (const a of attachments) {
    if (!def.slots.includes(a.slot)) throw new Error(`${def.id} has no "${a.slot}" slot for ${a.id}`);
    if (usedSlots.has(a.slot)) throw new Error(`${def.id}: slot "${a.slot}" already taken (${a.id})`);
    if (a.allowedClasses && !a.allowedClasses.includes(def.weaponClass)) throw new Error(`${a.id} does not fit a ${def.weaponClass}`);
    usedSlots.add(a.slot);
  }

  const stats: WeaponStats = { ...def.stats };
  const mods = attachments.flatMap((a) => a.modifiers);
  for (const m of mods) if (m.op === 'add') stats[m.stat] += m.value;
  for (const m of mods) if (m.op === 'mul') stats[m.stat] *= m.value;
  for (const s of INTEGER_STATS) stats[s] = Math.max(1, Math.round(stats[s]));

  let fireMode = def.fireMode;
  const behaviors = new Set<WeaponBehavior>();
  for (const a of attachments) {
    if (a.fireMode) fireMode = a.fireMode;
    for (const b of a.behaviors ?? []) behaviors.add(b);
  }

  return { def, attachments, stats, fireMode, behaviors };
}

/** True if `attachment` could be installed on `def` (ignoring what's already installed). */
export function canAttach(def: WeaponDef, attachment: AttachmentDef): boolean {
  return def.slots.includes(attachment.slot) && (!attachment.allowedClasses || attachment.allowedClasses.includes(def.weaponClass));
}
