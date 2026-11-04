import * as THREE from 'three'
import type { Region } from './Damage'

/**
 * Memória do NPC: o que ele sabe e lembra, com decaimento por tempo.
 * Sem física nem Three além de vetores: o Brain alimenta e consulta.
 */
export const MEMORY = {
  /** Quanto tempo (s) lembra da última posição vista do jogador. */
  playerSpan: 25,
  shotSpan: 20,
  maxShots: 6,
  /** Cobertura usada/exposta: esquecida depois disto (s). */
  coverSpan: 40,
  /** Raio (m) em que duas posições contam como a mesma cobertura. */
  coverRadius: 1.6,
  woundSpan: 60,
  dangerSpan: 12,
  maxDangers: 5,
  /** Cautela: cada ferida soma isto (0..1) e ela decai por segundo. */
  cautionPerWound: 0.35,
  cautionDecay: 0.01,
}

interface Stamp {
  pos: THREE.Vector3
  t: number
}

export interface WoundRecord {
  region: Region
  /** Lado do corpo: esquerdo, direito ou centro. */
  side: 'L' | 'R' | 'C'
  /** De onde veio (se soube); null = desconhecido. */
  from: THREE.Vector3 | null
  t: number
}

export class Memory {
  /** Relógio interno (s). */
  private now = 0
  private player: Stamp | null = null
  private shots: Stamp[] = []
  private usedCovers: Stamp[] = []
  private badCovers: Stamp[] = []
  private wounds: WoundRecord[] = []
  private dangers: (Stamp & { speed: number })[] = []
  private cautionBase = 0

  clear() {
    this.player = null
    this.shots = []
    this.usedCovers = []
    this.badCovers = []
    this.wounds = []
    this.dangers = []
    this.cautionBase = 0
  }

  update(dt: number) {
    this.now += dt
    this.cautionBase = Math.max(0, this.cautionBase - MEMORY.cautionDecay * dt)
    if (this.player && this.age(this.player) > MEMORY.playerSpan) this.player = null
    this.shots = this.fresh(this.shots, MEMORY.shotSpan)
    this.usedCovers = this.fresh(this.usedCovers, MEMORY.coverSpan)
    this.badCovers = this.fresh(this.badCovers, MEMORY.coverSpan)
    this.dangers = this.fresh(this.dangers, MEMORY.dangerSpan)
    this.wounds = this.wounds.filter((w) => this.now - w.t < MEMORY.woundSpan)
  }

  // --- Registro ---------------------------------------------------------------

  seenPlayer(pos: THREE.Vector3) {
    this.player = { pos: pos.clone(), t: this.now }
  }

  /** Posição de onde veio um tiro (ou golpe). */
  heardShot(pos: THREE.Vector3) {
    const near = this.shots.find((s) => s.pos.distanceTo(pos) < 0.5)
    if (near) near.t = this.now
    else this.shots.push({ pos: pos.clone(), t: this.now })
    if (this.shots.length > MEMORY.maxShots) this.shots.shift()
  }

  coverUsed(pos: THREE.Vector3) {
    this.touch(this.usedCovers, pos)
  }

  /** O jogador deu a volta / acertou o NPC ali: não confiar mais. */
  coverExposed(pos: THREE.Vector3) {
    this.touch(this.badCovers, pos)
  }

  wound(region: Region, from: THREE.Vector3 | null) {
    const side = region === 'armL' || region === 'legL' ? 'L' : region === 'armR' || region === 'legR' ? 'R' : 'C'
    this.wounds.push({ region, side, from: from ? from.clone() : null, t: this.now })
    this.cautionBase = Math.min(1, this.cautionBase + MEMORY.cautionPerWound)
  }

  danger(pos: THREE.Vector3, speed: number) {
    const near = this.dangers.find((d) => d.pos.distanceTo(pos) < 1.5)
    if (near) {
      near.t = this.now
      near.pos.copy(pos)
      near.speed = Math.max(near.speed, speed)
    } else this.dangers.push({ pos: pos.clone(), t: this.now, speed })
    if (this.dangers.length > MEMORY.maxDangers) this.dangers.shift()
  }

  // --- Consulta -----------------------------------------------------------------

  /** Última posição conhecida do jogador, se ainda lembra. */
  lastPlayer() {
    return this.player ? { pos: this.player.pos, age: this.age(this.player) } : null
  }

  /** Cobertura já exposta (não vale a pena de novo). */
  isCoverBad(pos: THREE.Vector3) {
    return this.badCovers.some((c) => c.pos.distanceTo(pos) < MEMORY.coverRadius)
  }

  /** 0..1: sobe com ferimentos recentes, decai devagar. */
  get caution() {
    const recent = this.wounds.reduce((m, w) => Math.max(m, 1 - (this.now - w.t) / MEMORY.woundSpan), 0)
    return Math.min(1, Math.max(this.cautionBase, recent * 0.5))
  }

  get lastWound() {
    return this.wounds[this.wounds.length - 1] ?? null
  }

  /** Texto simples para o painel de debug. */
  summary() {
    const f = (p: THREE.Vector3) => `(${p.x.toFixed(1)}, ${p.z.toFixed(1)})`
    const parts: string[] = []
    if (this.player) parts.push(`jogador visto em ${f(this.player.pos)} há ${this.age(this.player).toFixed(0)}s`)
    if (this.shots.length) {
      const s = this.shots[this.shots.length - 1]
      parts.push(`${this.shots.length} tiro(s), último de ${f(s.pos)} há ${this.age(s).toFixed(0)}s`)
    }
    if (this.usedCovers.length || this.badCovers.length)
      parts.push(`coberturas: ${this.usedCovers.length} usada(s), ${this.badCovers.length} exposta(s)`)
    const w = this.lastWound
    if (w) parts.push(`ferido ${w.region} (lado ${w.side})${w.from ? ` por ${f(w.from)}` : ''} há ${(this.now - w.t).toFixed(0)}s`)
    if (this.dangers.length) parts.push(`${this.dangers.length} objeto(s) perigoso(s)`)
    parts.push(`cautela ${this.caution.toFixed(2)}`)
    return parts.join(' · ')
  }

  private age(s: Stamp) {
    return this.now - s.t
  }

  private fresh<T extends Stamp>(list: T[], span: number) {
    return list.filter((s) => this.now - s.t < span)
  }

  private touch(list: Stamp[], pos: THREE.Vector3) {
    const near = list.find((c) => c.pos.distanceTo(pos) < MEMORY.coverRadius)
    if (near) near.t = this.now
    else list.push({ pos: pos.clone(), t: this.now })
  }
}
