// Tipos centrais do jogo. Coordenadas em METROS, eixo Y para BAIXO
// (mesma convenção do SVG, então física e desenho usam os mesmos números).
// Ângulos em radianos, positivo = sentido horário na tela.

export interface Vec {
  x: number
  y: number
}

export interface Pose {
  x: number
  y: number
  angle: number
}

export type PartKind = 'block' | 'suspension' | 'axle' | 'wheel' | 'flag'

/** Uma peça colocada no carro. x/y são relativos ao centro do chassi. */
export interface Part {
  id: string
  kind: PartKind
  typeId: string
  /** Suspensão: posição do CUBO (ponta de baixo). Eixo: pivô central. */
  x: number
  y: number
  /** Suspensão, eixo, bloco e bandeira podem ser girados. */
  angle?: number
  /** Só rodas: false = roda livre (sem motor). */
  driven?: boolean
}

export interface CarDesign {
  chassisId: string
  /** Contorno desenhado pelo jogador (quando chassisId === 'custom'). */
  customChassis?: Vec[]
  parts: Part[]
}

/** Posições de tudo que compõe o carro, num frame qualquer (editor ou simulação). */
export interface CarPoses {
  chassis: Pose
  parts: Record<string, Pose>
  springs: Record<string, { top: Vec; bottom: Vec }>
  /** Rodas gosmentas: contorno deformado (coordenadas do mundo). */
  blobs: Record<string, Vec[]>
  /** Carga da caçamba (mesma ordem de ChassisDef.cargo). */
  cargo: Pose[]
  /** Estado das bandeiras (pose da base fica em `parts`). */
  flags: Record<string, FlagState>
}

export interface FlagState {
  /** Envergadura da haste (rad, + = ponta para a direita da haste). */
  bend: number
  /** Fase da ondulação do pano. */
  phase: number
  /** 0..1: quanto o pano tremula (cresce com a velocidade). */
  flutter: number
  /** -1 = pano para a esquerda da haste, +1 = direita (vira quando dá ré). */
  trail: number
}

export const REST_FLAG: FlagState = { bend: 0, phase: 0, flutter: 0.15, trail: -1 }
