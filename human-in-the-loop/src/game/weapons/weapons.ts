import * as THREE from 'three'

/**
 * Dados das armas do jogador. Neste passo só o visual e a troca usam estes
 * valores; tiro (passo 14), mira (15) e golpe (16) usam o resto.
 */
export type WeaponKind = 'hands' | 'gun' | 'melee'

export interface WeaponDef {
  id: string
  name: string
  kind: WeaponKind
  /** Posição do modelo na tela (espaço da câmera) com a arma "na cintura". */
  hip: THREE.Vector3
  hipRotation: THREE.Euler
  /** Peso (kg): influencia balanço e, no passo 28, a inércia. */
  mass: number
  /** Comprimento à frente da câmera (m): perto disso de algo, a arma recolhe e encosta. */
  length: number
  /** Tiro: disparos por segundo, automática, impulso no alvo (N·s), pente. */
  fireRate?: number
  automatic?: boolean
  impulse?: number
  magazine?: number
  /** Recuo da câmera por tiro (rad). */
  recoil?: number
  /** Mira: campo de visão ao mirar pela alça (graus). */
  adsFov?: number
  /** Golpe: impulso máximo (N·s) e alcance (m). */
  meleeImpulse?: number
  reach?: number
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'hands',
    name: 'Mãos',
    kind: 'hands',
    hip: new THREE.Vector3(0, -0.2, -0.38),
    hipRotation: new THREE.Euler(0, 0, 0),
    mass: 0,
    length: 0.35,
    reach: 2,
  },
  {
    id: 'pistol',
    name: 'Pistola',
    kind: 'gun',
    hip: new THREE.Vector3(0.15, -0.15, -0.34),
    hipRotation: new THREE.Euler(0, 0.04, 0),
    mass: 0.9,
    length: 0.5,
    recoil: 0.014,
    fireRate: 6,
    automatic: false,
    impulse: 12,
    magazine: 12,
    adsFov: 55,
  },
  {
    id: 'rifle',
    name: 'Rifle',
    kind: 'gun',
    hip: new THREE.Vector3(0.15, -0.165, -0.5),
    hipRotation: new THREE.Euler(0, 0.04, 0),
    mass: 3.5,
    length: 0.8,
    recoil: 0.009,
    fireRate: 10,
    automatic: true,
    impulse: 16,
    magazine: 30,
    adsFov: 45,
  },
  {
    id: 'bat',
    name: 'Taco',
    kind: 'melee',
    hip: new THREE.Vector3(0.2, -0.22, -0.4),
    hipRotation: new THREE.Euler(0.5, 0.15, -0.35),
    mass: 1.0,
    length: 0.85,
    meleeImpulse: 90,
    reach: 1.9,
  },
]
