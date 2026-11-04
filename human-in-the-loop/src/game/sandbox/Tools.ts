import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { LAB } from '../world/lab'
import { palette } from '../palette'

export type ToolId = 'freeze' | 'rope' | 'spring' | 'magnet'

export interface ToolDef {
  id: ToolId
  name: string
  /** Dica curta do que fazem os botões. */
  hint: string
}

export const TOOLS: ToolDef[] = [
  { id: 'rope', name: 'Corda', hint: 'clique: ponto A, depois B · direito: desfaz' },
  { id: 'spring', name: 'Mola', hint: 'clique: ponto A, depois B · direito: desfaz' },
  { id: 'freeze', name: 'Congelar', hint: 'clique: congela/descongela · direito: descongela tudo' },
  { id: 'magnet', name: 'Ímã', hint: 'segure: puxa · segure o direito: empurra' },
]

/** Alcance das ferramentas (m). */
const RANGE = 40
/** Ímã: alcance, abertura do cone (cosseno), aceleração e força máxima. */
const MAGNET = { range: 12, cone: 0.9, hold: 1.8, accel: 32, maxForce: 2500 }
/** Mola: rigidez por kg da massa presa (N/m/kg) e fração de amortecimento. */
const SPRING = { stiffnessPerKg: 45, minStiffness: 150, maxStiffness: 6000, damping: 0.25, rest: 0.6 }
const ROPE_POINTS = 12
const COIL_POINTS = 40

export interface ToolHooks {
  /** Solta o corpo das mãos (antes de congelar). */
  release: (body: RAPIER.RigidBody) => void
  isNpc: (body: RAPIER.RigidBody) => boolean
}

/** Ponta de uma ligação: um corpo e o ponto no espaço local dele. */
interface End {
  body: RAPIER.RigidBody
  local: THREE.Vector3
  /** Malha sincronizada com o corpo (pose interpolada, sem tremer). */
  object: THREE.Object3D | null
}

/** Ponto escolhido ainda sem corpo (mundo/teto): ganha um corpo fixo próprio. */
interface Pick {
  body: RAPIER.RigidBody | null
  point: THREE.Vector3
}

interface Link {
  kind: 'rope' | 'spring'
  joint: RAPIER.ImpulseJoint
  a: End
  b: End
  /** Comprimento da corda (máximo) ou de repouso da mola. */
  length: number
  line: THREE.Line
  /** Corpos fixos criados para prender no cenário. */
  anchors: RAPIER.RigidBody[]
  plates: THREE.Mesh[]
}

/**
 * Ferramentas do sandbox (passo 30): corda e mola entre dois pontos
 * (juntas do Rapier), congelar (corpo vira fixo) e ímã (puxa/empurra os
 * corpos soltos à frente). Pontos no cenário (paredes, chão, ou o "teto" no
 * alto da sala, que é aberta) ganham um corpo fixo invisível como âncora.
 */
export class Tools {
  tool: ToolId = 'rope'
  private pending: { pick: Pick; local: THREE.Vector3; marker: THREE.Mesh } | null = null
  private readonly links: Link[] = []
  private readonly frozen = new Map<number, { body: RAPIER.RigidBody; helper: THREE.BoxHelper }>()
  /** Ímã: 1 puxa, -1 empurra, 0 desligado. */
  magnet = 0

  private readonly scene: THREE.Scene
  private readonly physics: Physics
  private readonly playerCollider: RAPIER.Collider
  private readonly hooks: ToolHooks

  private readonly ropeMat = new THREE.LineBasicMaterial({ color: '#2a2a2c' })
  private readonly springMat = new THREE.LineBasicMaterial({ color: palette.accent })
  private readonly markerGeo = new THREE.SphereGeometry(0.035, 10, 8)
  private readonly plateGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.03, 14)
  private readonly markerMat = new THREE.MeshBasicMaterial({ color: palette.accent })
  private readonly plateMat = new THREE.MeshStandardMaterial({ color: '#3a3c42', roughness: 0.6 })
  private readonly tmpA = new THREE.Vector3()
  private readonly tmpB = new THREE.Vector3()
  private readonly tmpQ = new THREE.Quaternion()

  constructor(scene: THREE.Scene, physics: Physics, playerCollider: RAPIER.Collider, hooks: ToolHooks) {
    this.scene = scene
    this.physics = physics
    this.playerCollider = playerCollider
    this.hooks = hooks
  }

  get toolDef() {
    return TOOLS.find((t) => t.id === this.tool)!
  }

  get hasPending() {
    return this.pending !== null
  }

  get linkCount() {
    return this.links.length
  }

  select(id: ToolId) {
    if (id === this.tool) return
    this.cancelPending()
    this.tool = id
  }

  next() {
    this.select(TOOLS[(TOOLS.findIndex((t) => t.id === this.tool) + 1) % TOOLS.length].id)
  }

  /** Clique esquerdo com a ferramenta atual. */
  primary(origin: THREE.Vector3, dir: THREE.Vector3) {
    if (this.tool === 'freeze') {
      const pick = this.pick(origin, dir, false)
      const body = pick?.body
      if (!body) return
      if (this.frozen.has(body.handle)) this.unfreeze(body)
      else if (body.isDynamic()) this.freeze(body)
      return
    }
    if (this.tool !== 'rope' && this.tool !== 'spring') return
    const pick = this.pick(origin, dir, true)
    if (!pick) return
    if (!this.pending) {
      const marker = new THREE.Mesh(this.markerGeo, this.markerMat)
      const local = pick.body ? this.toLocal(pick.body, pick.point) : new THREE.Vector3()
      const owner = pick.body ? this.physics.objectOf(pick.body) : null
      if (owner) {
        marker.position.copy(local)
        owner.add(marker)
      } else {
        marker.position.copy(pick.point)
        this.scene.add(marker)
      }
      this.pending = { pick, local, marker }
      return
    }
    const a = this.pending
    this.cancelPending()
    if (a.pick.body && pick.body && a.pick.body.handle === pick.body.handle) return
    // Âncora no cenário de um lado só: não faz sentido ligar cenário com cenário.
    if (!a.pick.body?.isDynamic() && !pick.body?.isDynamic()) return
    this.connect(this.tool, a.pick, pick)
  }

  /** Botão direito: cancela o ponto A, desfaz a última ligação ou descongela tudo. */
  secondary() {
    if (this.tool === 'freeze') {
      for (const f of [...this.frozen.values()]) this.unfreeze(f.body)
      return
    }
    if (this.pending) {
      this.cancelPending()
      return
    }
    for (let i = this.links.length - 1; i >= 0; i--) {
      if (this.links[i].kind === this.tool) {
        this.removeLink(this.links[i])
        return
      }
    }
  }

  /** Um passo de física: o ímã. */
  fixedUpdate(dt: number, origin: THREE.Vector3, dir: THREE.Vector3) {
    if (!this.magnet) return
    const center = this.tmpA.copy(origin).addScaledVector(dir, MAGNET.hold)
    const d = new THREE.Vector3()
    const f = new THREE.Vector3()
    this.physics.world.bodies.forEach((body) => {
      if (!body.isDynamic()) return
      const t = body.translation()
      d.set(t.x - origin.x, t.y - origin.y, t.z - origin.z)
      const dist = d.length()
      if (dist > MAGNET.range || dist < 1e-3 || d.dot(dir) / dist < MAGNET.cone) return
      const mass = body.mass()
      const falloff = 1 - (dist / MAGNET.range) * 0.6
      if (this.magnet > 0) {
        // Puxa até um ponto à frente; perto dele, freia (não fica orbitando).
        f.set(center.x - t.x, center.y - t.y, center.z - t.z)
        const near = f.length()
        f.normalize().multiplyScalar(MAGNET.accel * falloff * Math.min(1, near))
        const v = body.linvel()
        const brake = near < 1.2 ? 6 : 1.2
        f.x -= v.x * brake
        f.y -= v.y * brake - 9.81 * Math.min(1, 1.5 - near * 0.5)
        f.z -= v.z * brake
      } else {
        f.copy(dir).multiplyScalar(MAGNET.accel * falloff)
      }
      f.multiplyScalar(mass)
      if (f.length() > MAGNET.maxForce) f.setLength(MAGNET.maxForce)
      body.applyImpulse({ x: f.x * dt, y: f.y * dt, z: f.z * dt }, true)
    })
  }

  /** Atualiza o desenho das cordas e molas. Chamado por frame, depois da interpolação. */
  frame() {
    // Corpo removido por fora (modo construção, "apagar construções"): o
    // Rapier já tirou a junta; aqui some o desenho e a âncora.
    const bodies = this.physics.world.bodies
    for (const link of [...this.links]) {
      if (!bodies.contains(link.a.body.handle) || !bodies.contains(link.b.body.handle)) this.removeLink(link)
    }
    for (const f of [...this.frozen.values()]) if (!bodies.contains(f.body.handle)) this.forgetBody(f.body)
    const pb = this.pending?.pick.body
    if (pb && !bodies.contains(pb.handle)) this.cancelPending()
    for (const link of this.links) {
      const a = this.endWorld(link.a, this.tmpA)
      const b = this.endWorld(link.b, this.tmpB)
      const pos = link.line.geometry.getAttribute('position') as THREE.BufferAttribute
      if (link.kind === 'rope') this.drawRope(pos, a, b, link.length)
      else this.drawCoil(pos, a, b)
      pos.needsUpdate = true
    }
  }

  /** Antes de remover um corpo: tira as ligações e o congelamento dele. */
  forgetBody(body: RAPIER.RigidBody) {
    for (const link of [...this.links]) {
      if (link.a.body.handle === body.handle || link.b.body.handle === body.handle) this.removeLink(link)
    }
    if (this.pending?.pick.body?.handle === body.handle) this.cancelPending()
    const f = this.frozen.get(body.handle)
    if (f) {
      f.helper.removeFromParent()
      f.helper.dispose()
      this.frozen.delete(body.handle)
    }
  }

  /** Reset: desfaz tudo (descongela, remove cordas, molas e âncoras). */
  clear() {
    this.cancelPending()
    this.magnet = 0
    for (const f of [...this.frozen.values()]) this.unfreeze(f.body)
    for (const link of [...this.links]) this.removeLink(link)
  }

  dispose() {
    this.clear()
    this.ropeMat.dispose()
    this.springMat.dispose()
    this.markerGeo.dispose()
    this.plateGeo.dispose()
    this.markerMat.dispose()
    this.plateMat.dispose()
  }

  // --- interno ----------------------------------------------------------------

  /**
   * Ponto sob a mira. Sem acerto olhando para cima, usa o plano do alto das
   * paredes como teto (a sala é aberta). `world`: aceita cenário (sem corpo).
   */
  private pick(origin: THREE.Vector3, dir: THREE.Vector3, world: boolean): Pick | null {
    const hit = this.physics.world.castRay(new RAPIER.Ray(origin, dir), RANGE, true, undefined, undefined, this.playerCollider)
    if (hit) {
      const point = origin.clone().addScaledVector(dir, hit.timeOfImpact)
      const body = hit.collider.parent()
      if (body && (body.isDynamic() || this.frozen.has(body.handle) || world)) return { body, point }
      return world ? { body: null, point } : null
    }
    if (!world || dir.y < 0.05) return null
    const t = (LAB.wallHeight - origin.y) / dir.y
    if (t <= 0 || t > RANGE) return null
    return { body: null, point: origin.clone().addScaledVector(dir, t) }
  }

  private toLocal(body: RAPIER.RigidBody, point: THREE.Vector3) {
    const t = body.translation()
    const r = body.rotation()
    return point
      .clone()
      .sub(this.tmpB.set(t.x, t.y, t.z))
      .applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w).invert())
  }

  /** Corpo + ponto local; cenário ganha um corpo fixo (sem colisor) no ponto. */
  private resolve(p: Pick, anchors: RAPIER.RigidBody[], plates: THREE.Mesh[]): End {
    if (p.body) return { body: p.body, local: this.toLocal(p.body, p.point), object: this.physics.objectOf(p.body) }
    const body = this.physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.point.x, p.point.y, p.point.z))
    anchors.push(body)
    // Plaquinha onde a ligação está presa (no teto, aponta para baixo).
    const plate = new THREE.Mesh(this.plateGeo, this.plateMat)
    plate.position.copy(p.point)
    this.scene.add(plate)
    plates.push(plate)
    return { body, local: new THREE.Vector3(), object: null }
  }

  private connect(kind: 'rope' | 'spring', pa: Pick, pb: Pick) {
    const anchors: RAPIER.RigidBody[] = []
    const plates: THREE.Mesh[] = []
    const a = this.resolve(pa, anchors, plates)
    const b = this.resolve(pb, anchors, plates)
    const dist = pa.point.distanceTo(pb.point)
    const la = { x: a.local.x, y: a.local.y, z: a.local.z }
    const lb = { x: b.local.x, y: b.local.y, z: b.local.z }
    let data: RAPIER.JointData
    let length = dist
    if (kind === 'rope') {
      data = RAPIER.JointData.rope(Math.max(0.05, dist), la, lb)
    } else {
      // Rigidez pela massa presa: a mola "aguenta" o objeto (o NPC conta inteiro, ~70 kg).
      const mass = Math.max(this.massOf(a.body), this.massOf(b.body))
      const k = THREE.MathUtils.clamp(mass * SPRING.stiffnessPerKg, SPRING.minStiffness, SPRING.maxStiffness)
      const c = 2 * SPRING.damping * Math.sqrt(k * mass)
      length = dist * SPRING.rest
      data = RAPIER.JointData.spring(length, k, c, la, lb)
    }
    const joint = this.physics.world.createImpulseJoint(data, a.body, b.body, true)
    const n = kind === 'rope' ? ROPE_POINTS : COIL_POINTS
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const line = new THREE.Line(geo, kind === 'rope' ? this.ropeMat : this.springMat)
    line.frustumCulled = false
    this.scene.add(line)
    const link: Link = { kind, joint, a, b, length, line, anchors, plates }
    this.links.push(link)
    a.body.wakeUp()
    b.body.wakeUp()
    this.frame()
  }

  /** Massa para a mola: partes do NPC contam como ~70 kg (estão presas ao corpo). */
  private massOf(body: RAPIER.RigidBody) {
    if (!body.isDynamic()) return 0
    return this.hooks.isNpc(body) ? 70 : body.mass()
  }

  private removeLink(link: Link) {
    const world = this.physics.world
    if (world.impulseJoints.contains(link.joint.handle)) world.removeImpulseJoint(link.joint, true)
    for (const body of link.anchors) if (world.bodies.contains(body.handle)) world.removeRigidBody(body)
    for (const p of link.plates) p.removeFromParent()
    link.line.removeFromParent()
    link.line.geometry.dispose()
    this.links.splice(this.links.indexOf(link), 1)
  }

  private cancelPending() {
    this.pending?.marker.removeFromParent()
    this.pending = null
  }

  private freeze(body: RAPIER.RigidBody) {
    this.hooks.release(body)
    body.setBodyType(RAPIER.RigidBodyType.Fixed, true)
    const helper = new THREE.BoxHelper(this.physics.objectOf(body) ?? new THREE.Object3D(), '#7fd4ff')
    this.scene.add(helper)
    this.frozen.set(body.handle, { body, helper })
  }

  private unfreeze(body: RAPIER.RigidBody) {
    const f = this.frozen.get(body.handle)
    if (!f) return
    this.frozen.delete(body.handle)
    f.helper.removeFromParent()
    f.helper.dispose()
    if (!this.physics.world.bodies.contains(body.handle)) return
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
    body.wakeUp()
  }

  private endWorld(end: End, out: THREE.Vector3) {
    if (end.object) {
      end.object.getWorldQuaternion(this.tmpQ)
      return end.object.getWorldPosition(out).add(end.local.clone().applyQuaternion(this.tmpQ))
    }
    const t = end.body.translation()
    const r = end.body.rotation()
    return out.copy(end.local).applyQuaternion(this.tmpQ.set(r.x, r.y, r.z, r.w)).add(t as THREE.Vector3Like)
  }

  /** Corda: reta quando esticada; frouxa, faz uma barriga para baixo. */
  private drawRope(pos: THREE.BufferAttribute, a: THREE.Vector3, b: THREE.Vector3, length: number) {
    const d = a.distanceTo(b)
    const sag = d < length ? Math.sqrt(length * length - d * d) * 0.5 : 0
    for (let i = 0; i < ROPE_POINTS; i++) {
      const u = i / (ROPE_POINTS - 1)
      pos.setXYZ(
        i,
        a.x + (b.x - a.x) * u,
        a.y + (b.y - a.y) * u - sag * 4 * u * (1 - u),
        a.z + (b.z - a.z) * u,
      )
    }
  }

  /** Mola: espiral em volta da reta entre as pontas. */
  private drawCoil(pos: THREE.BufferAttribute, a: THREE.Vector3, b: THREE.Vector3) {
    const axis = b.clone().sub(a)
    const side = Math.abs(axis.y) < 0.9 * axis.length() ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const u1 = side.cross(axis).normalize()
    const u2 = axis.clone().cross(u1).normalize()
    const turns = 10
    const r = 0.05
    for (let i = 0; i < COIL_POINTS; i++) {
      const u = i / (COIL_POINTS - 1)
      // Pontas retas, espiral no meio.
      const coil = u > 0.06 && u < 0.94 ? r : 0
      const ang = u * turns * Math.PI * 2
      const x = a.x + axis.x * u + (u1.x * Math.cos(ang) + u2.x * Math.sin(ang)) * coil
      const y = a.y + axis.y * u + (u1.y * Math.cos(ang) + u2.y * Math.sin(ang)) * coil
      const z = a.z + axis.z * u + (u1.z * Math.cos(ang) + u2.z * Math.sin(ang)) * coil
      pos.setXYZ(i, x, y, z)
    }
  }
}
