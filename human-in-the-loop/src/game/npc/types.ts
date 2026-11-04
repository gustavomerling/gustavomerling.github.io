import type * as THREE from 'three'
import type { RAPIER, Physics } from '../engine/physics'
import type { Npc } from './Npc'
import type { Region } from './Damage'

/**
 * Tipos de NPC. A simulação tem sempre UM NPC; o jogador escolhe o tipo
 * (menu inicial / ajustes). O tipo define o cérebro (decisões) e a ficha
 * (NpcConfig: números do corpo e da percepção). O corpo (Npc) é o mesmo.
 */
export type NpcKind = 'civilian' | 'zombie' | 'armed'

export const NPC_KINDS: readonly NpcKind[] = ['civilian', 'zombie', 'armed']

export const NPC_KIND_LABELS: Record<NpcKind, string> = {
  civilian: 'Civil',
  zombie: 'Zumbi',
  armed: 'Armado',
}

/** Ficha do tipo: só números. Quem cuida do comportamento é o cérebro. */
export interface NpcConfig {
  /** Força inicial dos motores (0 mole .. 1 estátua); o slider do painel sobrescreve. */
  strength: number
  /** Multiplicador das velocidades da marcha (GAIT.walkSpeed/runSpeed). 1 = normal. */
  speed: number
  /** Visão: meio-ângulo do cone (rad) e alcance (m). */
  vision: { fovHalf: number; range: number }
  /** Resistência a dano: divide a força dos golpes nos ferimentos. 1 = normal, 2 = aguenta o dobro. */
  resistance: number
}

export const NPC_CONFIGS: Record<NpcKind, NpcConfig> = {
  civilian: { strength: 0.6, speed: 1, vision: { fovHalf: 1.15, range: 30 }, resistance: 1 },
  // Valores provisórios: os agentes de zumbi/armado ajustam.
  zombie: { strength: 0.6, speed: 0.7, vision: { fovHalf: 0.9, range: 20 }, resistance: 2 },
  armed: { strength: 0.7, speed: 1, vision: { fovHalf: 1.15, range: 40 }, resistance: 1.2 },
}

/** O que o NPC sabe do jogador neste passo (vem do Game). */
export interface PlayerInfo {
  eye: THREE.Vector3
  aimDir: THREE.Vector3
  /** 0..1: quanto está mirando pela alça. */
  ads: number
  weapon: 'gun' | 'melee' | 'hands' | 'tool'
  /** Golpe corpo a corpo em andamento. */
  swinging: boolean
  collider: RAPIER.Collider
  /** Empurra o jogador (m/s no plano; decai sozinho) e o deixa lento neste passo (fração da velocidade). */
  shove?: (x: number, z: number) => void
  slow?: (factor: number) => void
  /** Tira vida do jogador (modos zumbi/SWAT; no sandbox não faz nada). */
  damage?: (amount: number, from?: THREE.Vector3) => void
}

/** Tudo que um cérebro recebe a cada passo fixo. */
export interface BrainContext {
  player: PlayerInfo
}

/** Estado exposto ao painel de debug (cada cérebro preenche o que fizer sentido). */
export interface BrainDebug {
  /** Nome do estado atual (livre: 'idle', 'chase', 'aim'...). */
  ai: string
  sees: boolean
  aimed: boolean
  threat: number
  reflex: string
  cover: boolean
  /** Resumo da memória (texto livre; vazio se o cérebro não tem). */
  memory: string
}

/** Argumentos do construtor de qualquer cérebro. */
export interface BrainDeps {
  npc: Npc
  physics: Physics
  scene: THREE.Scene
  config: NpcConfig
  /** Colisor do jogador (alvo dos tiros do NPC armado). */
  playerCollider: RAPIER.Collider
}

/**
 * Contrato de um cérebro. Não move o corpo direto: usa a API do Npc
 * (move, crouch, lookTarget, overlay...). Game chama update a cada passo
 * fixo, antes de npc.update.
 */
export interface NpcBrain {
  readonly kind: NpcKind
  /** IA ligada (desligada: o NPC só se equilibra). */
  enabled: boolean
  readonly debug: BrainDebug
  /** Cone de visão (debug); Game liga/desliga `visible`. */
  readonly cone: THREE.Object3D
  update(dt: number, ctx: BrainContext): void
  /** Chamado quando a simulação reinicia (R) ou o NPC é recolocado. */
  reset(): void
  /** Ordem de debug (M): andar/correr até um ponto. */
  walkTo(point: THREE.Vector3, run: boolean): void
  /** Ouviu algo (tiro, golpe) em `point`; `fright` 0..1. */
  notice(point: THREE.Vector3, fright: number): void
  /** Levou dano numa região. */
  wounded(region: Region): void
  dispose(): void
}
