import type { AttachmentSlot, FireMode, WeaponBehavior, WeaponClass, WeaponStats } from '../weapons/types';

/** `add` is applied before `mul`, regardless of attachment order. */
export interface StatModifier {
  stat: keyof WeaponStats;
  op: 'add' | 'mul';
  value: number;
}

export interface AttachmentDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly slot: AttachmentSlot;
  readonly modifiers: readonly StatModifier[];
  readonly behaviors?: readonly WeaponBehavior[];
  readonly fireMode?: FireMode;
  /** Restricts which weapon classes accept it; omitted = any gun with the slot. */
  readonly allowedClasses?: readonly WeaponClass[];
}
