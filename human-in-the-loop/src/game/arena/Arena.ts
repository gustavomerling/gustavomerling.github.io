import * as THREE from 'three'
import type { Physics } from '../engine/physics'
import type { Npc } from '../npc/Npc'
import type { NpcKind } from '../npc/types'
import { weaponIndex } from '../weapons/weapons'
import type { WeaponSystem } from '../weapons/WeaponSystem'
import { buildDungeon, buildDungeonLights, DUNGEON, generateDungeon, makeRng, type DungeonLayout, type Room } from '../world/dungeon'
import type { Materials } from '../world/materials'

/** Modo de jogo: sandbox (laboratório) ou masmorra com zumbis / SWAT. */
export type GameMode = 'sandbox' | 'zombie' | 'swat'

export const GAME_MODES: readonly GameMode[] = ['sandbox', 'zombie', 'swat']

export const MODE_LABELS: Record<GameMode, string> = {
  sandbox: 'Sandbox',
  zombie: 'Zumbi',
  swat: 'SWAT',
}

/** Tipo de NPC de cada modo de masmorra. */
export const MODE_NPC: Record<Exclude<GameMode, 'sandbox'>, NpcKind> = {
  zombie: 'zombie',
  swat: 'armed',
}

export const ARENA = {
  maxHp: 100,
  /** Balas iniciais da pistola. */
  startAmmo: 36,
  /** Coleta: raio no plano (m). */
  pickupRadius: 0.95,
  medkit: 40,
  /** Dano de um tiro de NPC no jogador, por região. */
  shotDamage: { head: 40, torso: 22, legs: 12 },
  /** Corpos mortos mantidos na cena (os mais antigos somem). */
  maxCorpses: 6,
}

type PickupKind = 'ammo' | 'med' | 'rifle' | 'shotgun'

const PICKUP_LABEL: Record<PickupKind, string> = {
  ammo: '+ munição',
  med: '+ vida',
  rifle: 'Rifle',
  shotgun: 'Espingarda',
}

interface Pickup {
  kind: PickupKind
  mesh: THREE.Object3D
  base: THREE.Vector3
}

/** NPC visto pela arena: o Game guarda o cérebro; aqui só corpo e sala de origem. */
export interface ArenaActor {
  npc: Npc
  home?: Room
  counted?: boolean
}

/** Uma sala no minimapa. */
export interface MapRoom {
  i: number
  j: number
  doors: [boolean, boolean, boolean, boolean]
  type: Room['type']
  visited: boolean
  current: boolean
  /** Ainda tem inimigos. */
  hostile: boolean
}

export interface ArenaState {
  mode: GameMode
  hp: number
  maxHp: number
  dead: boolean
  /** Chegou à saída. */
  won: boolean
  /** Saída liberada (sala final limpa). */
  exitOpen: boolean
  /** Salas já vistas (visitadas ou com porta para uma visitada). */
  map: MapRoom[]
  kills: number
  cleared: number
  rooms: number
  /** Aviso curto (coleta, sala limpa) e quando apareceu. */
  message: string
  messageAt: number
  /** Último dano (pisca a tela) e de onde veio: ângulo na tela (rad, horário a partir do topo) ou null. */
  hurtAt: number
  hurtAngle: number | null
}

interface ArenaDeps {
  mode: Exclude<GameMode, 'sandbox'>
  scene: THREE.Scene
  physics: Physics
  materials: Materials
  weapons: WeaponSystem
  actors: () => ArenaActor[]
  spawnActor: (pos: THREE.Vector3, yaw: number, home: Room) => void
  removeActor: (a: ArenaActor) => void
  onChange: (s: ArenaState) => void
}

/**
 * Modos zumbi e SWAT: masmorra de salas, inimigos que aparecem quando o
 * jogador entra numa sala (e somem quando ele se afasta duas salas — os
 * vivos voltam depois), coleta de munição/armas/vida e a vida do jogador.
 */
export class Arena {
  layout!: DungeonLayout
  private disposeWorld: (() => void) | null = null
  private readonly lights: ReturnType<typeof buildDungeonLights>
  private readonly d: ArenaDeps
  private readonly pickups: Pickup[] = []
  /** Inimigos que ainda faltam em cada sala (por índice). */
  private enemies: number[] = []
  private playerRoom: Room | undefined
  private t = 0
  private despawnT = 0
  private hp = ARENA.maxHp
  private dead = false
  private kills = 0
  private message = ''
  private messageAt = 0
  private hurtAt = 0
  private hurtAngle: number | null = null
  private fullMsgAt = 0
  private won = false
  private readonly visited = new Set<Room>()
  private emittedHp = -1
  private readonly geos: THREE.BufferGeometry[] = []
  private readonly mats: Record<string, THREE.Material> = {}
  private readonly tmp = new THREE.Vector3()

  constructor(d: ArenaDeps) {
    this.d = d
    this.lights = buildDungeonLights(d.scene, d.mode === 'zombie')
    const m = (color: string, emissive = '#000000') => new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.6 })
    this.mats.ammo = m('#5b6b2f')
    this.mats.band = m('#e0b43a', '#3a2a00')
    this.mats.med = m('#f2f0ea')
    this.mats.cross = m('#d42a2a', '#400000')
    this.mats.gun = m('#2b2d31')
    const ring = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false })
    // Anel no chão pela cor do item: munição amarela, vida vermelha, arma azul.
    this.mats.ring = ring('#ffd45a')
    this.mats.ringMed = ring('#ff5a4a')
    this.mats.ringGun = ring('#5ab4ff')
    this.build()
  }

  get spawn() {
    return this.layout.start.center.clone()
  }

  /** Morto ou já saiu: o jogador fica parado até recomeçar (R). */
  get isDead() {
    return this.dead || this.won
  }

  private get exitOpen() {
    return this.enemies[this.layout.end.index] === 0
  }

  private mapRooms() {
    const L = this.layout
    const D: [number, number][] = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]
    const seen = (r: Room) =>
      this.visited.has(r) || r.doors.some((o, d) => o && this.visited.has(L.at(r.i + D[d][0], r.j + D[d][1])!))
    return L.rooms.filter(seen).map((r) => ({
      i: r.i,
      j: r.j,
      doors: r.doors,
      type: r.type,
      visited: this.visited.has(r),
      current: r === this.playerRoom,
      hostile: this.enemies[r.index] > 0 && this.visited.has(r),
    }))
  }

  get state(): ArenaState {
    return {
      mode: this.d.mode,
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: ARENA.maxHp,
      dead: this.dead,
      won: this.won,
      exitOpen: this.exitOpen,
      map: this.mapRooms(),
      kills: this.kills,
      cleared: this.layout.rooms.filter((r) => r !== this.layout.start && this.enemies[r.index] === 0).length,
      rooms: this.layout.rooms.length - 1,
      message: this.message,
      messageAt: this.messageAt,
      hurtAt: this.hurtAt,
      hurtAngle: this.hurtAngle,
    }
  }

  private emit() {
    this.emittedHp = Math.ceil(this.hp)
    this.d.onChange(this.state)
  }

  private say(msg: string) {
    this.message = msg
    this.messageAt = performance.now()
    this.emit()
  }

  /** Masmorra nova (semente aleatória), coleta espalhada, vida cheia. */
  private build() {
    const seed = (Math.random() * 2 ** 31) | 0
    this.layout = generateDungeon(seed)
    this.disposeWorld = buildDungeon(this.d.scene, this.d.physics, this.d.materials, this.layout)
    const rng = makeRng(seed ^ 0x5eed)
    const enemyKind = this.d.mode
    this.enemies = this.layout.rooms.map((r) => {
      if (r === this.layout.start) return 0
      if (r === this.layout.end) return enemyKind === 'zombie' ? 4 : 3
      const base = enemyKind === 'zombie' ? 1 + Math.floor(r.depth * 0.7) : 1 + Math.floor(r.depth / 2)
      return Math.min(enemyKind === 'zombie' ? 4 : 3, base + (rng() < 0.35 ? 1 : 0))
    })
    for (const r of this.layout.rooms) {
      if (r === this.layout.start) {
        // Munição inicial entre o jogador e a porta (à vista ao nascer), um pouco de lado.
        const d = Math.max(0, r.doors.indexOf(true))
        const dir = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)][d]
        const side = new THREE.Vector3(-dir.z, 0, dir.x)
        this.addPickup('ammo', r.center.clone().addScaledVector(dir, 3).addScaledVector(side, 0.9))
        continue
      }
      const n = 1 + (rng() < 0.5 ? 1 : 0)
      const spots = [
        [1.6, 1.6],
        [-1.6, 1.6],
        [1.6, -1.6],
        [-1.6, -1.6],
      ].sort(() => rng() - 0.5)
      for (let k = 0; k < n; k++) {
        const x = rng()
        const kind: PickupKind = x < 0.55 ? 'ammo' : x < 0.8 ? 'med' : x < 0.9 ? 'rifle' : 'shotgun'
        this.addPickup(kind, r.center.clone().add(new THREE.Vector3(spots[k][0], 0, spots[k][1])))
      }
    }
    this.hp = ARENA.maxHp
    this.dead = false
    this.won = false
    this.kills = 0
    this.playerRoom = undefined
    this.visited.clear()
    this.d.weapons.setLoadout(ARENA.startAmmo)
    this.say(this.d.mode === 'zombie' ? 'Zumbis na masmorra' : 'SWAT na masmorra')
  }

  private clearWorld() {
    for (const a of [...this.d.actors()]) this.d.removeActor(a)
    for (const p of this.pickups) p.mesh.removeFromParent()
    this.pickups.length = 0
    this.disposeWorld?.()
    this.disposeWorld = null
  }

  /** Recomeça com uma masmorra nova. Devolve o novo ponto de partida. */
  reset() {
    this.clearWorld()
    this.build()
    return this.spawn
  }

  // --- Coleta -------------------------------------------------------------------

  private geo<T extends THREE.BufferGeometry>(g: T) {
    this.geos.push(g)
    return g
  }

  private addPickup(kind: PickupKind, pos: THREE.Vector3) {
    const g = new THREE.Group()
    const add = (geo: THREE.BufferGeometry, mat: string, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, this.mats[mat])
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      g.add(mesh)
      return mesh
    }
    if (kind === 'ammo') {
      add(this.geo(new THREE.BoxGeometry(0.42, 0.24, 0.28)), 'ammo')
      add(this.geo(new THREE.BoxGeometry(0.43, 0.06, 0.29)), 'band')
    } else if (kind === 'med') {
      add(this.geo(new THREE.BoxGeometry(0.4, 0.26, 0.3)), 'med')
      add(this.geo(new THREE.BoxGeometry(0.22, 0.27, 0.06)), 'cross', 0, 0, 0.13)
      add(this.geo(new THREE.BoxGeometry(0.06, 0.27, 0.22)), 'cross', 0, 0, 0.0)
    } else {
      const long = kind === 'rifle' ? 0.95 : 0.8
      add(this.geo(new THREE.BoxGeometry(long, 0.09, 0.07)), 'gun')
      add(this.geo(new THREE.BoxGeometry(0.1, 0.2, 0.07)), 'gun', -long * 0.25, -0.1, 0)
      add(this.geo(new THREE.BoxGeometry(0.25, 0.14, 0.07)), 'gun', -long * 0.45, -0.02, 0)
    }
    const ringMat = kind === 'ammo' ? this.mats.ring : kind === 'med' ? this.mats.ringMed : this.mats.ringGun
    const ring = new THREE.Mesh(this.geo(new THREE.RingGeometry(0.42, 0.52, 28)), ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -0.38
    g.add(ring)
    const base = pos.clone().setY(0.42)
    g.position.copy(base)
    this.d.scene.add(g)
    this.pickups.push({ kind, mesh: g, base })
  }

  /** Larga um item no chão (arma de um SWAT caído, sobra de zumbi). */
  drop(kind: PickupKind, pos: THREE.Vector3) {
    this.addPickup(kind, pos.clone().setY(0))
  }

  dropAmmo(pos: THREE.Vector3) {
    this.drop('ammo', pos)
  }

  private collect(p: Pickup) {
    const w = this.d.weapons
    switch (p.kind) {
      case 'ammo':
        w.addAmmo(weaponIndex('pistol'), 12)
        if (w.owned[weaponIndex('rifle')]) w.addAmmo(weaponIndex('rifle'), 20)
        if (w.owned[weaponIndex('shotgun')]) w.addAmmo(weaponIndex('shotgun'), 4)
        break
      case 'med':
        if (this.hp >= ARENA.maxHp) {
          // Avisa (sem repetir a cada passo) e deixa o kit no chão.
          if (performance.now() - this.fullMsgAt > 2500) {
            this.fullMsgAt = performance.now()
            this.say('Vida cheia')
          }
          return false
        }
        this.hp = Math.min(ARENA.maxHp, this.hp + ARENA.medkit)
        break
      case 'rifle':
      case 'shotgun': {
        const i = weaponIndex(p.kind)
        w.give(i)
        w.addAmmo(i, p.kind === 'rifle' ? 30 : 8)
        break
      }
    }
    this.say(PICKUP_LABEL[p.kind])
    return true
  }

  // --- Vida ---------------------------------------------------------------------

  /** `angle`: de onde veio, na tela (rad, horário a partir do topo); null = sem direção. */
  damage(amount: number, angle: number | null = null) {
    if (this.dead || this.won || amount <= 0) return
    this.hp -= amount
    const now = performance.now()
    // Dano contínuo (agarrão) não reacende o flash a cada passo.
    const fresh = now - this.hurtAt > 350 || angle !== this.hurtAngle
    if (fresh) {
      this.hurtAt = now
      this.hurtAngle = angle
    }
    if (this.hp <= 0) {
      this.hp = 0
      this.dead = true
      this.emit()
      return
    }
    if (fresh || Math.ceil(this.hp) !== this.emittedHp) this.emit()
  }

  // --- Passo ----------------------------------------------------------------------

  /** Chamado a cada passo fixo, com os pés do jogador. */
  update(dt: number, feet: THREE.Vector3) {
    this.t += dt
    this.lights.follow(feet)

    // Coleta: gira, flutua e é pega ao encostar.
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      p.mesh.rotation.y += dt * 1.6
      p.mesh.position.y = p.base.y + Math.sin(this.t * 2.5 + i) * 0.06
      const dx = p.base.x - feet.x
      const dz = p.base.z - feet.z
      if (!this.dead && dx * dx + dz * dz < ARENA.pickupRadius ** 2 && Math.abs(feet.y - 0) < 1.6 && this.collect(p)) {
        p.mesh.removeFromParent()
        this.pickups.splice(i, 1)
      }
    }

    const actors = this.d.actors()
    // Mortes contam para a sala de origem; sala zerada dá um prêmio no centro.
    for (const a of actors) {
      if (a.counted || !a.npc.isDead || !a.home) continue
      a.counted = true
      this.kills++
      const r = a.home
      this.enemies[r.index] = Math.max(0, this.enemies[r.index] - 1)
      a.npc.position(this.tmp)
      if (this.d.mode === 'zombie' && Math.random() < 0.3) this.dropAmmo(this.tmp)
      if (this.enemies[r.index] === 0) {
        const spot = r === this.layout.end ? r.center.clone().add(new THREE.Vector3(1.6, 0, 1.6)) : r.center
        this.drop(Math.random() < 0.5 ? 'med' : 'ammo', spot)
        this.say(r === this.layout.end ? 'Saída liberada' : 'Sala limpa')
      } else this.emit()
    }

    // Entrou numa sala com inimigos e nenhum deles está na cena: aparecem.
    const room = this.layout.roomAt(feet)
    if (room && room !== this.playerRoom) {
      this.playerRoom = room
      const first = !this.visited.has(room)
      this.visited.add(room)
      if (first && room === this.layout.end) this.say('Sala final: limpe para sair')
      else this.emit()
    }
    // Saída: alçapão no centro da sala final, depois de limpá-la.
    if (room === this.layout.end && this.exitOpen && !this.won && !this.dead) {
      if (Math.hypot(feet.x - room.center.x, feet.z - room.center.z) < 1.1) {
        this.won = true
        this.say('Você escapou')
      }
    }
    if (room && !this.dead && this.enemies[room.index] > 0 && !actors.some((a) => a.home === room && !a.npc.isDead)) {
      this.populate(room, feet)
    }

    // Duas salas longe do jogador: some (os vivos voltam quando ele voltar).
    this.despawnT -= dt
    if (this.despawnT <= 0 && this.playerRoom) {
      this.despawnT = 0.5
      const pr = this.playerRoom
      for (const a of [...actors]) {
        a.npc.position(this.tmp)
        const r = this.layout.roomAt(this.tmp) ?? a.home
        if (r && Math.abs(r.i - pr.i) + Math.abs(r.j - pr.j) >= 2) this.d.removeActor(a)
      }
      const corpses = this.d.actors().filter((a) => a.npc.isDead)
      for (let k = 0; k < corpses.length - ARENA.maxCorpses; k++) this.d.removeActor(corpses[k])
    }
  }

  /** Coloca os inimigos da sala nos cantos livres mais longe do jogador. */
  private populate(room: Room, feet: THREE.Vector3) {
    const c = 5.4
    const spots: [number, number][] = [
      [c, c],
      [-c, c],
      [c, -c],
      [-c, -c],
      [0, 0],
    ]
    // Meio das paredes sem porta também serve.
    if (!room.doors[0]) spots.push([c, 0])
    if (!room.doors[1]) spots.push([0, c])
    if (!room.doors[2]) spots.push([-c, 0])
    if (!room.doors[3]) spots.push([0, -c])
    const free = spots
      .filter(([x, z]) => room.obstacles.every((o) => Math.abs(o.x - x) > o.w / 2 + 0.8 || Math.abs(o.z - z) > o.d / 2 + 0.8))
      .map(([x, z]) => room.center.clone().add(new THREE.Vector3(x, 0, z)))
      .sort((a, b) => b.distanceToSquared(feet) - a.distanceToSquared(feet))
    const n = Math.min(this.enemies[room.index], free.length)
    for (let k = 0; k < n; k++) {
      const p = free[k]
      const yaw = Math.atan2(-(feet.x - p.x), -(feet.z - p.z))
      this.d.spawnActor(p, yaw, room)
    }
  }

  dispose() {
    this.clearWorld()
    this.lights.dispose()
    for (const g of this.geos) g.dispose()
    for (const m of Object.values(this.mats)) m.dispose()
  }
}

export { DUNGEON }
