import type { WeaponDef } from '../types'
import { desktopIcons } from './desktopIcons'
import { doubleClick } from './doubleClick'
import { dragDrop } from './dragDrop'
import { leftClick } from './leftClick'
import { rightClick } from './rightClick'
import { scrollWheel } from './scrollWheel'
import { selectionBox } from './selectionBox'

/** To add a weapon: create a file with defineWeapon(...) and list it here. */
// the registry holds weapons with different state shapes
export const WEAPONS: WeaponDef<any>[] = [leftClick, rightClick, doubleClick, selectionBox, desktopIcons, dragDrop, scrollWheel]

export const STARTING_WEAPON = leftClick.id

export const WEAPON_BY_ID: Record<string, WeaponDef<any>> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))
