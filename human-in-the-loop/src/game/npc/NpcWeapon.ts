import * as THREE from 'three'
import { RAPIER, type Physics } from '../engine/physics'
import { createViewmodelMaterials, worldWeaponModel, type ViewmodelMaterials } from '../weapons/viewmodels'
import { WEAPONS } from '../weapons/weapons'
import type { Npc } from './Npc'

/**
 * Pistola do NPC armado (exceção à regra "NPC nunca usa armas", só para
 * este tipo). A arma é um corpo rígido preso à mão direita por uma junta
 * fixa; atira com raycast (considera mundo, objetos e o corpo do jogador),
 * dá recuo físico no braço e no tronco e pode ser largada, caindo como
 * item pegável do sandbox (o Game recebe `onDrop`).
 */
export const NPC_GUN = {
  magazine: 12,
  /** Tempo mínimo entre tiros (s) e recarga (s). */
  fireInterval: 0.42,
  reloadTime: 1.9,
  range: 80,
  /** Impulso (N·s) em objetos atingidos e no jogador (a cápsula tem 80 kg). */
  objectImpulse: WEAPONS.find((w) => w.id === 'pistol')?.impulse ?? 12,
  playerImpulse: 110,
  /** Recuo (N·s): tronco para trás; mão para cima e para trás. */
  recoilChest: 2.4,
  recoilHandUp: 1.3,
  recoilHandBack: 0.9,
  /** Só dispara com o cano a menos deste ângulo (rad) da direção desejada. */
  alignment: 0.12,
  /** Calor do disparo rápido: soma à dispersão e cai por segundo. */
  heatPerShot: 0.35,
  heatDecay: 0.9,
}

/**
 * Firmeza da empunhadura (o "músculo" fino que um atirador treinado tem):
 * um torque leva o cano para a direção do alvo e um amortecimento segura a
 * mão em relação ao tronco. Fraco de propósito: o recuo chuta a arma e a
 * mira volta aos poucos (o grosso da mira é a pose do braço em ArmedBrain).
 */
export const STEADY = {
  /** Alinhamento do cano: mola (1/s²) e amortecimento (1/s) em aceleração angular. */
  kp: 30,
  kd: 8,
  /** Inércia efetiva mão + antebraço + arma em torno do cotovelo (kg·m²). */
  inertia: 0.08,
  /** Amortece a velocidade da mão em relação ao peito (1/s) e massa efetiva (kg). */
  handDamp: 14,
  handMass: 2.2,
}

/** Colisão da arma: com o mundo, mas não com o próprio corpo nem com o jogador. */
const GUN_GROUPS = ((0x0008 << 16) | 0x7ffa) >>> 0

export interface NpcShot {
  origin: THREE.Vector3
  dir: THREE.Vector3
  end: THREE.Vector3
}

/** Evento: o tiro do NPC acertou o jogador (sem HP; o Game aplica só o impulso). */
export interface PlayerHitEvent {
  point: THREE.Vector3
  dir: THREE.Vector3
  impulse: THREE.Vector3
  region: 'head' | 'torso' | 'legs'
  distance: number
}

export interface DroppedGun {
  pos: THREE.Vector3
  rot: THREE.Quaternion
  vel: THREE.Vector3
  angvel: THREE.Vector3
}

// Cano do modelo aponta para -Z; ao longo do osso da mão (-Y) vira Rx(-90°).
const GUN_IN_HAND = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
const HAND_ANCHOR = new THREE.Vector3(0, -0.07, 0)

export class NpcWeapon {
  held = false
  ammo = NPC_GUN.magazine
  /** Tempo restante da recarga (0 = não recarregando). */
  reloadT = 0
  private cooldown = 0
  /** Calor (0..~1.5): sobe a cada tiro. */
  heat = 0
  onShot: ((s: NpcShot) => void) | null = null
  onHit: ((e: PlayerHitEvent) => void) | null = null
  onDrop: ((d: DroppedGun) => void) | null = null

  /** Boca do cano e direção do cano (mundo), atualizados por passo. */
  readonly muzzle = new THREE.Vector3()
  readonly barrel = new THREE.Vector3(0, 0, -1)

  private gun: RAPIER.RigidBody | null = null
  private joint: RAPIER.ImpulseJoint | null = null
  private object: THREE.Group | null = null
  private readonly half = new THREE.Vector3()
  private readonly grip = new THREE.Vector3()
  private readonly muzzleLocal = new THREE.Vector3()
  private readonly mats: ViewmodelMaterials
  private readonly tmpQ = new THREE.Quaternion()
  private readonly tmpV = new THREE.Vector3()

  private readonly npc: Npc
  private readonly physics: Physics
  private readonly scene: THREE.Scene
  private readonly playerCollider: RAPIER.Collider

  constructor(npc: Npc, physics: Physics, scene: THREE.Scene, playerCollider: RAPIER.Collider) {
    this.npc = npc
    this.physics = physics
    this.scene = scene
    this.playerCollider = playerCollider
    this.mats = createViewmodelMaterials()
  }

  get reloading() {
    return this.reloadT > 0
  }

  get ready() {
    return this.held && this.cooldown <= 0 && this.reloadT <= 0 && this.ammo > 0
  }

  /** Põe a pistola na mão direita (com pente cheio). */
  equip() {
    if (this.held) return
    const hand = this.npc.ragdoll.part('handR').body
    const model = worldWeaponModel('pistol', this.mats)
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    this.half.copy(box.getSize(new THREE.Vector3())).multiplyScalar(0.5).max(new THREE.Vector3(0.02, 0.02, 0.02))
    model.position.sub(center)
    const group = new THREE.Group()
    group.add(model)
    this.scene.add(group)
    this.object = group
    // Empunhadura: atrás e embaixo do centro da caixa.
    this.grip.set(0, -this.half.y * 0.5, this.half.z * 0.45)
    this.muzzleLocal.set(0, this.half.y * 0.4, -this.half.z)

    const hr = hand.rotation()
    const hq = new THREE.Quaternion(hr.x, hr.y, hr.z, hr.w)
    const gq = hq.clone().multiply(GUN_IN_HAND)
    const hp = hand.translation()
    const pos = new THREE.Vector3(hp.x, hp.y, hp.z)
      .add(HAND_ANCHOR.clone().applyQuaternion(hq))
      .sub(this.grip.clone().applyQuaternion(gq))
    const world = this.physics.world
    const gun = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(gq))
    // Sem colisões enquanto empunhada (não briga com o próprio braço).
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(this.half.x, this.half.y, this.half.z)
        .setMass(WEAPONS.find((w) => w.id === 'pistol')?.mass ?? 0.9)
        .setCollisionGroups(0),
      // (sem colisão em pé; caído, passa a colidir com o chão: ver update)
      gun,
    )
    this.physics.sync(gun, group)
    // Junta fixa mão-arma: o quadro da arma gira -90° em X em relação à mão.
    const joint = world.createImpulseJoint(
      RAPIER.JointData.fixed(
        { x: HAND_ANCHOR.x, y: HAND_ANCHOR.y, z: HAND_ANCHOR.z },
        { x: GUN_IN_HAND.x, y: GUN_IN_HAND.y, z: GUN_IN_HAND.z, w: GUN_IN_HAND.w },
        { x: this.grip.x, y: this.grip.y, z: this.grip.z },
        { x: 0, y: 0, z: 0, w: 1 },
      ),
      hand,
      gun,
      true,
    )
    joint.setContactsEnabled(false)
    this.gun = gun
    this.joint = joint
    this.held = true
    this.ammo = NPC_GUN.magazine
    this.reloadT = 0
    this.cooldown = 0
    this.heat = 0
    this.updateMuzzle()
  }

  /** Larga a arma (braço ferido, queda): vira item pegável via `onDrop`. */
  drop(silent = false) {
    if (!this.held || !this.gun) return
    const hand = this.npc.ragdoll.part('handR').body
    const t = this.gun.translation()
    const r = this.gun.rotation()
    const v = hand.linvel()
    const w = hand.angvel()
    const info: DroppedGun = {
      pos: new THREE.Vector3(t.x, t.y, t.z),
      rot: new THREE.Quaternion(r.x, r.y, r.z, r.w),
      vel: new THREE.Vector3(v.x, v.y, v.z),
      angvel: new THREE.Vector3(w.x, w.y, w.z),
    }
    this.removeBody()
    this.held = false
    this.reloadT = 0
    if (!silent) this.onDrop?.(info)
  }

  /** Reset da cena: larga sem avisar e empunha de novo. */
  reset() {
    this.drop(true)
    this.equip()
  }

  startReload() {
    if (this.held && this.reloadT <= 0 && this.ammo < NPC_GUN.magazine) this.reloadT = NPC_GUN.reloadTime
  }

  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.heat = Math.max(0, this.heat - NPC_GUN.heatDecay * dt)
    if (this.reloadT > 0) {
      this.reloadT -= dt
      if (this.reloadT <= 0) {
        this.reloadT = 0
        this.ammo = NPC_GUN.magazine
      }
    }
    if (this.held) {
      this.updateMuzzle()
      // Caído ou levantando, a arma continua na mão e bate no chão (não atravessa).
      // Em pé fica sem colisão (não enrosca em paredes e coberturas).
      const groups = this.npc.state === 'standing' ? 0 : GUN_GROUPS
      const c = this.gun!.collider(0)
      if (c.collisionGroups() !== groups) c.setCollisionGroups(groups)
    }
  }

  /** Onde o cano aponta agora: primeiro obstáculo na linha do cano (ou `max` m à frente). */
  barrelEnd(out: THREE.Vector3, max = 40) {
    const gunHandle = this.gun?.handle
    const hit = this.physics.world.castRay(new RAPIER.Ray(this.muzzle, this.barrel), max, true, undefined, undefined, undefined, undefined, (c) => {
      const b = c.parent()
      return !(b && (b.handle === gunHandle || this.npc.owns(b)))
    })
    return out.copy(this.muzzle).addScaledVector(this.barrel, hit ? hit.timeOfImpact : max)
  }

  /**
   * Empunhadura firme (ver STEADY): leva o cano em direção a `target` e segura
   * a mão contra o balanço. `w` (0..1) é quanto ele está mirando. A mão
   * esquerda só acompanha pela pose (uma mola nela torcia a arma).
   */
  steady(target: THREE.Vector3, w: number, dt: number) {
    if (!this.gun || w < 0.05) return
    const rag = this.npc.ragdoll
    const want = target.clone().sub(this.muzzle)
    if (want.lengthSq() < 1e-4) return
    want.normalize()
    // Eixo × seno do ângulo entre o cano e a direção do alvo.
    const axis = new THREE.Vector3().crossVectors(this.barrel, want)
    const gw = this.gun.angvel()
    const chestW = rag.part('chest').body.angvel()
    const rel = new THREE.Vector3(gw.x - chestW.x, gw.y - chestW.y, gw.z - chestW.z)
    const acc = axis.multiplyScalar(STEADY.kp).addScaledVector(rel, -STEADY.kd).multiplyScalar(w * STEADY.inertia * dt)
    // Músculo: o que vai para o braço volta, igual e oposto, para o tronco.
    const chest = rag.part('chest').body
    rag.part('forearmR').body.applyTorqueImpulse(acc.clone().multiplyScalar(0.6), true)
    rag.part('handR').body.applyTorqueImpulse(acc.clone().multiplyScalar(0.4), true)
    chest.applyTorqueImpulse(acc.negate(), true)

    // Mão sem balançar em relação ao peito.
    const hand = rag.part('handR').body
    const hv = hand.linvel()
    const cv = rag.part('chest').body.linvel()
    const k = -STEADY.handDamp * STEADY.handMass * w * dt
    const damp = { x: (hv.x - cv.x) * k, y: (hv.y - cv.y) * k, z: (hv.z - cv.z) * k }
    hand.applyImpulse(damp, true)
    chest.applyImpulse({ x: -damp.x, y: -damp.y, z: -damp.z }, true)
  }

  /**
   * Tenta atirar em `aim`. `spread` (rad) é o meio-ângulo do cone de
   * dispersão. Falha se não está pronta ou se o cano ainda não aponta
   * para o alvo (o braço ainda está subindo/virando).
   */
  fire(aim: THREE.Vector3, spread: number): boolean {
    if (!this.ready || !this.gun) return false
    const dir = aim.clone().sub(this.muzzle)
    const distance = dir.length()
    if (distance < 0.05) return false
    dir.divideScalar(distance)
    if (Math.acos(THREE.MathUtils.clamp(this.barrel.dot(dir), -1, 1)) > NPC_GUN.alignment) return false

    // Cone de dispersão (uniforme no disco).
    const u = new THREE.Vector3()
      .crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0))
      .normalize()
    const v = new THREE.Vector3().crossVectors(dir, u)
    const r = Math.tan(spread) * Math.sqrt(Math.random())
    const a = Math.random() * Math.PI * 2
    dir.addScaledVector(u, r * Math.cos(a)).addScaledVector(v, r * Math.sin(a)).normalize()

    this.ammo--
    this.cooldown = NPC_GUN.fireInterval * (0.9 + Math.random() * 0.25)
    this.heat += NPC_GUN.heatPerShot

    const gunHandle = this.gun.handle
    const hit = this.physics.world.castRayAndGetNormal(
      new RAPIER.Ray(this.muzzle, dir),
      NPC_GUN.range,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      (c) => {
        const b = c.parent()
        return !(b && (b.handle === gunHandle || this.npc.owns(b)))
      },
    )
    const toi = hit ? hit.timeOfImpact : NPC_GUN.range
    const end = this.muzzle.clone().addScaledVector(dir, toi)
    if (hit) {
      const body = hit.collider.parent()
      if (hit.collider.handle === this.playerCollider.handle) {
        const cy = body ? body.translation().y : end.y
        const rel = end.y - cy
        const region = rel > 0.55 ? 'head' : rel < -0.35 ? 'legs' : 'torso'
        this.onHit?.({
          point: end.clone(),
          dir: dir.clone(),
          impulse: dir.clone().multiplyScalar(NPC_GUN.playerImpulse * (region === 'head' ? 1.3 : 1)),
          region,
          distance: toi,
        })
      } else if (body && body.isDynamic()) {
        body.applyImpulseAtPoint(dir.clone().multiplyScalar(NPC_GUN.objectImpulse), end, true)
      }
    }
    this.onShot?.({ origin: this.muzzle.clone(), dir: dir.clone(), end })
    this.recoil(dir)
    return true
  }

  dispose() {
    this.drop(true)
    this.mats.dispose()
  }

  /** Recuo físico: tronco empurrado para trás e a mão sobe (os motores do braço a trazem de volta). */
  private recoil(dir: THREE.Vector3) {
    const rag = this.npc.ragdoll
    rag.part('chest').body.applyImpulse(dir.clone().multiplyScalar(-NPC_GUN.recoilChest), true)
    const kick = dir.clone().multiplyScalar(-NPC_GUN.recoilHandBack)
    kick.y += NPC_GUN.recoilHandUp
    rag.part('handR').body.applyImpulse(kick, true)
    rag.part('forearmR').body.applyImpulse(kick.multiplyScalar(0.6), true)
  }

  private updateMuzzle() {
    if (!this.gun) return
    const r = this.gun.rotation()
    const t = this.gun.translation()
    this.tmpQ.set(r.x, r.y, r.z, r.w)
    this.muzzle.copy(this.muzzleLocal).applyQuaternion(this.tmpQ).add(this.tmpV.set(t.x, t.y, t.z))
    this.barrel.set(0, 0, -1).applyQuaternion(this.tmpQ)
  }

  private removeBody() {
    const world = this.physics.world
    if (this.joint) world.removeImpulseJoint(this.joint, true)
    this.joint = null
    if (this.gun) {
      this.physics.unsync(this.gun)
      world.removeRigidBody(this.gun)
    }
    this.gun = null
    if (this.object) {
      this.object.removeFromParent()
      this.object.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose()
      })
    }
    this.object = null
  }
}
