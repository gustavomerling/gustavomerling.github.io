import * as THREE from 'three'
import type { Physics, RAPIER } from '../engine/physics'
import type { Pose } from './poses'

/**
 * Terreno e naturalidade do caminhar. Só funções puras e um pouco de estado,
 * para o Npc.ts mudar pouco: raycast por pé (degraus, rampas, caixas baixas),
 * variação de passada e ociosidade viva.
 */

export const TERRAIN = {
  /** Altura do centro do pé acima do chão quando pisado (m). */
  footRest: 0.045,
  /** Quanto acima do pé o raio começa e seu alcance (m). */
  rayUp: 0.6,
  rayLen: 1.6,
  /** Folga extra do pé sobre a quina do degrau (m). */
  clearance: 0.05,
  /** Degrau mais alto que o NPC tenta subir andando (m). */
  maxStep: 0.4,
  /** Largura de pisada plana exigida ao escolher o ponto (m, meia-pisada). */
  halfFoot: 0.13,
  /** Tolerância de desnível dentro da pisada (m). */
  flatTol: 0.04,
}

type Filter = (collider: RAPIER.Collider) => boolean

/** Chão sob (x, z) olhando de `fromY` para baixo; ignora o ragdoll e corpos leves. */
export function groundAt(physics: Physics, x: number, z: number, fromY: number, accept: Filter): number | null {
  return groundHit(physics, x, z, fromY, accept)?.y ?? null
}

/**
 * Como `groundAt`, mas diz também se o que está ali é "chão firme" (fixo).
 * Objeto solto (caixa, móvel) não é chão: ele não sobe nem pisa em cima.
 */
export function groundHit(physics: Physics, x: number, z: number, fromY: number, accept: Filter): { y: number; fixed: boolean } | null {
  const ray = { origin: { x, y: fromY, z }, dir: { x: 0, y: -1, z: 0 } }
  const hit = physics.world.castRay(ray as never, TERRAIN.rayLen, true, undefined, undefined, undefined, undefined, accept)
  if (!hit) return null
  const b = hit.collider.parent()
  return { y: fromY - hit.timeOfImpact, fixed: !b || b.isFixed() || b.isKinematic() }
}

export interface SwingLike {
  start: THREE.Vector3
  target: THREE.Vector3
  duration: number
  height: number
}

/**
 * Ajusta um passo ao relevo: escolhe uma pisada plana perto do alvo, põe o
 * pé na altura do chão ali e levanta o pé o bastante para passar pela quina
 * do degrau. Só sobe em chão fixo (degrau, rampa); objeto solto ou alto
 * demais no caminho encurta o passo (o pé para antes dele, não pisa em
 * cima). Devolve a diferença de altura (m), usada para desacelerar.
 */
export function adaptSwing(physics: Physics, swing: SwingLike, accept: Filter): number {
  const { start, target } = swing
  const top = Math.max(start.y, target.y) + TERRAIN.rayUp
  const gStart = start.y - TERRAIN.footRest
  const probe = (x: number, z: number) => groundHit(physics, x, z, top, accept)
  /** Dá para pisar: chão fixo até um degrau, ou algo solto rente ao chão. */
  const walkable = (h: { y: number; fixed: boolean } | null) =>
    h !== null && h.y - gStart <= (h.fixed ? TERRAIN.maxStep : TERRAIN.flatTol)
  const dx = target.x - start.x
  const dz = target.z - start.z
  const len = Math.hypot(dx, dz)
  const ux = len > 1e-3 ? dx / len : 0
  const uz = len > 1e-3 ? dz / len : -1

  // Obstáculo no caminho que não dá para pisar: o passo termina antes dele.
  let reach = len
  for (let d = 0.1; d <= len + TERRAIN.halfFoot; d += 0.08) {
    if (!walkable(probe(start.x + ux * d, start.z + uz * d))) {
      reach = Math.max(0, d - TERRAIN.halfFoot - 0.04)
      break
    }
  }
  if (reach < len) {
    target.x = start.x + ux * reach
    target.z = start.z + uz * reach
  }

  // Pisada plana: tenta o alvo e deslocamentos curtos ao longo do passo
  // (para a frente só se não estiver encurtado por um obstáculo).
  const offs = reach < len ? [0, -0.08, -0.16, -0.24] : [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24]
  let best: { off: number; ground: number } | null = null
  for (const off of offs) {
    if (reach + off < 0) continue
    const cx = target.x + ux * off
    const cz = target.z + uz * off
    const a = probe(cx - ux * TERRAIN.halfFoot, cz - uz * TERRAIN.halfFoot)
    const b = probe(cx, cz)
    const c = probe(cx + ux * TERRAIN.halfFoot, cz + uz * TERRAIN.halfFoot)
    if (!walkable(a) || !walkable(b) || !walkable(c)) continue
    const lo = Math.min(a!.y, b!.y, c!.y)
    const hi = Math.max(a!.y, b!.y, c!.y)
    if (hi - lo <= TERRAIN.flatTol) {
      best = { off, ground: (a!.y + b!.y + c!.y) / 3 }
      break
    }
    // Rampa: sem pisada plana, mas sem quina (desnível suave e linear).
    if (!best && Math.abs(c!.y - 2 * b!.y + a!.y) < 0.02 && hi - lo < 0.14) best = { off, ground: b!.y }
  }
  const gTarget = best?.ground ?? (walkable(probe(target.x, target.z)) ? probe(target.x, target.z)!.y : null)
  if (gTarget === null) {
    // Nenhum lugar bom: arrasta o pé só um pouco, sem subir em nada.
    target.set(start.x + ux * Math.min(reach, 0.1), start.y, start.z + uz * Math.min(reach, 0.1))
    return 0
  }
  if (best && best.off !== 0) {
    target.x += ux * best.off
    target.z += uz * best.off
  }
  target.y = gTarget + TERRAIN.footRest

  // Altura do obstáculo no caminho (quina do degrau, caixa baixa).
  let maxGround = Math.max(gTarget, gStart)
  for (const u of [0.2, 0.4, 0.6, 0.8, 1.0]) {
    const h = probe(start.x + (target.x - start.x) * u + ux * 0.1, start.z + (target.z - start.z) * u + uz * 0.1)
    if (h && walkable(h) && h.y > maxGround) maxGround = h.y
  }
  const peak = maxGround + TERRAIN.footRest + TERRAIN.clearance
  // A trajetória sobe uma senoide por cima da reta; o pico fica em ~meio da reta.
  const mid = (start.y + target.y) / 2
  const need = Math.max(0, peak - mid)
  if (need > swing.height) {
    swing.height = need
    swing.duration *= 1 + Math.min(0.35, (need - 0.08) * 1.5)
  }
  return target.y - start.y
}

/** Variação de passada: cadência por velocidade e leve assimetria (por NPC). */
export class Stride {
  /** Fator fixo de cada lado (um passo um pouco mais curto/lento que o outro). */
  readonly side = { L: 1 + (Math.random() - 0.5) * 0.08, R: 1 + (Math.random() - 0.5) * 0.08 }
  private wobble = 0
  private wobbleV = 0

  /** Fator da duração do passo: devagar = passo lento e curto; rápido = cadência alta. */
  duration(speed: number, walkSpeed: number, runSpeed: number, side: 'L' | 'R', dt = 1 / 60): number {
    this.wobbleV += (Math.random() - 0.5) * 0.6 * dt - this.wobble * 2 * dt
    this.wobble = THREE.MathUtils.clamp(this.wobble + this.wobbleV, -0.05, 0.05)
    const k = THREE.MathUtils.clamp(speed / Math.max(0.1, walkSpeed), 0, 1.6)
    const kRun = THREE.MathUtils.clamp((speed - walkSpeed) / Math.max(0.1, runSpeed - walkSpeed), 0, 1)
    // 1,22 quase parado, 1,0 andando. Correndo, a cadência fica fixa: variar
    // a duração do passo em corrida faz tropeçar nas curvas (bancada: zigue-zague).
    const cadence = 1.22 - 0.22 * Math.min(1, k)
    const vary = 1 - kRun
    return cadence * (1 + (this.side[side] - 1) * vary) * (1 + this.wobble * vary)
  }
}

/**
 * Ociosidade viva: parado ele transfere o peso de um pé para o outro,
 * respira e ajusta a postura aos poucos, em vez de ficar uma estátua.
 */
export class Idle {
  private t = Math.random() * 100
  /** -1 = peso na esquerda, 1 = na direita; vai em direção a `goal`. */
  weight = 0
  private goal = 0
  private nextShift = 1.5
  private lookT = 0
  active = false

  reset() {
    this.weight = 0
    this.goal = 0
    this.nextShift = 1.5 + Math.random() * 2
  }

  update(dt: number, active: boolean) {
    this.t += dt
    this.active = active || Math.abs(this.weight) > 0.02
    if (!active) {
      this.weight += (0 - this.weight) * (1 - Math.exp(-2 * dt))
      this.nextShift = 1.5 + Math.random() * 2
      return
    }
    this.nextShift -= dt
    if (this.nextShift <= 0) {
      this.nextShift = 3 + Math.random() * 5
      const r = Math.random()
      this.goal = r < 0.25 ? 0 : this.weight > 0.2 ? -(0.4 + Math.random() * 0.6) : this.weight < -0.2 ? 0.4 + Math.random() * 0.6 : Math.random() < 0.5 ? -0.7 : 0.7
    }
    this.weight += (this.goal - this.weight) * (1 - Math.exp(-0.9 * dt))
    this.lookT += dt
  }

  /** Quanto o equilíbrio é deslocado para o pé de apoio (0..1 de um lado ao outro). */
  get bias() {
    return this.weight
  }

  /**
   * Soma à pose: peso num pé (o outro joelho relaxa, quadril cai de leve),
   * respiração no peito e pequenos ajustes de ombro e cabeça.
   */
  apply(pose: Pose, amount: number) {
    if (amount < 0.01) return
    const add = (name: keyof Pose, dx: number, dy: number, dz: number) => {
      const b = pose[name] ?? [0, 0, 0]
      pose[name] = [b[0] + dx * amount, b[1] + dy * amount, b[2] + dz * amount]
    }
    const w = this.weight
    const breath = Math.sin(this.t * 1.5)
    const slow = Math.sin(this.t * 0.37) * Math.sin(this.t * 0.23 + 1)
    // Perna sem peso: joelho dobra um pouco e a coxa abre.
    add('shinL', -0.2 * Math.max(0, w), 0, 0)
    add('shinR', -0.2 * Math.max(0, -w), 0, 0)
    add('thighL', 0.08 * Math.max(0, w), 0, -0.05 * w)
    add('thighR', 0.08 * Math.max(0, -w), 0, -0.05 * w)
    // Tronco compensa a transferência.
    add('abdomen', 0.02 * breath, 0.06 * slow, 0.05 * w)
    add('chest', 0.025 * breath, 0.05 * Math.sin(this.t * 0.31), -0.04 * w)
    add('head', 0.04 * slow, 0.1 * Math.sin(this.t * 0.19 + 2), 0.03 * w)
    // Braços folgam, um pouco mais para o lado sem peso.
    add('upperArmL', 0.04 * slow, 0, -0.02 * breath)
    add('upperArmR', -0.04 * slow, 0, 0.02 * breath)
  }
}
