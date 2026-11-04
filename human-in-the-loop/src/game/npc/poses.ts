import type { PartName } from './skeleton'

/**
 * Pose-alvo: ângulos (rad) de cada junta, indexada pela parte FILHA.
 * [x, y, z] relativos à pose de referência (em pé, braços para baixo).
 * Dobradiças (cotovelo, joelho) usam só x. Juntas ausentes ficam em 0.
 *
 * Lembrete das convenções (ver skeleton.ts):
 * - osso para BAIXO (braço, perna): x+ leva a ponta para a frente;
 *   z+ leva a ponta para a direita (+X).
 * - osso para CIMA (tronco, cabeça): x− curva para a frente.
 * - cotovelo: x+ dobra; joelho: x− dobra.
 * - tornozelo: x+ levanta os dedos.
 */
export type Pose = Partial<Record<PartName, [number, number, number]>>

export const POSES = {
  stand: {
    label: 'Em pé',
    pose: {
      forearmL: [0.15, 0, 0],
      forearmR: [0.15, 0, 0],
      shinL: [-0.05, 0, 0],
      shinR: [-0.05, 0, 0],
      thighL: [0.03, 0, 0],
      thighR: [0.03, 0, 0],
    },
  },
  tpose: {
    label: 'Braços abertos',
    pose: {
      upperArmL: [0, 0, -1.5],
      upperArmR: [0, 0, 1.5],
    },
  },
  guard: {
    label: 'Guarda',
    pose: {
      chest: [-0.1, 0, 0],
      head: [-0.15, 0, 0],
      upperArmL: [0.9, 0, 0.25],
      upperArmR: [0.9, 0, -0.25],
      forearmL: [2.2, 0, 0],
      forearmR: [2.2, 0, 0],
      thighL: [0.3, 0, -0.08],
      thighR: [0.3, 0, 0.08],
      shinL: [-0.45, 0, 0],
      shinR: [-0.45, 0, 0],
      footL: [0.15, 0, 0],
      footR: [0.15, 0, 0],
    },
  },
  squat: {
    label: 'Agachado',
    pose: {
      abdomen: [-0.3, 0, 0],
      chest: [-0.2, 0, 0],
      upperArmL: [1.3, 0, 0],
      upperArmR: [1.3, 0, 0],
      forearmL: [0.3, 0, 0],
      forearmR: [0.3, 0, 0],
      thighL: [1.6, 0, -0.15],
      thighR: [1.6, 0, 0.15],
      shinL: [-2.0, 0, 0],
      shinR: [-2.0, 0, 0],
      footL: [0.4, 0, 0],
      footR: [0.4, 0, 0],
    },
  },
  sit: {
    label: 'Sentado',
    pose: {
      thighL: [1.55, 0, 0],
      thighR: [1.55, 0, 0],
      shinL: [-1.55, 0, 0],
      shinR: [-1.55, 0, 0],
      forearmL: [1.2, 0, 0],
      forearmR: [1.2, 0, 0],
    },
  },
} satisfies Record<string, { label: string; pose: Pose }>

export type PoseId = keyof typeof POSES
export const POSE_IDS = Object.keys(POSES) as PoseId[]
