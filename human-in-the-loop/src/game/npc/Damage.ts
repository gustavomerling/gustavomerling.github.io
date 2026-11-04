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
  /**
   * Desmembramento: a parte atinge a integridade `health` (ou menos) com um
   * golpe de pelo menos `minHit` pontos (tiro forte ou golpe pesado), e já
   * estava com no máximo `before` antes do golpe. Na cabeça, o primeiro tiro
   * mata; só um segundo golpe forte a arranca.
   */
  dismember: {
    limb: { health: 10, minHit: 15, before: 100 },
    head: { health: 0, minHit: 40, before: 30 },
  },
}

/** Abaixo desta saúde geral, desmaia até o reset. */
export const OUT_COLD = 30

/** Peso de cada parte na vida total (soma 1). Cabeça e tronco pesam mais. */
export const PART_WEIGHT: Record<PartName, number> = {
  head: 0.25,
  chest: 0.22,
  abdomen: 0.11,
  pelvis: 0.11,
  upperArmL: 0.025,
  forearmL: 0.02,
  handL: 0.01,
  upperArmR: 0.025,
  forearmR: 0.02,
  handR: 0.01,
  thighL: 0.05,
  shinL: 0.035,
  footL: 0.015,
  thighR: 0.05,
  shinR: 0.035,
  footR: 0.015,
}

/** Partes críticas: se uma chegar a 0, a morte é imediata. */
export const CRITICAL_PARTS: PartName[] = ['head', 'chest']

export const BLEED = {
  /** Dano mínimo de um golpe para abrir um ferimento que sangra. */
  minDamage: 3,
  /** Perda de vida por segundo, por ponto de dano do ferimento. */
  perDamage: 0.05,
  /** Fator por região: membros sangram menos que tronco e cabeça. */
  region: { head: 1, torso: 1, armL: 0.3, armR: 0.3, legL: 0.5, legR: 0.5 } as Record<Region, number>,
  /** Máximo por ferimento (vida/s). */
  maxRate: 4,
  /** Quanto cada ferimento estanca por segundo (vida/s). */
  clot: 0.04,
}

export type DeathCause = 'trauma' | 'bleeding' | 'critical'

export interface DamageEvent {
  part: PartName
  amount: number
  /** O golpe na cabeça foi forte o bastante para desmaiar. */
  knockout: boolean
}

export class Damage {
  readonly health = new Map<PartName, number>()
  pain = 0
  /** Zumbi: não morre por trauma/sangramento nem desmaia; só as pernas o derrubam. */
  undying = false
  /** Sangramento atual por parte (vida/s). */
  readonly bleeding = new Map<PartName, number>()
  /** Vida perdida por sangramento (pontos, 0–100). */
  bloodLost = 0

  constructor() {
    this.reset()
  }

  reset() {
    for (const p of Object.keys(REGION_OF) as PartName[]) this.health.set(p, 100)
    this.pain = 0
    this.bleeding.clear()
    this.bloodLost = 0
  }

  apply(part: PartName, impulse: number, kind: HitKind): DamageEvent {
    const head = REGION_OF[part] === 'head'
    const amount = impulse * DAMAGE.perImpulse[kind] * (head ? DAMAGE.headMultiplier[kind] : 1)
    this.health.set(part, Math.max(0, this.health.get(part)! - amount))
    this.pain = Math.min(1, this.pain + amount * DAMAGE.painPerDamage)
    if (amount >= BLEED.minDamage) {
      const rate = Math.min(BLEED.maxRate, (this.bleeding.get(part) ?? 0) + amount * BLEED.perDamage * BLEED.region[REGION_OF[part]])
      this.bleeding.set(part, rate)
    }
    return { part, amount, knockout: head && amount >= DAMAGE.knockoutHeadDamage }
  }

  /**
   * Parte que deve ser destacada depois deste golpe (ou null): só braço,
   * perna e cabeça; dano acumulado acima do limiar e golpe forte.
   */
  severTarget(part: PartName, amount: number, before: number): PartName | null {
    const region = REGION_OF[part]
    if (region === 'torso') return null
    const rule = region === 'head' ? DAMAGE.dismember.head : DAMAGE.dismember.limb
    const health = this.health.get(part)!
    return health <= rule.health && amount >= rule.minHit && before <= rule.before ? part : null
  }

  /** `alive`: só drena a vida enquanto vivo (os ferimentos seguem estancando). */
  update(dt: number, alive = true) {
    this.pain = Math.max(0, this.pain - DAMAGE.painDecay * dt)
    for (const [p, rate] of this.bleeding) {
      if (alive) this.bloodLost = Math.min(100, this.bloodLost + rate * dt)
      const next = rate - BLEED.clot * dt
      if (next <= 0) this.bleeding.delete(p)
      else this.bleeding.set(p, next)
    }
  }

  /** Vida total (0–100): soma ponderada da integridade das partes menos o sangue perdido. */
  get life() {
    let sum = 0
    for (const [p, h] of this.health) sum += h * PART_WEIGHT[p]
    return Math.max(0, sum - this.bloodLost)
  }

  /** Perda de vida por segundo somando todos os ferimentos. */
  get bleedRate() {
    let sum = 0
    for (const r of this.bleeding.values()) sum += r
    return sum
  }

  /** Causa de morte se o corpo já não sobrevive, senão null. */
  get deathCause(): DeathCause | null {
    if (this.undying) return null
    if (CRITICAL_PARTS.some((p) => this.health.get(p)! <= 0)) return 'critical'
    if (this.life > 0) return null
    return this.bloodLost >= 50 ? 'bleeding' : 'trauma'
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
    return Math.min(l, r) >= 35 && (l + r) / 2 >= 55 && (this.undying || this.overall >= OUT_COLD)
  }
}
