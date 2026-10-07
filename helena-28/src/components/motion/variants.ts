import type { Transition, Variants } from 'motion/react'

/**
 * Jeitos de entrar na tela:
 * up = sobe · slap = adesivo "batido" na página · drop = cai girando
 * left/right = desliza · pop = estoura · unfold = desdobra (papel)
 */
export type RevealVariant = 'up' | 'slap' | 'drop' | 'left' | 'right' | 'pop' | 'unfold'

const HIDDEN: Record<RevealVariant, Record<string, number>> = {
  up: { opacity: 0, y: 48 },
  slap: { opacity: 0, scale: 1.3, rotate: -8 },
  drop: { opacity: 0, y: -90, rotate: 10 },
  left: { opacity: 0, x: -70, rotate: -4 },
  right: { opacity: 0, x: 70, rotate: 4 },
  pop: { opacity: 0, scale: 0.3, rotate: -25 },
  unfold: { opacity: 0, rotateX: -85, y: 30 },
}

const SPRING: Record<RevealVariant, Transition> = {
  up: { type: 'spring', stiffness: 110, damping: 18 },
  slap: { type: 'spring', stiffness: 380, damping: 16 },
  drop: { type: 'spring', stiffness: 160, damping: 13 },
  left: { type: 'spring', stiffness: 140, damping: 17 },
  right: { type: 'spring', stiffness: 140, damping: 17 },
  pop: { type: 'spring', stiffness: 300, damping: 12 },
  unfold: { type: 'spring', stiffness: 70, damping: 14 },
}

/** Variantes "hidden" → "shown"; `custom` é o atraso em segundos */
export function revealVariants(variant: RevealVariant): Variants {
  return {
    hidden: HIDDEN[variant],
    shown: (delay = 0) => ({
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      rotateX: 0,
      transition: { ...SPRING[variant], delay },
    }),
  }
}
