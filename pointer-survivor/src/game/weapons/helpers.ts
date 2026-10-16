import type { WeaponDef } from '../types'

/** Identity helper so each weapon's state type is checked against its own functions. */
export function defineWeapon<S>(def: WeaponDef<S>): WeaponDef<S> {
  return def
}
