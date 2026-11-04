import * as THREE from 'three'
import { ArmedBrain } from './ArmedBrain'
import { Brain } from './Brain'
import type { Region } from './Damage'
import { NpcWeapon } from './NpcWeapon'
import type { BrainContext, BrainDebug, BrainDeps, NpcBrain, NpcKind } from './types'

/**
 * Cérebro do tipo `armed`: o civil (percepção, reflexos, esquiva, cobertura,
 * memória) com a camada de combate por cima (`ArmedBrain` + pistola física
 * na mão direita). Sem a arma (largou), sobra o civil.
 */
export class ArmedNpcBrain implements NpcBrain {
  readonly kind: NpcKind
  readonly base: Brain
  readonly weapon: NpcWeapon
  readonly combat: ArmedBrain
  private readonly npc: BrainDeps['npc']
  /**
   * Debug (junto com o cone de visão, tecla V): linha do cano até onde a arma
   * aponta agora (vermelha) e marcador do ponto que ele quer acertar (amarelo).
   */
  private readonly aimDebug = new THREE.Group()
  private readonly laser: THREE.Line
  private readonly laserEnd: THREE.Mesh
  private readonly target: THREE.Mesh

  constructor(kind: NpcKind, deps: BrainDeps) {
    this.kind = kind
    this.npc = deps.npc
    this.base = new Brain(kind, deps)
    this.weapon = new NpcWeapon(deps.npc, deps.physics, deps.scene, deps.playerCollider)
    this.weapon.equip()
    this.combat = new ArmedBrain(deps.npc, this.base, this.weapon)
    const red = new THREE.LineBasicMaterial({ color: 0xff3030, depthTest: false, transparent: true })
    this.laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), red)
    this.laserEnd = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3030, depthTest: false, transparent: true }))
    this.target = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07),
      new THREE.MeshBasicMaterial({ color: 0xffc400, wireframe: true, depthTest: false, transparent: true }),
    )
    for (const o of [this.laser, this.laserEnd, this.target]) o.renderOrder = 999
    this.aimDebug.add(this.laser, this.laserEnd, this.target)
    this.aimDebug.visible = false
    deps.scene.add(this.aimDebug)
  }

  /** Atualiza a linha de mira (só com o debug visual ligado). */
  private updateAimDebug() {
    const show = this.base.cone.visible && this.weapon.held
    this.aimDebug.visible = show
    if (!show) return
    const end = this.weapon.barrelEnd(new THREE.Vector3())
    const pos = this.laser.geometry.getAttribute('position') as THREE.BufferAttribute
    pos.setXYZ(0, this.weapon.muzzle.x, this.weapon.muzzle.y, this.weapon.muzzle.z)
    pos.setXYZ(1, end.x, end.y, end.z)
    pos.needsUpdate = true
    this.laser.geometry.computeBoundingSphere()
    this.laserEnd.position.copy(end)
    // Alvo pretendido só quando ele está em combate.
    this.target.visible = this.combat.state !== 'unarmed'
    this.target.position.copy(this.combat.aimPoint)
  }

  get enabled() {
    return this.base.enabled
  }
  set enabled(v: boolean) {
    this.base.enabled = v
  }

  get debug(): BrainDebug {
    const d = this.base.debug
    const c = this.combat.debug
    // Mostra o estado de combate quando ele está no controle.
    if (c.held && c.state !== 'unarmed') d.ai = `armado: ${c.state}${c.reloading ? ' (recarregando)' : ''} · ${c.ammo}`
    return d
  }

  get cone() {
    return this.base.cone
  }

  update(dt: number, ctx: BrainContext) {
    this.base.update(dt, ctx)
    if (this.base.enabled) this.combat.update(dt, ctx.player)
    this.updateAimDebug()
  }

  reset() {
    this.base.reset()
    this.combat.reset()
  }

  walkTo(point: THREE.Vector3, run: boolean) {
    this.base.walkTo(point, run)
  }

  notice(point: THREE.Vector3, fright: number) {
    this.base.notice(point, fright)
  }

  wounded(region: Region) {
    this.base.wounded(region)
  }

  dispose() {
    this.aimDebug.removeFromParent()
    this.aimDebug.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
    })
    this.weapon.dispose()
    this.base.dispose()
    this.npc.armBoost.L = 1
    this.npc.armBoost.R = 1
    this.npc.overlay = null
  }
}
