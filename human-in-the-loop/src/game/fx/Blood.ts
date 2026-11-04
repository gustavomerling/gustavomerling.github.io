import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import type { PartName } from '../npc/skeleton'
import type { Npc } from '../npc/Npc'

/**
 * Sangue como simulação barata:
 *  - respingos: partículas balísticas (InstancedMesh, 1 draw call) que
 *    raycastam só contra o cenário estático e viram mancha ao tocar algo;
 *  - manchas e poças: decals num InstancedMesh em anel (pool reciclado, 1 draw
 *    call); gotas no mesmo lugar engordam a poça em vez de criar outra;
 *  - gotejamento: cada parte ferida pinga numa taxa ligada à gravidade do
 *    dano (lida de `npc.damage`), e o ferimento "coagula" com o tempo;
 *  - rastro: caído e sangrando, o NPC deixa borrões ao se arrastar.
 * Nada aloca por frame nos decals. Nível 0 desliga tudo; 0.5 / 1 / 2 escalam
 * a quantidade.
 */

const MAX_PARTICLES = 360
const MAX_DECALS = 300
/** Morto: sangra mais um tempo (s) e forma poça embaixo do corpo. */
const DEATH_BLEED = 7
const GRAVITY = 9.8
const POOL_MAX_R = 0.42
const TRAIL_STEP = 0.32 // m entre borrões do rastro

interface Particle {
  p: THREE.Vector3
  v: THREE.Vector3
  size: number
  life: number
}

export class Blood {
  private level = 1
  private readonly physics: Physics
  private readonly player: RAPIER.Collider

  private readonly particles: Particle[] = []
  private readonly pMesh: THREE.InstancedMesh
  private readonly dMesh: THREE.InstancedMesh
  // metadados do anel de decals
  private dNext = 0
  private dCount = 0
  private readonly dPos = new Float32Array(MAX_DECALS * 3)
  private readonly dRad = new Float32Array(MAX_DECALS)
  private readonly dPool = new Uint8Array(MAX_DECALS) // 1 = poça horizontal que pode crescer
  private readonly dRot = new Float32Array(MAX_DECALS)

  /** 0..1 por parte: quanto sangue ainda sai (decai com o tempo). */
  private dripAcc = new Map<PartName, number>()
  private lastTrail = new THREE.Vector3()
  private trailValid = false
  /** Estado de gotejamento/rastro de cada NPC (vários NPCs sangram ao mesmo tempo). */
  private perNpc = new WeakMap<Npc, { drip: Map<PartName, number>; last: THREE.Vector3; valid: boolean; deadT: number; poolAcc: number }>()

  // temporários
  private readonly m = new THREE.Matrix4()
  private readonly v1 = new THREE.Vector3()
  private readonly v2 = new THREE.Vector3()
  private readonly v3 = new THREE.Vector3()
  private readonly nrm = new THREE.Vector3()
  private readonly hitPt = new THREE.Vector3()
  private readonly bx = new THREE.Vector3()
  private readonly by = new THREE.Vector3()
  private readonly bz = new THREE.Vector3()
  private readonly col = new THREE.Color()
  private readonly up = new THREE.Vector3(0, 1, 0)
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })

  constructor(scene: THREE.Scene, physics: Physics, playerCollider: RAPIER.Collider) {
    this.physics = physics
    this.player = playerCollider

    this.pMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: '#8e0f10', roughness: 0.35 }),
      MAX_PARTICLES,
    )
    this.pMesh.frustumCulled = false
    this.pMesh.count = 0
    this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    this.dMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 10),
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        color: '#ffffff',
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
      MAX_DECALS,
    )
    this.dMesh.frustumCulled = false
    this.dMesh.count = 0
    this.dMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.dMesh.setColorAt(0, this.col.set('#7a0b0c')) // cria o buffer de cores
    scene.add(this.pMesh, this.dMesh)
  }

  /** 0 desliga; 0.5 baixo; 1 normal; 2 alto. */
  setLevel(level: number) {
    this.level = Math.max(0, level)
    if (this.level === 0) this.clear()
  }

  get enabled() {
    return this.level > 0
  }

  /** Apaga manchas, partículas e ferimentos abertos (reset da cena). */
  clear() {
    this.particles.length = 0
    this.pMesh.count = 0
    this.dMesh.count = 0
    this.dNext = 0
    this.dCount = 0
    this.dripAcc.clear()
    this.trailValid = false
    this.perNpc = new WeakMap()
  }

  dispose() {
    this.pMesh.removeFromParent()
    this.dMesh.removeFromParent()
    this.pMesh.geometry.dispose()
    ;(this.pMesh.material as THREE.Material).dispose()
    this.dMesh.geometry.dispose()
    ;(this.dMesh.material as THREE.Material).dispose()
    this.pMesh.dispose()
    this.dMesh.dispose()
  }

  /**
   * Acertou uma parte: respingo na direção do impacto (a maioria segue a
   * bala, o resto volta) e abre o ferimento. Chamar depois de `npc.hit`,
   * para a saúde da parte já estar atualizada.
   */
  hit(part: PartName, point: THREE.Vector3, dir: THREE.Vector3, impulse: number, npc: Npc) {
    if (this.level <= 0) return
    const sev = 1 - npc.damage.health.get(part)! / 100
    const n = Math.min(26, Math.round((4 + impulse * 1.2 + sev * 10) * this.level))
    const d = this.v1.copy(dir).normalize()
    for (let i = 0; i < n; i++) {
      const fwd = Math.random() < 0.7
      const sp = (fwd ? 1.5 + Math.random() * 3.5 : 0.5 + Math.random() * 1.8) * (0.6 + Math.min(impulse, 20) / 25)
      this.spawn(
        point,
        this.v2
          .set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5)
          .multiplyScalar(1.6)
          .addScaledVector(d, fwd ? sp : -sp),
        0.012 + Math.random() * 0.016,
      )
    }
  }

  update(dt: number, npc: Npc) {
    this.updateAll(dt, [npc])
  }

  /** Todos os NPCs: gotejamento, rastro e poça de morte de cada um; partículas uma vez. */
  updateAll(dt: number, npcs: readonly Npc[]) {
    if (this.level <= 0) return
    for (const npc of npcs) {
      let s = this.perNpc.get(npc)
      if (!s) this.perNpc.set(npc, (s = { drip: new Map(), last: new THREE.Vector3(), valid: false, deadT: 0, poolAcc: 0 }))
      this.dripAcc = s.drip
      this.lastTrail = s.last
      this.trailValid = s.valid
      this.drip(dt, npc)
      this.trail(npc)
      s.valid = this.trailValid
      if (npc.isDead && s.deadT < DEATH_BLEED) this.deathPool(dt, npc, s)
    }
    this.stepParticles(dt)
  }

  /** Morto: gotas caem do tronco, juntam numa poça que cresce e para devagar. */
  private deathPool(dt: number, npc: Npc, s: { deadT: number; poolAcc: number }) {
    s.deadT += dt
    const pelvis = npc.ragdoll.part('pelvis')
    if (pelvis.gone) return
    const t = pelvis.body.translation()
    if (t.y > 0.7) return // ainda caindo
    const rate = 6 * (1 - s.deadT / DEATH_BLEED) * this.level
    s.poolAcc += rate * dt
    while (s.poolAcc >= 1) {
      s.poolAcc--
      this.hitPt.set(t.x + (Math.random() - 0.5) * 0.25, t.y, t.z + (Math.random() - 0.5) * 0.25)
      this.spawn(this.hitPt, this.v2.set((Math.random() - 0.5) * 0.3, -0.5, (Math.random() - 0.5) * 0.3), 0.018)
    }
  }

  // --- partículas -------------------------------------------------------------

  private spawn(p: THREE.Vector3, v: THREE.Vector3, size: number) {
    const cap = Math.round(MAX_PARTICLES * Math.min(1, 0.4 + this.level * 0.3))
    if (this.particles.length >= cap) return
    this.particles.push({ p: p.clone(), v: v.clone(), size, life: 2.5 })
  }

  private stepParticles(dt: number) {
    const list = this.particles
    const ray = this.ray
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]
      s.life -= dt
      s.v.y -= GRAVITY * dt
      s.v.multiplyScalar(1 - 0.4 * dt) // arrasto leve
      const step = this.v3.copy(s.v).multiplyScalar(dt)
      const len = step.length()
      let dead = s.life <= 0
      if (!dead && len > 1e-5) {
        const ix = step.x / len
        const iy = step.y / len
        const iz = step.z / len
        ray.origin.x = s.p.x
        ray.origin.y = s.p.y
        ray.origin.z = s.p.z
        ray.dir.x = ix
        ray.dir.y = iy
        ray.dir.z = iz
        const hit = this.physics.world.castRayAndGetNormal(
          ray,
          len + 0.01,
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, // só cenário fixo
          undefined,
          this.player,
        )
        if (hit) {
          this.nrm.set(hit.normal.x, hit.normal.y, hit.normal.z)
          this.hitPt.set(s.p.x + ix * hit.timeOfImpact, s.p.y + iy * hit.timeOfImpact, s.p.z + iz * hit.timeOfImpact)
          this.stain(this.hitPt, this.nrm, s.size * (3 + Math.random() * 3), s.v.length())
          dead = true
        } else {
          s.p.add(step)
        }
      }
      if (dead) {
        list[i] = list[list.length - 1]
        list.pop()
      }
    }
    const n = list.length
    this.pMesh.count = n
    for (let i = 0; i < n; i++) {
      const s = list[i]
      this.m.makeScale(s.size, s.size, s.size).setPosition(s.p)
      this.pMesh.setMatrixAt(i, this.m)
    }
    if (n) this.pMesh.instanceMatrix.needsUpdate = true
  }

  // --- decals ----------------------------------------------------------------

  /** Mancha de uma gota; em piso, gotas próximas engordam a poça. */
  private stain(point: THREE.Vector3, normal: THREE.Vector3, radius: number, speed: number) {
    const pool = normal.y > 0.9 && speed < 6
    if (pool) {
      const look = Math.min(this.dCount, 40)
      for (let k = 1; k <= look; k++) {
        const i = (this.dNext - k + MAX_DECALS) % MAX_DECALS
        if (!this.dPool[i] || this.dRad[i] >= POOL_MAX_R) continue
        const dx = this.dPos[i * 3] - point.x
        const dz = this.dPos[i * 3 + 2] - point.z
        if (dx * dx + dz * dz < (this.dRad[i] * 0.9) ** 2) {
          this.dRad[i] = Math.min(POOL_MAX_R, Math.sqrt(this.dRad[i] ** 2 + radius * radius * 0.55))
          this.writeDecal(i, normal, 1)
          this.dMesh.instanceMatrix.needsUpdate = true
          return
        }
      }
    }
    this.addDecal(point, normal, radius, pool, null, 1)
  }

  private addDecal(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    radius: number,
    pool: boolean,
    along: THREE.Vector3 | null,
    stretch: number,
  ) {
    const i = this.dNext
    this.dNext = (this.dNext + 1) % MAX_DECALS
    this.dCount = Math.min(MAX_DECALS, this.dCount + 1)
    this.dMesh.count = this.dCount
    // levanta de leve (variando por índice) para não brigar com outras manchas
    const lift = 0.003 + (i % 4) * 0.0008
    this.dPos[i * 3] = point.x + normal.x * lift
    this.dPos[i * 3 + 1] = point.y + normal.y * lift
    this.dPos[i * 3 + 2] = point.z + normal.z * lift
    this.dRad[i] = radius
    this.dPool[i] = pool ? 1 : 0
    this.dRot[i] = along ? Math.atan2(along.z, along.x) : Math.random() * Math.PI * 2
    this.writeDecal(i, normal, stretch)
    const k = 0.75 + Math.random() * 0.5
    this.dMesh.setColorAt(i, this.col.setRGB(0.5 * k, 0.04 * k, 0.05 * k))
    this.dMesh.instanceMatrix.needsUpdate = true
    if (this.dMesh.instanceColor) this.dMesh.instanceColor.needsUpdate = true
  }

  private writeDecal(i: number, normal: THREE.Vector3, stretch: number) {
    // base: z = normal; x = direção guardada (no plano da superfície)
    const rot = this.dRot[i]
    const z = this.bz.copy(normal)
    const ref = Math.abs(z.y) > 0.9 ? this.v1.set(1, 0, 0) : this.up
    const t = this.bx.crossVectors(ref, z).normalize() // tangente
    const b = this.by.crossVectors(z, t)
    const r = this.dRad[i]
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    // x = t cos + b sin ; y = z × x = -t sin + b cos
    const xx = t.x * c + b.x * s
    const xy = t.y * c + b.y * s
    const xz = t.z * c + b.z * s
    const yx = -t.x * s + b.x * c
    const yy = -t.y * s + b.y * c
    const yz = -t.z * s + b.z * c
    const sx = r * stretch
    this.m.set(
      xx * sx, yx * r, z.x, this.dPos[i * 3],
      xy * sx, yy * r, z.y, this.dPos[i * 3 + 1],
      xz * sx, yz * r, z.z, this.dPos[i * 3 + 2],
      0, 0, 0, 1,
    )
    this.dMesh.setMatrixAt(i, this.m)
  }

  // --- gotejamento e rastro ----------------------------------------------------

  private drip(dt: number, npc: Npc) {
    // Pinga de cada ferimento aberto (sangramento de npc.damage, que já estanca sozinho).
    for (const part of this.dripAcc.keys()) if (!npc.damage.bleeding.has(part)) this.dripAcc.delete(part)
    for (const [part, bleedRate] of npc.damage.bleeding) {
      if (npc.ragdoll.part(part).gone) continue
      const sev = Math.min(1, bleedRate / 2)
      // gotas por segundo: ~0.4 (arranhão) a ~5 (ferimento grave), caindo ao estancar
      const rate = (0.4 + sev * 4.6) * this.level
      const acc = (this.dripAcc.get(part) ?? 0) + rate * dt
      const n = Math.floor(acc)
      this.dripAcc.set(part, acc - n)
      if (n <= 0) continue
      const t = npc.ragdoll.part(part).body.translation()
      this.hitPt.set(t.x, t.y, t.z)
      for (let k = 0; k < n; k++) {
        this.spawn(
          this.hitPt,
          this.v2.set((Math.random() - 0.5) * 0.5, -0.2, (Math.random() - 0.5) * 0.5),
          0.01 + sev * 0.012,
        )
      }
    }
  }

  /** Caído, sangrando e se movendo pelo chão: borra uma mancha alongada. */
  private trail(npc: Npc) {
    const st = npc.state
    let bleeding = 0
    bleeding = npc.bleedRate
    if (bleeding < 0.3 || st === 'standing' || st === 'falling') {
      this.trailValid = false
      return
    }
    const t = npc.ragdoll.part('pelvis').body.translation()
    if (t.y > 0.6) {
      this.trailValid = false
      return
    }
    this.v1.set(t.x, 0, t.z)
    if (!this.trailValid) {
      this.lastTrail.copy(this.v1)
      this.trailValid = true
      return
    }
    const d = this.v2.subVectors(this.v1, this.lastTrail)
    const dist = d.length()
    if (dist < TRAIL_STEP) return
    d.divideScalar(dist)
    this.hitPt.copy(this.lastTrail).addScaledVector(d, dist * 0.5) // meio do trecho
    this.lastTrail.copy(this.v1)
    this.nrm.set(0, 1, 0)
    this.addDecal(this.hitPt, this.nrm, 0.11 + bleeding * 0.06, false, d, 2.4)
  }
}
