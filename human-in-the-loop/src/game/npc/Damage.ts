import type { PartName } from './skeleton'

/**
 * Dano localizado (estilo People Playground, sem gore): cada parte do corpo
 * tem integridade própria (0–100) e o corpo tem uma "dor" global que sobe
 * com cada ferimento e cai com o tempo.
 */

export type Region = 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR'
export type HitKind = 'shot' | 'melee'

export const REGION_OF: Record<PartName, Region> = {
  head: 'head',
  chest: 'torso',
  abdomen: 'torso',
  pelvis: 'torso',
  upperArmL: 'armL',
  forearmL: 'armL',
  handL: 'armL',
  upperArmR: 'armR',
  forearmR: 'armR',
  handR: 'armR',
  thighL: 'legL',
  shinL: 'legL',
  footL: 'legL',
  thighR: 'legR',
  shinR: 'legR',
  footR: 'legR',
}

export const REGIONS: Region[] = ['head', 'torso', 'armL', 'armR', 'legL', 'legR']

/** Peso de cada região na saúde geral. */
const REGION_WEIGHT: Record<Region, number> = { head: 0.15, torso: 0.35, armL: 0.08, armR: 0.08, legL: 0.17, legR: 0.17 }

export const DAMAGE = {
  /** Dano por N·s de impulso. */
  perImpulse: { shot: 2.5, melee: 0.5 } as Record<HitKind, number>,
  /** Multiplicador na cabeça. */
  headMultiplier: { shot: 2.5, melee: 1.5 } as Record<HitKind, number>,
  /** Dor adicionada por ponto de dano, e quanto cai por segundo. */
  painPerDamage: 1 / 70,
  painDecay: 0.12,
  /** Dano na cabeça num único golpe que desmaia (pontos). */
  knockoutHeadDamage: 25,
}

/** Abaixo desta saúde geral, desmaia até o reset. */
export const OUT_COLD = 30

export interface DamageEvent {
  part: PartName
  amount: number
  /** O golpe na cabeça foi forte o bastante para desmaiar. */
  knockout: boolean
}

export class Damage {
  readonly health = new Map<PartName, number>()
  pain = 0

  constructor() {
    this.reset()
  }

  reset() {
    for (const p of Object.keys(REGION_OF) as PartName[]) this.health.set(p, 100)
    this.pain = 0
  }

  apply(part: PartName, impulse: number, kind: HitKind): DamageEvent {
    const head = REGION_OF[part] === 'head'
    const amount = impulse * DAMAGE.perImpulse[kind] * (head ? DAMAGE.headMultiplier[kind] : 1)
    this.health.set(part, Math.max(0, this.health.get(part)! - amount))
    this.pain = Math.min(1, this.pain + amount * DAMAGE.painPerDamage)
    return { part, amount, knockout: head && amount >= DAMAGE.knockoutHeadDamage }
  }

  update(dt: number) {
    this.pain = Math.max(0, this.pain - DAMAGE.painDecay * dt)
  }

  /**
   * Integridade de uma região (0–100): metade média, metade a pior parte.
   * Assim um antebraço destruído compromete o braço, mesmo com o resto bem.
   */
  region(r: Region) {
    let sum = 0
    let n = 0
    let min = 100
    for (const [p, h] of this.health) {
      if (REGION_OF[p] !== r) continue
      sum += h
      n++
      min = Math.min(min, h)
    }
    return n ? (sum / n + min) / 2 : 100
  }

  /** Saúde geral ponderada (0–100). */
  get overall() {
    return REGIONS.reduce((acc, r) => acc + this.region(r) * REGION_WEIGHT[r], 0)
  }

  /** Dá para ficar em pé? Precisa das duas pernas razoáveis. */
  get canStand() {
    const l = this.region('legL')
    const r = this.region('legR')
    return Math.min(l, r) >= 35 && (l + r) / 2 >= 55 && this.overall >= OUT_COLD
  }
}
