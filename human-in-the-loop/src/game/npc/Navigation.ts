import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'

/**
 * Navegação do NPC: grade simples em volta do trajeto e A* (8 vizinhos).
 * Uma célula é bloqueada se o corpo (cápsula do joelho até acima da
 * cabeça) não cabe ali: paredes, muretas e também caixas baixas (o andar
 * só sobe degraus fixos, não em objetos soltos). Com uma ameaça, células
 * à vista dela custam mais: ele prefere o caminho escondido.
 */
export const NAV = {
  cell: 0.4,
  /** Folga em volta do retângulo origem-destino (m). */
  margin: 4,
  /** Máximo de células por lado (se passar, a célula cresce). */
  maxSide: 56,
  /** Corpo: raio (com folga para braços e passada) e altura da base acima do chão (acima de um degrau). */
  radius: 0.4,
  kneeY: 0.45,
  topY: 1.85,
  /** Custo extra por metro à vista da ameaça. */
  exposedCost: 3,
  /** Altura (m) do ponto checado contra a ameaça. */
  exposeY: 1.2,
}

export interface NavFilter {
  /** Colisor do jogador (não conta como obstáculo para a grade). */
  exclude?: RAPIER.Collider
  /** O corpo é do próprio NPC? */
  own: (b: RAPIER.RigidBody) => boolean
}

/** O colisor é obstáculo de verdade (fixo ou pesado) e não do NPC? */
export function solid(c: RAPIER.Collider, own: (b: RAPIER.RigidBody) => boolean) {
  const b = c.parent()
  if (!b) return true
  if (own(b)) return false
  return !b.isDynamic() || b.mass() >= 15
}

export class NavGrid {
  private ox = 0
  private oz = 0
  private cell = NAV.cell
  private nx = 0
  private nz = 0
  private blocked: Int8Array = new Int8Array(0)
  private exposed: Int8Array = new Int8Array(0)
  private readonly capsule = new RAPIER.Capsule((NAV.topY - NAV.kneeY - 2 * NAV.radius) / 2, NAV.radius)

  private readonly physics: Physics
  private readonly filter: NavFilter

  constructor(physics: Physics, filter: NavFilter) {
    this.physics = physics
    this.filter = filter
  }

  /** Caminho (pontos no chão, y = 0) de `from` até `to`, ou null se não há. */
  plan(from: THREE.Vector3, to: THREE.Vector3, threat: THREE.Vector3 | null = null): THREE.Vector3[] | null {
    this.setup(from, to)
    let s = this.index(from)
    let g = this.index(to)
    s = this.nearestFree(s)
    g = this.nearestFree(g)
    if (s < 0 || g < 0) return null
    const nodes = this.astar(s, g, threat)
    if (!nodes) return null
    const pts = this.smooth(nodes, threat).map((i) => this.center(i))
    pts[0] = new THREE.Vector3(from.x, 0, from.z)
    pts.push(new THREE.Vector3(to.x, 0, to.z))
    // Tira o ponto da célula final se ele só faz voltar.
    if (pts.length > 2 && pts[pts.length - 2].distanceTo(pts[pts.length - 1]) < this.cell) pts.splice(pts.length - 2, 1)
    return pts
  }

  /** O corpo cabe em pé em (x, z)? */
  free(x: number, z: number) {
    const cy = (NAV.kneeY + NAV.topY) / 2
    const hit = this.physics.world.intersectionWithShape(
      { x, y: cy, z },
      { x: 0, y: 0, z: 0, w: 1 },
      this.capsule,
      undefined,
      undefined,
      this.filter.exclude,
      undefined,
      (c: RAPIER.Collider) => solid(c, this.filter.own),
    )
    return hit === null || hit === undefined
  }

  // --- Grade ------------------------------------------------------------------

  private setup(a: THREE.Vector3, b: THREE.Vector3) {
    const minX = Math.min(a.x, b.x) - NAV.margin
    const maxX = Math.max(a.x, b.x) + NAV.margin
    const minZ = Math.min(a.z, b.z) - NAV.margin
    const maxZ = Math.max(a.z, b.z) + NAV.margin
    this.cell = Math.max(NAV.cell, Math.max(maxX - minX, maxZ - minZ) / NAV.maxSide)
    this.ox = minX
    this.oz = minZ
    this.nx = Math.ceil((maxX - minX) / this.cell)
    this.nz = Math.ceil((maxZ - minZ) / this.cell)
    // -1 = ainda não testada.
    this.blocked = new Int8Array(this.nx * this.nz).fill(-1)
    this.exposed = new Int8Array(this.nx * this.nz).fill(-1)
  }

  private index(p: THREE.Vector3) {
    const i = THREE.MathUtils.clamp(Math.floor((p.x - this.ox) / this.cell), 0, this.nx - 1)
    const k = THREE.MathUtils.clamp(Math.floor((p.z - this.oz) / this.cell), 0, this.nz - 1)
    return k * this.nx + i
  }

  private center(n: number) {
    const i = n % this.nx
    const k = (n - i) / this.nx
    return new THREE.Vector3(this.ox + (i + 0.5) * this.cell, 0, this.oz + (k + 0.5) * this.cell)
  }

  private isBlocked(n: number) {
    if (this.blocked[n] < 0) {
      const c = this.center(n)
      this.blocked[n] = this.free(c.x, c.z) ? 0 : 1
    }
    return this.blocked[n] === 1
  }

  private isExposed(n: number, threat: THREE.Vector3) {
    if (this.exposed[n] < 0) {
      const c = this.center(n).setY(NAV.exposeY)
      const d = c.clone().sub(threat)
      const len = d.length()
      const hit = this.physics.world.castRay(
        new RAPIER.Ray(threat, d.divideScalar(len)),
        len,
        true,
        undefined,
        undefined,
        this.filter.exclude,
        undefined,
        (col: RAPIER.Collider) => solid(col, this.filter.own),
      )
      this.exposed[n] = hit ? 0 : 1
    }
    return this.exposed[n] === 1
  }

  private nearestFree(n: number) {
    if (!this.isBlocked(n)) return n
    const i0 = n % this.nx
    const k0 = (n - i0) / this.nx
    for (let r = 1; r <= 4; r++) {
      let best = -1
      let bestD = Infinity
      for (let dk = -r; dk <= r; dk++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dk)) !== r) continue
          const i = i0 + di
          const k = k0 + dk
          if (i < 0 || k < 0 || i >= this.nx || k >= this.nz) continue
          const m = k * this.nx + i
          const d = di * di + dk * dk
          if (d < bestD && !this.isBlocked(m)) {
            best = m
            bestD = d
          }
        }
      if (best >= 0) return best
    }
    return -1
  }

  private astar(s: number, g: number, threat: THREE.Vector3 | null): number[] | null {
    const n = this.nx * this.nz
    const gScore = new Float32Array(n).fill(Infinity)
    const came = new Int32Array(n).fill(-1)
    const closed = new Uint8Array(n)
    const gi = g % this.nx
    const gk = (g - gi) / this.nx
    const h = (m: number) => {
      const i = m % this.nx
      const k = (m - i) / this.nx
      const dx = Math.abs(i - gi)
      const dz = Math.abs(k - gk)
      return (Math.max(dx, dz) + 0.4142 * Math.min(dx, dz)) * this.cell
    }
    // Fila de prioridade simples (heap binário de [f, nó]).
    const heap: [number, number][] = []
    const push = (f: number, m: number) => {
      heap.push([f, m])
      let i = heap.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (heap[p][0] <= heap[i][0]) break
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        i = p
      }
    }
    const pop = () => {
      const top = heap[0]
      const last = heap.pop()!
      if (heap.length) {
        heap[0] = last
        let i = 0
        for (;;) {
          const l = 2 * i + 1
          const r = l + 1
          let m = i
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r
          if (m === i) break
          ;[heap[m], heap[i]] = [heap[i], heap[m]]
          i = m
        }
      }
      return top[1]
    }
    gScore[s] = 0
    push(h(s), s)
    let expanded = 0
    while (heap.length) {
      const cur = pop()
      if (cur === g) {
        const out = [g]
        let c = g
        while (came[c] >= 0) out.push((c = came[c]))
        return out.reverse()
      }
      if (closed[cur]) continue
      closed[cur] = 1
      if (++expanded > 4000) return null
      const ci = cur % this.nx
      const ck = (cur - ci) / this.nx
      for (let dk = -1; dk <= 1; dk++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dk) continue
          const i = ci + di
          const k = ck + dk
          if (i < 0 || k < 0 || i >= this.nx || k >= this.nz) continue
          const m = k * this.nx + i
          if (closed[m] || this.isBlocked(m)) continue
          // Diagonal não corta quina.
          if (di && dk && (this.isBlocked(ck * this.nx + i) || this.isBlocked(k * this.nx + ci))) continue
          const step = (di && dk ? 1.4142 : 1) * this.cell
          const cost = step * (threat && this.isExposed(m, threat) ? 1 + NAV.exposedCost : 1)
          const gs = gScore[cur] + cost
          if (gs < gScore[m]) {
            gScore[m] = gs
            came[m] = cur
            push(gs + h(m), m)
          }
        }
    }
    return null
  }

  /** Corta caminho em linha reta quando dá (sem passar por obstáculo nem por área mais exposta). */
  private smooth(nodes: number[], threat: THREE.Vector3 | null) {
    if (nodes.length <= 2) return nodes
    const out = [nodes[0]]
    let a = 0
    while (a < nodes.length - 1) {
      let b = nodes.length - 1
      while (b > a + 1 && !this.straight(nodes[a], nodes[b], threat)) b--
      out.push(nodes[b])
      a = b
    }
    return out
  }

  private straight(a: number, b: number, threat: THREE.Vector3 | null) {
    const pa = this.center(a)
    const pb = this.center(b)
    const len = pa.distanceTo(pb)
    const steps = Math.ceil(len / (this.cell * 0.5))
    const ends = threat ? this.isExposed(a, threat) || this.isExposed(b, threat) : true
    const p = new THREE.Vector3()
    const side = new THREE.Vector3()
    const perp = new THREE.Vector3(-(pb.z - pa.z), 0, pb.x - pa.x).normalize()
    for (let i = 1; i < steps; i++) {
      p.lerpVectors(pa, pb, i / steps)
      const m = this.index(p)
      if (this.isBlocked(m)) return false
      if (threat && !ends && this.isExposed(m, threat)) return false
      // Corredor da largura do corpo: as duas bordas também livres.
      for (const s of [-1, 1]) {
        side.copy(p).addScaledVector(perp, s * this.cell * 0.5)
        if (this.isBlocked(this.index(side))) return false
      }
    }
    return true
  }
}
