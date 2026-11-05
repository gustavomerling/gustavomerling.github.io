/** Junta as animações de todos os grupos. Cada grupo vive em groups/<grupo>.ts. */
import type { AnimDef } from './rig';
import { PEITO } from './groups/peito';
import { COSTAS } from './groups/costas';
import { OMBROS } from './groups/ombros';
import { BICEPS } from './groups/biceps';
import { TRICEPS } from './groups/triceps';
import { QUADRICEPS } from './groups/quadriceps';
import { POSTERIOR } from './groups/posterior';
import { GLUTEOS } from './groups/gluteos';
import { PANTURRILHA } from './groups/panturrilha';
import { CORE } from './groups/core';
import { CARDIO } from './groups/cardio';

export const ANIMS: Record<string, AnimDef> = {
  ...PEITO,
  ...COSTAS,
  ...OMBROS,
  ...BICEPS,
  ...TRICEPS,
  ...QUADRICEPS,
  ...POSTERIOR,
  ...GLUTEOS,
  ...PANTURRILHA,
  ...CORE,
  ...CARDIO,
};
