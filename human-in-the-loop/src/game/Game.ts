import * as THREE from 'three'
import { BuildMode, type BuildState } from './build/BuildMode'
import { Gunfire } from './weapons/Gunfire'
import { Blood } from './fx/Blood'
import { Melee } from './weapons/Melee'
import { WeaponSystem, type WeaponState } from './weapons/WeaponSystem'
import { ColliderDebug } from './debug/ColliderDebug'
import { createLoop } from './engine/loop'
import { initPhysics, Physics, RAPIER } from './engine/physics'
import { ArmedNpcBrain } from './npc/ArmedNpcBrain'
import { createBrain } from './npc/createBrain'
import { SPAWN_ITEMS } from './sandbox/spawnCatalog'
import { NPC_CONFIGS, type BrainDebug, type NpcBrain, type NpcKind, type PlayerInfo } from './npc/types'
import { Npc, type NpcDebug } from './npc/Npc'
import { POSE_IDS, type PoseId } from './npc/poses'
import { createRenderContext } from './engine/render'
import { FpsLook } from './player/FpsLook'
import { Input } from './player/Input'
import { PlayerBody } from './player/PlayerBody'
import { buildLab, buildLights, LAB } from './world/lab'
import { createMaterials } from './world/materials'
import { createProps } from './world/props'
import { Sandbox, type SandboxState } from './sandbox/Sandbox'
import { Arena, ARENA, MODE_NPC, type ArenaState, type GameMode } from './arena/Arena'
import type { Room } from './world/dungeon'
import type { ToolId } from './sandbox/Tools'

/** Campo de visão normal (graus). */
const BASE_FOV = 70

export interface GameStats {
  fps: number
  /** Tempo médio de CPU por frame gasto na física, em ms. */
  physicsMs: number
  /** Tempo médio de CPU por frame para montar o render, em ms (a GPU roda depois). */
  renderMs: number
  bodies: number
  /** NPC mostrado no painel (no sandbox, o único; na masmorra, o mais perto). Null se não há. */
  npc: NpcDebug | null
  /** IA do NPC: estado, percepção, reflexo. */
  brain: BrainDebug | null
  /** NPCs na cena. */
  npcs: number
  player: {
    x: number
    y: number
    z: number
    speed: number
    grounded: boolean
    crouching: boolean
  }
}

export interface DebugState {
  /** Painel de debug visível durante o jogo. */
  panel: boolean
  colliders: boolean
  paused: boolean
  /** Força dos motores do NPC: 0 = mole, 1 = estátua. */
  npcStrength: number
  /** Pose-alvo dos motores do NPC. */
  npcPose: PoseId
  /** Controle de equilíbrio do NPC ligado. */
  npcBalance: boolean
  /** NPC levanta sozinho depois de cair. */
  npcAutoGetUp: boolean
  /** NPC olha para o jogador. */
  npcLook: boolean
  /** IA do NPC ligada (ver, esquivar, fugir, cobertura). */
  npcAi: boolean
  /** Tipo do NPC (cérebro + ficha). Trocar reinicia a simulação; R mantém. */
  npcKind: NpcKind
}

export interface GameEvents {
  onLockChange: (locked: boolean) => void
  onStats: (stats: GameStats) => void
  onDebugChange: (debug: DebugState) => void
  onBuildChange: (build: BuildState) => void
  onWeaponChange: (weapon: WeaponState) => void
  /** Um tiro acertou o NPC (marcador na mira). */
  onHitMarker: () => void
  /** Entrou/saiu da mira pela alça (esconde a mira do centro). */
  onAimChange: (aiming: boolean) => void
  /** Mãos, ferramentas e menu de spawn (passos 27–30). */
  onSandboxChange?: (state: SandboxState) => void
  /** Modos zumbi/SWAT: vida, mortes, avisos. */
  onArenaChange?: (state: ArenaState) => void
}

export interface Game {
  /** Captura o mouse e entra no jogo. */
  lock: () => void
  setSensitivity: (value: number) => void
  /** Sangue: 0 desliga; 0.5 baixo, 1 normal, 2 alto. */
  setBlood: (level: number) => void
  setPixelRatio: (value: number) => void
  /** Campo de visão normal em graus (a mira pela alça continua relativa a ele). */
  setFov: (value: number) => void
  setDebug: (patch: Partial<DebugState>) => void
  /** Troca o tipo do NPC e reinicia a simulação (reinicia tudo, como R). */
  setNpcKind: (kind: NpcKind) => void
  /** Avança a física um único passo (com a física pausada). */
  stepOnce: () => void
  /** Volta jogador e objetos para o estado inicial. */
  resetScene: () => void
  /** Remove tudo o que o jogador construiu. */
  clearBuilt: () => void
  /** Menu de spawn: cria o item `id` (SPAWN_ITEMS) na mira e fecha o menu. */
  spawnItem: (id: string) => void
  /** Escolhe uma ferramenta (empunha a arma de ferramentas) e fecha o menu. */
  selectTool: (id: ToolId) => void
  setSpawnMenu: (open: boolean) => void
  readonly mode: GameMode
  dispose: () => void
}

/**
 * Monta e roda o jogo dentro de `host`. Tudo aqui é imperativo e fica fora
 * do React; o React só recebe eventos/estado para o HUD.
 */
/** Um NPC na cena: corpo + cérebro (+ sala de origem, na masmorra). */
interface Actor {
  npc: Npc
  brain: NpcBrain
  kind: NpcKind
  home?: Room
  counted?: boolean
}

export async function createGame(
  host: HTMLElement,
  events: GameEvents,
  initialDebug: DebugState,
  mode: GameMode = 'sandbox',
): Promise<Game> {
  await initPhysics()
  let baseFov = BASE_FOV

  const ctx = createRenderContext(host)
  const physics = new Physics()
  const materials = createMaterials(ctx.renderer)
  const disposers: (() => void)[] = []

  const sandboxMode = mode === 'sandbox'
  // Sandbox: laboratório com objetos soltos. Zumbi/SWAT: masmorra (a Arena monta).
  let props: ReturnType<typeof createProps> | null = null
  if (sandboxMode) {
    disposers.push(buildLights(ctx.scene))
    disposers.push(buildLab(ctx.scene, physics, materials))
    props = createProps(ctx.scene, physics, materials)
    disposers.push(() => props?.dispose())
  }

  const input = new Input()
  disposers.push(() => input.dispose())
  const look = new FpsLook(ctx.renderer.domElement, (locked) => {
    input.enabled = locked
    if (!locked) input.clear()
    events.onLockChange(locked)
  })
  disposers.push(() => look.dispose())

  // As armas antes da arena (ela define o equipamento); a arena antes do jogador (ponto de partida).
  const weapons = new WeaponSystem(events.onWeaponChange)
  disposers.push(() => weapons.dispose())
  const actors: Actor[] = []
  let arena: Arena | null = null
  let sandbox: Sandbox | undefined
  if (!sandboxMode) {
    arena = new Arena({
      mode,
      scene: ctx.scene,
      physics,
      materials,
      weapons,
      actors: () => actors,
      spawnActor: (pos, yaw, home) => {
        const a = addActor(MODE_NPC[mode], pos, yaw)
        a.home = home
      },
      removeActor: (a) => removeActor(a as Actor),
      onChange: (st) => events.onArenaChange?.(st),
    })
    disposers.push(() => arena?.dispose())
  }

  const player = new PlayerBody(physics.world, arena ? arena.spawn : LAB.playerSpawn)
  const eye = new THREE.Vector3()
  const lookAtCenter = () => {
    const p = player.eyePosition(1, eye)
    if (arena) look.lookAt(p, p.clone().add(new THREE.Vector3(0, 0, -5)))
    else look.lookAt(p, new THREE.Vector3(0, 1.2, 0))
  }
  lookAtCenter()

  /** Liga um cérebro novo ao corpo do ator (tipo, aparência, arma). */
  const makeBrain = (npc: Npc, kind: NpcKind): NpcBrain => {
    const config = NPC_CONFIGS[kind]
    npc.applyConfig(config)
    npc.ragdoll.setLook(kind === 'zombie' ? 'zombie' : 'dummy')
    const b = createBrain(kind, { npc, physics, scene: ctx.scene, config, playerCollider: player.collider })
    if (b instanceof ArmedNpcBrain) {
      // Tiro que acerta o jogador: empurrão e, na masmorra, dano.
      b.weapon.onHit = (e) => {
        player.shove(e.impulse.x / 80, e.impulse.z / 80)
        arena?.damage(ARENA.shotDamage[e.region])
      }
      // Arma largada: no sandbox vira item pegável (E); na masmorra, munição no chão.
      b.weapon.onDrop = (d) => {
        if (arena) {
          arena.dropAmmo(d.pos)
          return
        }
        const item = SPAWN_ITEMS.find((i) => i.id === 'w-pistol')
        if (!item || !sandbox) return
        const s = sandbox.spawner.spawn(item, d.pos, d.rot)
        s.body.setLinvel(d.vel, true)
        s.body.setAngvel(d.angvel, true)
      }
    }
    return b
  }

  function addActor(kind: NpcKind, pos: THREE.Vector3, yaw: number): Actor {
    const npc = new Npc(physics, ctx.scene)
    npc.spawn(pos, yaw)
    const a: Actor = { npc, kind, brain: makeBrain(npc, kind) }
    npc.onWound = (region) => a.brain.wounded(region)
    npc.grip.ignore = player.collider
    // Membro que vai se soltar: as mãos do jogador soltam antes (senão restauram o grupo de colisão antigo).
    npc.onDetach.add(() => {
      if (sandbox?.hands.holdingNpc) sandbox.hands.release()
    })
    npc.setStrength(debug.npcStrength)
    npc.setPose(debug.npcPose)
    npc.setBalance(debug.npcBalance)
    npc.autoGetUp = debug.npcAutoGetUp
    a.brain.enabled = debug.npcAi !== false
    a.brain.cone.visible = debug.colliders
    actors.push(a)
    return a
  }

  function removeActor(a: Actor) {
    const i = actors.indexOf(a)
    if (i < 0) return
    if (sandbox?.hands.holdingNpc) sandbox.hands.release()
    actors.splice(i, 1)
    a.brain.dispose()
    a.npc.dispose()
  }
  disposers.push(() => {
    for (const a of [...actors]) removeActor(a)
  })
  const ownerOf = (body: RAPIER.RigidBody) => actors.find((a) => a.npc.owns(body))
  const isNpcBody = (body: RAPIER.RigidBody) => actors.some((a) => a.npc.owns(body))
  const tmpPos = new THREE.Vector3()
  /** NPC "principal": no sandbox o único; na masmorra o vivo mais perto do jogador. */
  const primary = (): Actor | undefined => {
    if (actors.length <= 1) return actors[0]
    const t = player.body.translation()
    let best: Actor | undefined
    let bestD = Infinity
    for (const a of actors) {
      a.npc.position(tmpPos)
      const d = (tmpPos.x - t.x) ** 2 + (tmpPos.z - t.z) ** 2 + (a.npc.isDead ? 1e4 : 0)
      if (d < bestD) {
        bestD = d
        best = a
      }
    }
    return best
  }

  // Sandbox: um NPC só (boneco de crash test), de frente para o jogador.
  const NPC_SPAWN = new THREE.Vector3(0, 0, 9)
  const NPC_YAW = Math.PI
  let npcKind: NpcKind = sandboxMode ? initialDebug.npcKind : MODE_NPC[mode]
  const debug: DebugState = { ...initialDebug, npcKind }
  if (!sandboxMode) debug.npcStrength = NPC_CONFIGS[npcKind].strength
  if (sandboxMode) addActor(npcKind, NPC_SPAWN, NPC_YAW)
  const playerInfo: PlayerInfo = {
    eye: new THREE.Vector3(),
    aimDir: new THREE.Vector3(0, 0, -1),
    ads: 0,
    weapon: 'hands',
    swinging: false,
    collider: player.collider,
    shove: (x, z) => player.shove(x, z),
    slow: (f) => player.slow(f),
    damage: (n) => arena?.damage(n),
  }

  /** Debug (M / Shift+M): o NPC anda (corre) até o ponto do chão na mira. */
  const orderWalk = (run: boolean) => {
    ctx.camera.getWorldPosition(camPos)
    ctx.camera.getWorldDirection(camDir)
    const a = primary()
    if (!a) return
    const hit = physics.world.castRay(new RAPIER.Ray(camPos, camDir), 60, true, undefined, undefined, player.collider, undefined, (c) => {
      const b = c.parent()
      return !(b && isNpcBody(b))
    })
    if (!hit) return
    const p = camPos.clone().addScaledVector(camDir, hit.timeOfImpact)
    a.brain.walkTo(p, run)
  }
  const lookForward = () => new THREE.Vector3(-Math.sin(look.yaw), 0, -Math.cos(look.yaw))
  /** Debug (F/G): empurrão horizontal no peito do NPC, na direção do olhar. */
  const pushNpc = (impulse: number) => primary()?.npc.push(lookForward().multiplyScalar(impulse))

  /** Debug (T): solta o NPC 2,5 m à frente do jogador, de 1,5 m de altura, girando. */
  const dropRagdoll = () => {
    const feet = player.eyePosition(1, new THREE.Vector3()).setY(0).addScaledVector(lookForward(), 2.5)
    const r = () => Math.random() * 2 - 1
    primary()?.npc.drop(feet, look.yaw + Math.PI, {
      lift: 1.5,
      tilt: new THREE.Euler(r() * 1.2, 0, r() * 1.2),
      spin: new THREE.Vector3(r() * 3, r() * 3, r() * 3),
    })
  }

  const build = new BuildMode(ctx.scene, physics, materials, player.collider, events.onBuildChange)
  disposers.push(() => build.dispose())
  events.onBuildChange(build.state)

  events.onWeaponChange(weapons.state)
  const melee = new Melee(physics, player.collider)
  weapons.melee = melee
  const gunfire = new Gunfire(ctx.scene, physics, player.collider)
  disposers.push(() => gunfire.dispose())
  const blood = new Blood(ctx.scene, physics, player.collider)
  disposers.push(() => blood.dispose())
  const sb = new Sandbox({
    scene: ctx.scene,
    physics,
    materials,
    weapons,
    player,
    look,
    isNpc: isNpcBody,
    onChange: events.onSandboxChange,
  })
  sandbox = sb
  // Masmorra: sem menu de spawn nem ferramentas (só mãos e armas coletadas).
  sb.restricted = !sandboxMode
  disposers.push(() => sb.dispose())
  let wasAiming = false
  const camPos = new THREE.Vector3()
  const feet = new THREE.Vector3()
  const camDir = new THREE.Vector3()
  const muzzle = new THREE.Vector3()

  /** Tiro a partir do centro da tela, com uma pequena dispersão. */
  const shoot = () => {
    const w = weapons.current
    ctx.camera.updateMatrixWorld()
    ctx.camera.getWorldPosition(camPos)
    const spread = w.spread ?? (w.automatic ? 0.006 : 0.002)
    const impulse = w.impulse ?? 10
    weapons.muzzleWorld(ctx.camera, muzzle)
    // Espingarda: vários chumbos por disparo, cada um com a sua dispersão.
    for (let i = 0; i < (w.pellets ?? 1); i++) {
      ctx.camera.getWorldDirection(camDir)
      camDir.x += (Math.random() - 0.5) * spread
      camDir.y += (Math.random() - 0.5) * spread
      camDir.z += (Math.random() - 0.5) * spread
      camDir.normalize()
      const hit = gunfire.fire(camPos, camDir, muzzle, impulse)
      const target = hit?.body ? ownerOf(hit.body) : undefined
      if (hit?.body && target) {
        const npc = target.npc
        npc.hit(hit.body, camDir.clone().multiplyScalar(impulse), hit.point, 'shot')
        const part = npc.ragdoll.partOf(hit.body)
        if (part) blood.hit(part, hit.point, camDir, impulse, npc)
        events.onHitMarker()
      }
    }
    // Os NPCs ouvem o tiro (e se assustam, mesmo sem ver).
    for (const a of actors) a.brain.notice(camPos, 0.35)
    // Recuo: a mira sobe e desvia um pouco para o lado.
    const recoil = w.recoil ?? 0.01
    look.pitch = Math.min(look.pitch + recoil, Math.PI / 2 - 0.01)
    look.yaw += (Math.random() - 0.5) * recoil * 0.6
  }

  /**
   * Arma encostada: se há algo à frente mais perto que o comprimento da
   * arma, ela recolhe (não atravessa) e, se for um corpo solto (NPC, caixa),
   * empurra de leve conforme o quanto encosta.
   */
  const weaponContact = (dt: number) => {
    const w = weapons.current
    ctx.camera.getWorldPosition(camPos)
    ctx.camera.getWorldDirection(camDir)
    const hit = physics.world.castRay(new RAPIER.Ray(camPos, camDir), w.length, true, undefined, undefined, player.collider)
    if (!hit || build.active) {
      weapons.setTuck(0)
      return
    }
    const penetration = (w.length - hit.timeOfImpact) / w.length
    weapons.setTuck(penetration * 1.3)
    const body = hit.collider.parent()
    if (body?.isDynamic() && player.speed > 0.2) {
      const point = camPos.clone().addScaledVector(camDir, hit.timeOfImpact)
      body.applyImpulseAtPoint(camDir.clone().setY(0).multiplyScalar(220 * penetration * dt), point, true)
    }
  }

  const colliderDebug = new ColliderDebug(ctx.scene, physics.world, (c) => c.handle === player.collider.handle)
  disposers.push(() => colliderDebug.dispose())

  // --- Debug ---------------------------------------------------------------
  let stepRequested = false
  const setDebug = (patch: Partial<DebugState>) => {
    Object.assign(debug, patch)
    debug.npcStrength = Math.round(Math.min(1, Math.max(0, debug.npcStrength)) * 100) / 100
    colliderDebug.visible = debug.colliders
    for (const { npc, brain } of actors) {
      if (debug.npcStrength !== npc.strength) npc.setStrength(debug.npcStrength)
      if (debug.npcPose !== npc.poseId) npc.setPose(debug.npcPose)
      if (debug.npcBalance !== npc.balanceEnabled) npc.setBalance(debug.npcBalance)
      npc.autoGetUp = debug.npcAutoGetUp
      brain.enabled = debug.npcAi !== false
      brain.cone.visible = debug.colliders
    }
    // O tipo só troca no sandbox (na masmorra, o modo define o NPC).
    if (!sandboxMode) debug.npcKind = npcKind
    else if (debug.npcKind !== npcKind) changeNpcKind(debug.npcKind)
    events.onDebugChange({ ...debug })
  }
  /** Tipo novo: cérebro e ficha novos, força inicial do tipo, simulação reiniciada. */
  function changeNpcKind(kind: NpcKind) {
    npcKind = kind
    debug.npcKind = kind
    debug.npcStrength = NPC_CONFIGS[kind].strength
    const a = actors[0]
    if (a) {
      a.brain.dispose()
      a.kind = kind
      a.brain = makeBrain(a.npc, kind)
      a.npc.setStrength(debug.npcStrength)
      a.brain.enabled = debug.npcAi !== false
      a.brain.cone.visible = debug.colliders
    }
    resetScene()
  }
  setDebug({})

  const resetScene = () => {
    // Primeiro o sandbox: descongela e desfaz cordas antes de recolocar tudo.
    sb.reset()
    props?.reset()
    build.resetPlaced()
    gunfire.clearMarks()
    blood.clear()
    if (arena) {
      // Masmorra nova (os NPCs somem; aparecem de novo ao entrar nas salas).
      player.spawnFeet.copy(arena.reset())
    } else {
      for (const a of actors) {
        a.npc.spawn(NPC_SPAWN, NPC_YAW)
        a.brain.reset()
      }
    }
    player.respawn()
    lookAtCenter()
  }

  /** Atalhos: ` abre/fecha o painel; P, V e . só valem com o painel aberto. */
  const handleDebugKeys = () => {
    if (input.consume('KeyR')) resetScene()
    // Na masmorra, os atalhos de mexer no NPC só valem com o painel de debug aberto.
    if (!sandboxMode && !debug.panel) {
      for (const k of ['KeyT', 'KeyF', 'KeyG', 'KeyM']) input.consume(k)
      if (input.consume('Backquote')) setDebug({ panel: true })
      return
    }
    if (input.consume('KeyT')) dropRagdoll()
    if (input.consume('KeyF')) pushNpc(40)
    if (input.consume('KeyG')) pushNpc(110)
    if (input.consume('KeyM')) orderWalk(input.isDown('ShiftLeft') || input.isDown('ShiftRight'))
    if (input.consume('Backquote')) setDebug({ panel: !debug.panel })
    if (!debug.panel) return
    if (input.consume('KeyP')) setDebug({ paused: !debug.paused })
    if (input.consume('KeyV')) setDebug({ colliders: !debug.colliders })
    if (input.consume('Period')) stepRequested = true
    if (input.consume('BracketLeft')) setDebug({ npcStrength: debug.npcStrength - 0.1 })
    if (input.consume('BracketRight')) setDebug({ npcStrength: debug.npcStrength + 0.1 })
    if (input.consume('KeyK')) setDebug({ npcBalance: !debug.npcBalance })
    if (input.consume('KeyL')) setDebug({ npcAutoGetUp: !debug.npcAutoGetUp })
    if (input.consume('KeyO')) setDebug({ npcLook: !debug.npcLook })
    if (input.consume('KeyI')) setDebug({ npcAi: !debug.npcAi })
    if (input.consume('KeyN')) {
      setDebug({ npcPose: POSE_IDS[(POSE_IDS.indexOf(debug.npcPose) + 1) % POSE_IDS.length] })
    }
  }

  // --- Medição de desempenho, enviada ao HUD 2× por segundo -----------------
  let frames = 0
  let physicsAcc = 0
  let renderAcc = 0
  let statsTimer = 0
  const emitStats = () => {
    const t = player.body.translation()
    const a = primary()
    events.onStats({
      fps: frames / statsTimer,
      physicsMs: physicsAcc / frames,
      renderMs: renderAcc / frames,
      bodies: physics.world.bodies.len(),
      npc: a ? { ...a.npc.debug } : null,
      brain: a ? { ...a.brain.debug } : null,
      npcs: actors.length,
      player: {
        x: t.x,
        y: t.y,
        z: t.z,
        speed: player.speed,
        grounded: player.isGrounded,
        crouching: player.isCrouching,
      },
    })
  }

  const loop = createLoop({
    fixedUpdate: (dt) => {
      handleDebugKeys()
      if (debug.paused && !stepRequested) return
      stepRequested = false

      const t0 = performance.now()
      // Percepção da IA: onde o jogador está, para onde mira e com o quê.
      player.eyePosition(1, playerInfo.eye)
      playerInfo.aimDir.set(
        -Math.sin(look.yaw) * Math.cos(look.pitch),
        Math.sin(look.pitch),
        -Math.cos(look.yaw) * Math.cos(look.pitch),
      )
      playerInfo.ads = weapons.ads
      playerInfo.weapon = weapons.current.kind
      playerInfo.swinging = melee.phase === 'charging' || melee.phase === 'swinging'
      for (const { npc, brain } of actors) {
        brain.update(dt, { player: playerInfo })
        if (!debug.npcLook) npc.lookTarget = null
        npc.update(dt)
      }
      const dead = !!arena?.isDead
      player.update(
        dt,
        dead
          ? { forward: 0, right: 0, sprint: false, crouch: true, jump: false, aiming: false }
          : {
          forward: input.axis('KeyS', 'KeyW'),
          right: input.axis('KeyA', 'KeyD'),
          sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
          // Ctrl ficaria perigoso: Ctrl+W fecha a aba do navegador.
          crouch: input.isDown('KeyC'),
          jump: input.consume('Space'),
          aiming: weapons.ads > 0.5,
        },
        look.yaw,
      )
      sb.fixedUpdate(dt)
      if (arena) {
        const t = player.body.translation()
        arena.update(dt, feet.set(t.x, 0, t.z))
      }
      physics.step()
      physicsAcc += performance.now() - t0
    },
    render: (alpha, frameDt) => {
      const t0 = performance.now()
      // Pausado, mostra o último passo exato (sem interpolar entre dois passos).
      const a = debug.paused ? 1 : alpha
      physics.interpolate(a)
      ctx.camera.position.copy(player.eyePosition(a, eye))
      // Mira pela alça: FOV fecha e a sensibilidade cai na mesma proporção.
      weapons.setAiming(!build.active && !sb.menuOpen && input.isDown('Mouse2'))
      const fov = THREE.MathUtils.lerp(baseFov, Math.min(baseFov, weapons.current.adsFov ?? baseFov), weapons.ads)
      if (Math.abs(ctx.camera.fov - fov) > 0.01) {
        ctx.camera.fov = fov
        ctx.camera.updateProjectionMatrix()
      }
      // Arma pesada também vira mais devagar na mira (passo 28).
      look.zoomScale =
        (Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.tan(THREE.MathUtils.degToRad(baseFov / 2))) *
        weapons.aimSensitivityScale
      const [breathPitch, breathYaw] = weapons.breathOffset()
      look.apply(ctx.camera, breathPitch, breathYaw)
      const aimingNow = weapons.ads > 0.6
      if (aimingNow !== wasAiming) {
        wasAiming = aimingNow
        events.onAimChange(aimingNow)
      }
      // Masmorra: sem modo construção.
      if (arena) input.consume('KeyB')
      build.frame(ctx.camera, input)
      weapons.setHolstered(build.active)
      ctx.camera.updateMatrixWorld()
      // Mãos, ferramentas, menu de spawn (lê os cliques antes das armas).
      const dead = !!arena?.isDead
      sb.frame(build.active || dead ? null : input, ctx.camera)
      const weaponInput = build.active || sb.blocksWeapons || dead ? null : input
      if (weapons.current.kind === 'gun') {
        melee.reset()
        if (weapons.trigger(weaponInput, frameDt)) shoot()
      } else {
        const ready = !!weaponInput && weapons.ready
        for (const hit of melee.update(frameDt, ready ? input : null, weapons.current, ctx.camera)) {
          const target = ownerOf(hit.body)
          if (target) {
            const npc = target.npc
            npc.hit(hit.body, hit.impulse, hit.point, 'melee')
            const part = npc.ragdoll.partOf(hit.body)
            if (part) blood.hit(part, hit.point, hit.impulse, hit.impulse.length(), npc)
            events.onHitMarker()
          }
        }
      }
      weaponContact(frameDt)
      weapons.playerVelocity.copy(player.velocityWorld)
      weapons.frame(frameDt, build.active || sb.menuOpen ? null : input, look.yaw, look.pitch, player.speed, player.isGrounded)
      gunfire.update(frameDt)
      const near = primary()
      if (!debug.paused && near) blood.update(frameDt, near.npc)
      colliderDebug.update()
      ctx.renderer.render(ctx.scene, ctx.camera)
      weapons.render(ctx.renderer, ctx.camera.aspect)

      frames++
      renderAcc += performance.now() - t0
      statsTimer += frameDt
      if (statsTimer >= 0.5) {
        emitStats()
        frames = 0
        physicsAcc = 0
        renderAcc = 0
        statsTimer = 0
      }
    },
  })
  loop.start()

  return {
    lock: () => void look.lock(),
    setSensitivity: (value) => {
      look.sensitivity = value
    },
    setBlood: (level) => blood.setLevel(level),
    setPixelRatio: (value) => ctx.setPixelRatio(value),
    setFov: (value) => {
      baseFov = THREE.MathUtils.clamp(value, 50, 110)
    },
    setDebug,
    setNpcKind: (kind) => setDebug({ npcKind: kind }),
    stepOnce: () => {
      stepRequested = true
    },
    resetScene,
    clearBuilt: () => build.clear(),
    spawnItem: (id) => sb.spawn(id),
    mode,
    selectTool: (id) => sb.selectTool(id),
    setSpawnMenu: (open) => sb.setMenu(open),
    dispose() {
      loop.stop()
      for (const d of disposers.reverse()) d()
      materials.dispose()
      physics.dispose()
      ctx.dispose()
    },
  }
}
