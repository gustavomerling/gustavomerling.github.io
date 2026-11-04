import * as THREE from 'three'

/**
 * Dados das armas do jogador. Neste passo só o visual e a troca usam estes
 * valores; tiro (passo 14), mira (15) e golpe (16) usam o resto.
 */
export type WeaponKind = 'hands' | 'gun' | 'melee' | 'tool'

export interface WeaponDef {
  id: string
  name: string
  kind: WeaponKind
  /** Posição do modelo na tela (espaço da câmera) com a arma "na cintura". */
  hip: THREE.Vector3
  hipRotation: THREE.Euler
  /** Peso (kg): quanto mais pesada, mais a arma "fica para trás" e mais lenta a mira. */
  mass: number
  /**
   * Inércia (passo 28), 0..1: fração do giro da câmera que a arma não
   * acompanha na hora (ela fica no lugar e a mola a traz de volta).
   * Deriva do peso se omitido.
   */
  inertia?: number
  /** Frequência da mola que segura a arma na mão (Hz): menor = mais mole. */
  swayFreq?: number
  /** Só fica disponível depois de pegar do chão (menu de spawn). */
  pickupOnly?: boolean
  /** Tiro de chumbo: projéteis por disparo e dispersão (rad). */
  pellets?: number
  spread?: number
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
  /** Distância da alça até o olho ao mirar (m) e tempo para levantar a arma (s). */
  adsEye?: number
  adsTime?: number
  /** Respiração ao mirar: amplitude (rad) do balanço da mira. */
  breath?: number
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
    inertia: 0,
    swayFreq: 9,
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
    inertia: 0.3,
    swayFreq: 7,
    length: 0.5,
    recoil: 0.014,
    fireRate: 6,
    automatic: false,
    impulse: 12,
    magazine: 12,
    adsFov: 55,
    adsEye: 0.26,
    adsTime: 0.14,
    breath: 0.0016,
  },
  {
    id: 'rifle',
    name: 'Rifle',
    kind: 'gun',
    hip: new THREE.Vector3(0.15, -0.165, -0.5),
    hipRotation: new THREE.Euler(0, 0.04, 0),
    mass: 3.5,
    inertia: 0.65,
    swayFreq: 3.8,
    length: 0.8,
    recoil: 0.009,
    fireRate: 10,
    automatic: true,
    impulse: 16,
    magazine: 30,
    adsFov: 45,
    adsEye: 0.16,
    adsTime: 0.24,
    breath: 0.0011,
  },
  {
    id: 'bat',
    name: 'Taco',
    kind: 'melee',
    hip: new THREE.Vector3(0.2, -0.22, -0.4),
    hipRotation: new THREE.Euler(0.5, 0.15, -0.35),
    mass: 1.0,
    inertia: 0.45,
    swayFreq: 5,
    length: 0.85,
    meleeImpulse: 90,
    reach: 1.9,
  },
  {
    // Arma de ferramentas do sandbox (congelar, corda, mola, ímã).
    id: 'tool',
    name: 'Ferramentas',
    kind: 'tool',
    hip: new THREE.Vector3(0.15, -0.16, -0.36),
    hipRotation: new THREE.Euler(0, 0.04, 0),
    mass: 1.2,
    inertia: 0.35,
    swayFreq: 6,
    length: 0.5,
  },
  {
    // Só aparece pegando do chão (menu de spawn).
    id: 'shotgun',
    name: 'Espingarda',
    kind: 'gun',
    hip: new THREE.Vector3(0.15, -0.17, -0.46),
    hipRotation: new THREE.Euler(0, 0.04, 0),
    mass: 3.2,
    inertia: 0.6,
    swayFreq: 4,
    length: 0.8,
    pickupOnly: true,
    recoil: 0.045,
    fireRate: 1.4,
    automatic: false,
    impulse: 5,
    pellets: 8,
    spread: 0.06,
    magazine: 6,
    adsFov: 55,
    adsEye: 0.2,
    adsTime: 0.26,
    breath: 0.0012,
  },
]

export const weaponIndex = (id: string) => WEAPONS.findIndex((w) => w.id === id)
