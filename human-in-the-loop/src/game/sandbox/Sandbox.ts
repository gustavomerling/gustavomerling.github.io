import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import type { FpsLook } from '../player/FpsLook'
import type { Input } from '../player/Input'
import type { PlayerBody } from '../player/PlayerBody'
import type { WeaponSystem } from '../weapons/WeaponSystem'
import { weaponIndex, WEAPONS, type WeaponKind } from '../weapons/weapons'
import type { Materials } from '../world/materials'
import { GRAB_REACH, Hands } from './Hands'
import { SPAWN_ITEMS } from './spawnCatalog'
import { Spawner } from './Spawner'
import { TOOLS, Tools, type ToolId } from './Tools'

/** Alcance para criar itens e para apagar com X (m). */
const SPAWN_REACH = 12
/** Sem nada na mira, o item nasce a esta distância à frente. */
const SPAWN_AIR = 3

export interface SandboxState {
  menuOpen: boolean
  /** Tipo da arma/slot atual (mãos, ferramentas...). */
  slot: WeaponKind
  tool: ToolId
  toolName: string
  toolHint: string
  holding: boolean
  holdingNpc: boolean
  /** Corda/mola com o ponto A já escolhido. */
  pending: boolean
  spawned: number
  links: number
  /** Item criado sob a mira: nome e se dá para pegar (arma ao alcance). */
  aimed: { name: string; pickup: boolean } | null
}

export interface SandboxDeps {
  scene: THREE.Scene
  physics: Physics
  materials: Materials
  weapons: WeaponSystem
  player: PlayerBody
  look: FpsLook
  isNpc: (body: RAPIER.RigidBody) => boolean
  onChange?: (s: SandboxState) => void
}

/**
 * Lado do jogador no sandbox (passos 27, 29 e 30): mãos físicas, menu de
 * spawn (Q), apagar (X), pegar arma do chão (E) e ferramentas (Tab troca).
 * O Game só chama `fixedUpdate`, `frame` e `reset`.
 */
export class Sandbox {
  readonly hands: Hands
  readonly tools: Tools
  readonly spawner: Spawner
  menuOpen = false
  /** Masmorra: sem menu de spawn (Q) nem ferramentas (Tab). */
  restricted = false
  /** Depois de arremessar, o clique esquerdo só volta a valer ao soltar o botão. */
  private suppressMouse0 = false
  /** Depois de arremessar, só agarra de novo ao soltar e apertar o direito. */
  private suppressMouse2 = false
  private lastKey = ''
  private aimed: SandboxState['aimed'] = null

  private readonly d: SandboxDeps
  private readonly camPos = new THREE.Vector3()
  private readonly camDir = new THREE.Vector3(0, 0, -1)
  private readonly eye = new THREE.Vector3()
  private readonly dir = new THREE.Vector3()

  constructor(deps: SandboxDeps) {
    this.d = deps
    this.hands = new Hands(deps.physics.world, deps.player.collider, deps.isNpc)
    deps.player.ignore = this.hands.ignores
    this.tools = new Tools(deps.scene, deps.physics, deps.player.collider, {
      release: (b) => this.hands.releaseIf(b),
      isNpc: deps.isNpc,
    })
    this.spawner = new Spawner(deps.scene, deps.physics, deps.materials)
  }

  /** Bloqueia tiro/golpe neste frame (menu aberto, segurando algo, logo após arremessar). */
  get blocksWeapons() {
    return this.menuOpen || this.hands.holding || this.suppressMouse0
  }

  get state(): SandboxState {
    const t = this.tools.toolDef
    return {
      menuOpen: this.menuOpen,
      slot: this.d.weapons.current.kind,
      tool: t.id,
      toolName: t.name,
      toolHint: t.hint,
      holding: this.hands.holding,
      holdingNpc: this.hands.holdingNpc,
      pending: this.tools.hasPending,
      spawned: this.spawner.count,
      links: this.tools.linkCount,
      aimed: this.aimed,
    }
  }

  setMenu(open: boolean) {
    if (open === this.menuOpen) return
    this.menuOpen = open
    this.d.look.frozen = open
    if (open) this.hands.release()
    // O clique que fechou o menu não pode virar tiro/agarrão.
    this.suppressMouse0 = this.suppressMouse2 = true
    this.emit()
  }

  selectTool(id: ToolId) {
    this.tools.select(id)
    this.d.weapons.select(weaponIndex('tool'))
    this.setMenu(false)
    this.emit()
  }

  /** Cria um item do menu no ponto da mira (em cima do que estiver lá). */
  spawn(id: string) {
    const item = SPAWN_ITEMS.find((i) => i.id === id)
    this.setMenu(false)
    if (!item) return
    const origin = this.camPos
    const dir = this.camDir
    const hit = this.d.physics.world.castRayAndGetNormal(
      new RAPIER.Ray(origin, dir),
      SPAWN_REACH,
      true,
      undefined,
      undefined,
      this.d.player.collider,
    )
    const s = item.size
    const pos = new THREE.Vector3()
    if (hit) {
      pos.copy(origin).addScaledVector(dir, hit.timeOfImpact)
      const n = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z)
      // Em cima (chão, topo de algo) ou encostado (parede, lateral).
      if (n.y > 0.7) pos.y += s.y / 2 + 0.01
      else pos.addScaledVector(n, Math.max(s.x, s.z) / 2 + 0.03)
    } else {
      pos.copy(origin).addScaledVector(dir, SPAWN_AIR)
    }
    pos.y = Math.max(pos.y, s.y / 2 + 0.01)
    // De frente para o jogador; arma deitada de lado.
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.d.look.yaw, item.weaponId ? Math.PI / 2 : 0, 'YXZ'))
    this.spawner.spawn(item, pos, rot)
    this.emit()
  }

  /** Um passo de física: mola das mãos e ímã. */
  fixedUpdate(dt: number) {
    const { player, look } = this.d
    player.eyePosition(1, this.eye)
    const cp = Math.cos(look.pitch)
    this.dir.set(-Math.sin(look.yaw) * cp, Math.sin(look.pitch), -Math.cos(look.yaw) * cp)
    this.hands.fixedUpdate(dt, this.eye, this.dir)
    this.tools.fixedUpdate(dt, this.eye, this.dir)
  }

  /**
   * Por frame, depois da interpolação e da câmera posicionada. `input` null
   * = sem controle (modo construção): solta o que estiver segurando.
   */
  frame(input: Input | null, camera: THREE.Camera) {
    camera.getWorldPosition(this.camPos)
    camera.getWorldDirection(this.camDir)
    const weapons = this.d.weapons
    if (this.menuOpen && (!input || !this.d.look.locked)) this.setMenu(false)

    if (input?.consume('KeyQ') && !this.restricted) this.setMenu(!this.menuOpen)
    if (this.menuOpen || !input) {
      // O clique no menu é tratado pela interface (cursor virtual).
      input?.consume('Mouse0')
      input?.consume('Mouse2')
      this.hands.release()
      this.tools.magnet = 0
    } else {
      if (input.consume('KeyX') && !this.restricted) this.deleteAimed()
      if (input.consume('KeyE')) this.pickupAimed()
      if (input.consume('Tab') && !this.restricted) {
        if (weapons.current.kind === 'tool') this.tools.next()
        else weapons.select(weaponIndex('tool'))
      }
      if (this.suppressMouse0) {
        input.consume('Mouse0')
        if (!input.isDown('Mouse0')) this.suppressMouse0 = false
      }
      if (this.suppressMouse2) {
        input.consume('Mouse2')
        if (!input.isDown('Mouse2')) this.suppressMouse2 = false
      }
      this.handleHands(input)
      this.handleTools(input)
    }
    weapons.setGrab(this.hands.holding)
    this.tools.frame()
    this.updateAimed()
    this.emit()
  }

  /** Reset da cena: solta, desfaz as ferramentas e apaga os itens criados. */
  reset() {
    this.hands.release()
    this.tools.clear()
    for (const s of this.spawner.all()) this.spawner.remove(s)
    this.setMenu(false)
    this.emit()
  }

  dispose() {
    this.hands.release()
    this.tools.dispose()
    this.spawner.dispose()
    this.d.player.ignore = null
  }

  // --- interno ----------------------------------------------------------------

  private handleHands(input: Input) {
    const hands = this.hands
    if (this.d.weapons.current.kind !== 'hands' || !this.d.weapons.ready) {
      hands.release()
      return
    }
    if (hands.holding) {
      if (input.consume('Mouse0')) {
        hands.throw(this.camDir)
        this.d.weapons.pulseThrow()
        this.suppressMouse0 = true
        this.suppressMouse2 = true
      } else if (!input.isDown('Mouse2')) {
        hands.release()
      }
    } else if (input.consume('Mouse2') || (input.isDown('Mouse2') && !this.suppressMouse2)) {
      // Segurando o botão, agarra assim que algo entrar na mira.
      hands.tryGrab(this.camPos, this.camDir)
    }
  }

  private handleTools(input: Input) {
    const tools = this.tools
    if (this.d.weapons.current.kind !== 'tool' || !this.d.weapons.ready) {
      tools.magnet = 0
      return
    }
    if (tools.tool === 'magnet') {
      input.consume('Mouse0')
      input.consume('Mouse2')
      tools.magnet = input.isDown('Mouse0') ? 1 : input.isDown('Mouse2') ? -1 : 0
      return
    }
    tools.magnet = 0
    if (input.consume('Mouse0')) tools.primary(this.camPos, this.camDir)
    if (input.consume('Mouse2')) tools.secondary()
  }

  private aimedSpawn(range: number) {
    const hit = this.d.physics.world.castRay(
      new RAPIER.Ray(this.camPos, this.camDir),
      range,
      true,
      undefined,
      undefined,
      this.d.player.collider,
    )
    if (!hit) return null
    const s = this.spawner.find(hit.collider)
    return s ? { spawned: s, distance: hit.timeOfImpact } : null
  }

  private deleteAimed() {
    const a = this.aimedSpawn(SPAWN_REACH)
    if (!a) return
    this.removeSpawned(a.spawned)
  }

  private pickupAimed() {
    const a = this.aimedSpawn(GRAB_REACH)
    const id = a?.spawned.item.weaponId
    if (!a || !id) return
    this.removeSpawned(a.spawned)
    this.d.weapons.give(weaponIndex(id))
  }

  private removeSpawned(s: ReturnType<Spawner['all']>[number]) {
    this.hands.releaseIf(s.body)
    this.tools.forgetBody(s.body)
    this.spawner.remove(s)
  }

  private updateAimed() {
    if (this.menuOpen || this.spawner.count === 0) {
      this.aimed = null
      return
    }
    const a = this.aimedSpawn(SPAWN_REACH)
    this.aimed = a ? { name: a.spawned.item.name, pickup: !!a.spawned.item.weaponId && a.distance <= GRAB_REACH } : null
  }

  private emit() {
    const s = this.state
    const key = JSON.stringify(s)
    if (key === this.lastKey) return
    this.lastKey = key
    this.d.onChange?.(s)
  }
}

export { SPAWN_ITEMS, TOOLS, WEAPONS }
export type { ToolId }
