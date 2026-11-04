/**
 * Definição do corpo do NPC (pose de referência, em pé).
 *
 * Convenções (espaço local do NPC, origem entre os pés no chão):
 * - +Y para cima, o NPC olha para -Z (como a câmera do Three), +X é a direita dele.
 * - Na pose de referência todas as partes têm rotação identidade, então a
 *   rotação relativa entre duas partes é zero e os limites das juntas são
 *   medidos a partir dessa pose.
 * - Ângulo em torno de X: para um osso que aponta PARA BAIXO (braço, perna),
 *   positivo leva a ponta para a frente (-Z). Para um osso que aponta PARA
 *   CIMA (tronco, cabeça), positivo leva para trás.
 * - Ângulo em torno de Z: positivo leva a ponta de um osso que aponta para
 *   baixo para +X (direita).
 *
 * Massas somam ~74 kg, distribuídas como num adulto.
 */

export type PartName =
  | 'pelvis'
  | 'abdomen'
  | 'chest'
  | 'head'
  | 'upperArmL'
  | 'upperArmR'
  | 'forearmL'
  | 'forearmR'
  | 'handL'
  | 'handR'
  | 'thighL'
  | 'thighR'
  | 'shinL'
  | 'shinR'
  | 'footL'
  | 'footR'

export type Shape =
  | { kind: 'box'; size: [number, number, number] }
  /** Cápsula vertical: comprimento total (com as pontas) e raio. */
  | { kind: 'capsule'; length: number; radius: number }
  | { kind: 'sphere'; radius: number }

export interface PartDef {
  name: PartName
  center: [number, number, number]
  shape: Shape
  mass: number
}

type Range = [number, number]

export interface JointDef {
  parent: PartName
  child: PartName
  /** Ponto da junta na pose de referência. */
  anchor: [number, number, number]
  /** Esférica: 3 eixos com limites. Dobradiça: gira só em torno de X. */
  type: 'ball' | 'hinge'
  limits: { x: Range; y?: Range; z?: Range }
}

// Medidas principais (m)
const SHOULDER_Y = 1.5
const SHOULDER_X = 0.25
const ELBOW_Y = 1.22
const WRIST_Y = 0.97
const HIP_Y = 0.92
const HIP_X = 0.1
const KNEE_Y = 0.5
const ANKLE_Y = 0.085

const mid = (a: number, b: number) => (a + b) / 2

export const PARTS: PartDef[] = [
  { name: 'pelvis', center: [0, 0.98, 0], shape: { kind: 'box', size: [0.32, 0.2, 0.2] }, mass: 11 },
  { name: 'abdomen', center: [0, 1.17, 0], shape: { kind: 'box', size: [0.29, 0.18, 0.18] }, mass: 9 },
  { name: 'chest', center: [0, 1.4, 0], shape: { kind: 'box', size: [0.36, 0.28, 0.21] }, mass: 15 },
  { name: 'head', center: [0, 1.67, 0], shape: { kind: 'sphere', radius: 0.11 }, mass: 5.5 },
  ...(['L', 'R'] as const).flatMap((s): PartDef[] => {
    const x = s === 'R' ? SHOULDER_X : -SHOULDER_X
    const hx = s === 'R' ? HIP_X : -HIP_X
    return [
      {
        name: `upperArm${s}`,
        center: [x, mid(SHOULDER_Y, ELBOW_Y), 0],
        shape: { kind: 'capsule', length: SHOULDER_Y - ELBOW_Y, radius: 0.05 },
        mass: 2.2,
      },
      {
        name: `forearm${s}`,
        center: [x, mid(ELBOW_Y, WRIST_Y), 0],
        shape: { kind: 'capsule', length: ELBOW_Y - WRIST_Y, radius: 0.043 },
        mass: 1.4,
      },
      { name: `hand${s}`, center: [x, WRIST_Y - 0.085, 0], shape: { kind: 'box', size: [0.04, 0.17, 0.09] }, mass: 0.5 },
      {
        name: `thigh${s}`,
        center: [hx, mid(HIP_Y, KNEE_Y), 0],
        shape: { kind: 'capsule', length: HIP_Y - KNEE_Y, radius: 0.07 },
        mass: 8,
      },
      {
        name: `shin${s}`,
        center: [hx, mid(KNEE_Y, ANKLE_Y), 0],
        shape: { kind: 'capsule', length: KNEE_Y - ANKLE_Y, radius: 0.052 },
        mass: 3.7,
      },
      // Pé: calcanhar um pouco atrás do tornozelo, dedos à frente (-Z).
      { name: `foot${s}`, center: [hx, 0.04, -0.05], shape: { kind: 'box', size: [0.1, 0.08, 0.25] }, mass: 1.1 },
    ]
  }),
]

export const JOINTS: JointDef[] = [
  // Tronco e cabeça (ossos para cima: X negativo = curvar para a frente)
  { parent: 'pelvis', child: 'abdomen', anchor: [0, 1.08, 0], type: 'ball', limits: { x: [-0.6, 0.3], y: [-0.4, 0.4], z: [-0.3, 0.3] } },
  { parent: 'abdomen', child: 'chest', anchor: [0, 1.26, 0], type: 'ball', limits: { x: [-0.5, 0.25], y: [-0.4, 0.4], z: [-0.25, 0.25] } },
  { parent: 'chest', child: 'head', anchor: [0, 1.555, 0], type: 'ball', limits: { x: [-0.7, 0.5], y: [-1.1, 1.1], z: [-0.4, 0.4] } },
  ...(['L', 'R'] as const).flatMap((s): JointDef[] => {
    const right = s === 'R'
    const x = right ? SHOULDER_X : -SHOULDER_X
    const hx = right ? HIP_X : -HIP_X
    // Abrir para o lado: +Z na direita, -Z na esquerda.
    const side = (inward: number, outward: number): Range => (right ? [-inward, outward] : [-outward, inward])
    return [
      // Ombro: frente até acima da cabeça, para trás pouco.
      { parent: 'chest', child: `upperArm${s}`, anchor: [x, SHOULDER_Y, 0], type: 'ball', limits: { x: [-0.9, 2.8], y: [-1.2, 1.2], z: side(0.25, 2.6) } },
      // Cotovelo: só dobra para a frente.
      { parent: `upperArm${s}`, child: `forearm${s}`, anchor: [x, ELBOW_Y, 0], type: 'hinge', limits: { x: [0, 2.5] } },
      { parent: `forearm${s}`, child: `hand${s}`, anchor: [x, WRIST_Y, 0], type: 'ball', limits: { x: [-1.0, 1.0], y: [-0.5, 0.5], z: side(0.3, 0.4) } },
      // Quadril: perna à frente até 2 rad, para trás 0,5.
      { parent: 'pelvis', child: `thigh${s}`, anchor: [hx, HIP_Y, 0], type: 'ball', limits: { x: [-0.5, 2.0], y: [-0.6, 0.6], z: side(0.3, 0.9) } },
      // Joelho: só dobra para trás (pé vai para +Z).
      { parent: `thigh${s}`, child: `shin${s}`, anchor: [hx, KNEE_Y, 0], type: 'hinge', limits: { x: [-2.4, 0] } },
      { parent: `shin${s}`, child: `foot${s}`, anchor: [hx, ANKLE_Y, 0], type: 'ball', limits: { x: [-0.8, 0.55], y: [-0.25, 0.25], z: [-0.3, 0.3] } },
    ]
  }),
]
