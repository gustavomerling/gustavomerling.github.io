// Harness headless de regressão do NPC. Bundlado por run.mjs (rolldown) e
// executado em Node, sem navegador. Só precisa do stub de document feito em run.mjs.
import * as THREE from 'three'
import { initPhysics, Physics, RAPIER } from '../src/game/engine/physics'
import { NPC_CONFIGS } from '../src/game/npc/types'
import { Npc } from '../src/game/npc/Npc'
import { Brain, type PlayerInfo } from '../src/game/npc/Brain'
import { ArmedNpcBrain } from '../src/game/npc/ArmedNpcBrain'
import type { PartName } from '../src/game/npc/skeleton'

const DT = 1 / 60

export interface Metrics {
  fell: boolean
  /** s desde a queda até voltar a 'standing' (NaN se não caiu; Infinity se não levantou). */
  getUp: number
  /** Deslocamento horizontal final da pélvis em relação ao ponto de referência (m). */
  drift: number
  /** Velocidade angular relativa máxima entre juntas (rad/s). */
  maxJointW: number
  /** Velocidade linear máxima de um corpo (m/s). */
  maxBodyV: number
  /** Energia cinética (translacional) máxima do corpo todo (J). */
  maxKE: number
  extra?: Record<string, number>
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Sim {
  physics: Physics
  npc: Npc
  brain: Brain
  /** NPC armado: cérebro completo (o `brain` é a base dele). */
  armed: ArmedNpcBrain | null = null
  scene = new THREE.Scene()
  player: PlayerInfo
  t = 0
  maxJointW = 0
  maxBodyV = 0
  maxKE = 0
  fallT = -1
  standT = -1
  fell = false
  /** Andando: amostras, sem pé no chão, soma/soma² da altura da pélvis. */
  gaitN = 0
  airN = 0
  hSum = 0
  hSq = 0

  /** Métricas de "flutuação" do andar: % do tempo sem pé no chão, altura média e oscilação da pélvis. */
  gaitStats() {
    const n = Math.max(1, this.gaitN)
    const mean = this.hSum / n
    return { airPct: (100 * this.airN) / n, pelvisH: mean, bobCm: 100 * Math.sqrt(Math.max(0, this.hSq / n - mean * mean)) }
  }

  constructor(seed: number, kind: 'civilian' | 'armed' = 'civilian') {
    Math.random = mulberry32(seed)
    this.physics = new Physics()
    const w = this.physics.world
    // Piso (topo em y = 0), como o laboratório.
    w.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0).setFriction(0.8))
    const pb = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 60))
    const pc = w.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3), pb)
    this.npc = new Npc(this.physics, this.scene)
    this.npc.spawn(new THREE.Vector3(0, 0, 0), 0)
    const deps = { npc: this.npc, physics: this.physics, scene: this.scene, config: NPC_CONFIGS[kind], playerCollider: pc }
    if (kind === 'armed') {
      this.npc.applyConfig(NPC_CONFIGS.armed)
      this.npc.setStrength(NPC_CONFIGS.armed.strength)
      this.armed = new ArmedNpcBrain('armed', deps)
      this.brain = this.armed.base
    } else this.brain = new Brain('civilian', deps)
    this.npc.onWound = (r) => this.brain.wounded(r)
    // Ressemeia depois de montar a cena: o Three gasta Math.random nos ids de
    // malhas/materiais, então mudar só o visual deslocaria a sequência.
    Math.random = mulberry32(seed ^ 0x5bd1e995)
    this.player = {
      eye: new THREE.Vector3(0, 1.6, 60),
      aimDir: new THREE.Vector3(0, 0, -1),
      ads: 0,
      weapon: 'hands',
      swinging: false,
      collider: pc,
    }
  }

  pelvis() {
    return this.npc.position(new THREE.Vector3())
  }

  step() {
    if (this.armed) this.armed.update(DT, { player: this.player })
    else this.brain.update(DT, { player: this.player })
    this.npc.update(DT)
    this.physics.step()
    this.t += DT
    this.sample()
    const st = this.npc.debug.state
    if (st !== 'standing' && !this.fell) {
      this.fell = true
      this.fallT = this.t
    } else if (this.fell && st === 'standing' && this.standT < 0) this.standT = this.t
  }

  run(seconds: number) {
    const n = Math.round(seconds / DT)
    for (let i = 0; i < n; i++) this.step()
  }

  private sample() {
    const rd = this.npc.ragdoll
    let ke = 0
    for (const part of rd.parts.values()) {
      const b = part.body
      const v = b.linvel()
      ke += 0.5 * b.mass() * (v.x * v.x + v.y * v.y + v.z * v.z)
      this.maxBodyV = Math.max(this.maxBodyV, Math.hypot(v.x, v.y, v.z))
    }
    for (const j of rd.joints) {
      const a = rd.parts.get(j.def.parent as PartName)!.body.angvel()
      const b = rd.parts.get(j.def.child as PartName)!.body.angvel()
      this.maxJointW = Math.max(this.maxJointW, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z))
    }
    this.maxKE = Math.max(this.maxKE, ke)
    if (this.npc.state === 'standing' && this.npc.walkVel.length() > 0.5) {
      const fy = Math.min(rd.part('footL').body.translation().y, rd.part('footR').body.translation().y)
      const h = rd.part('pelvis').body.translation().y
      this.gaitN++
      if (fy > 0.09) this.airN++
      this.hSum += h
      this.hSq += h * h
    }
  }

  /** Zera picos e flags (depois do assentamento inicial). */
  resetStats() {
    this.maxJointW = this.maxBodyV = this.maxKE = 0
    this.fell = false
    this.fallT = this.standT = -1
  }

  metrics(ref: THREE.Vector3, extra?: Record<string, number>): Metrics {
    const p = this.pelvis()
    return {
      fell: this.fell,
      getUp: !this.fell ? NaN : this.standT < 0 ? Infinity : this.standT - this.fallT,
      drift: Math.hypot(p.x - ref.x, p.z - ref.z),
      maxJointW: this.maxJointW,
      maxBodyV: this.maxBodyV,
      maxKE: this.maxKE,
      extra,
    }
  }

  dispose() {
    this.brain.dispose()
    this.npc.dispose()
    this.physics.dispose()
  }
}

export interface Scenario {
  group: string
  name: string
  trials: number
  run: (seed: number, trial: number) => Metrics
}

const START = new THREE.Vector3(0, 0, 0)
const SETTLE = 1.5
const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4]
const dirVec = (a: number) => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a))

function newSim(seed: number, kind: 'civilian' | 'armed' = 'civilian') {
  const s = new Sim(seed, kind)
  s.run(SETTLE)
  s.resetStats()
  return s
}

/** Dá até `recover` s para voltar a ficar em pé, mais 2 s de calma depois. */
function finish(s: Sim, recover: number) {
  const end = s.t + recover
  while (s.t < end) {
    s.step()
    if (s.fell && s.standT > 0 && s.t - s.standT > 2) break
  }
}

function push(name: string, impulse: number): Scenario {
  return {
    group: 'push',
    name,
    trials: dirs.length,
    run: (seed, i) => {
      const s = newSim(seed)
      s.npc.push(dirVec(dirs[i]).multiplyScalar(impulse))
      finish(s, 40)
      const m = s.metrics(START)
      s.dispose()
      return m
    },
  }
}

function walkTo(s: Sim, target: THREE.Vector3, run: boolean, maxT: number) {
  s.brain.walkTo(target, run)
  const end = s.t + maxT
  while (s.t < end) {
    s.step()
    const p = s.pelvis()
    if (Math.hypot(p.x - target.x, p.z - target.z) < 0.6 && s.npc.debug.state === 'standing') return s.t
  }
  return -1
}

function fallThenGetUp(side: 'forward' | 'back'): Scenario {
  return {
    group: 'getup',
    name: side === 'forward' ? 'queda de bruços' : 'queda de costas',
    trials: 4,
    run: (seed, i) => {
      const s = newSim(seed)
      // Empurrão forte na direção da queda, variando a cada tentativa.
      const imp = (side === 'forward' ? -1 : 1) * (230 + (i - 1.5) * 30)
      s.npc.push(new THREE.Vector3(0, 0, imp))
      finish(s, 50)
      const m = s.metrics(START)
      s.dispose()
      return m
    },
  }
}

function shot(name: string, part: PartName, impulse: number): Scenario {
  return {
    group: 'shot',
    name,
    trials: 4,
    run: (seed, i) => {
      const s = newSim(seed)
      const body = s.npc.ragdoll.part(part).body
      const d = dirVec(dirs[i]).multiplyScalar(-1).setY(0.02).normalize() // direção do projétil
      const imp = d.clone().multiplyScalar(impulse)
      const t = body.translation()
      const pt = new THREE.Vector3(t.x, t.y, t.z)
      body.applyImpulseAtPoint(imp, pt, true)
      s.npc.hit(body, imp, pt, 'shot')
      s.brain.notice(pt.clone().addScaledVector(d, -5), 0.35)
      finish(s, 40)
      const m = s.metrics(START, { health: s.npc.debug.overall, canStand: s.npc.damage.canStand ? 1 : 0 })
      s.dispose()
      return m
    },
  }
}

/** Agachado parado: mede a altura da cabeça e do peito (calibra COVER_BODY). */
function crouchStill(c: number): Scenario {
  return {
    group: 'cover',
    name: `agachar ${c} parado`,
    trials: 2,
    run: (seed) => {
      const s = newSim(seed)
      s.brain.enabled = false
      let hy = 0
      let cy = 0
      let n = 0
      const end = s.t + 6
      while (s.t < end) {
        s.npc.crouch = c
        s.npc.update(DT)
        s.physics.step()
        s.t += DT
        if (end - s.t < 2) {
          hy += s.npc.ragdoll.part('head').body.translation().y + 0.11
          cy += s.npc.ragdoll.part('chest').body.translation().y + 0.14
          n++
        }
      }
      const m = s.metrics(START, { headTop: hy / n, chestTop: cy / n })
      s.dispose()
      return m
    },
  }
}

/**
 * Ameaçado (jogador mirando de longe) com uma cobertura à frente e uma
 * caixa solta no caminho: vai para trás dela sem subir na caixa e se
 * esconde (agacha se for baixa).
 */
function coverRun(name: string, tall: boolean): Scenario {
  return {
    group: 'cover',
    name,
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed)
      const w = s.physics.world
      // Parede alta fica de lado (ele precisa ser visto para se assustar).
      const wallH = tall ? 2.6 : 1.1
      const wx = tall ? 3 + i * 0.5 : (i - 1) * 1.5
      w.createCollider(RAPIER.ColliderDesc.cuboid(1, wallH / 2, 0.15).setTranslation(wx, wallH / 2, -5))
      const crate = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(wx * 0.5, 0.3, -2.5))
      w.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3).setDensity(300).setFriction(0.7), crate)
      s.run(0.5)
      const eye = new THREE.Vector3(wx * 0.3, 1.6, -15)
      s.player.eye.copy(eye)
      s.player.weapon = 'gun'
      let maxFootY = 0
      let hiddenT = 0
      let arrive = -1
      let crateMoved = 0
      const t0 = s.t
      const end = s.t + 14
      while (s.t < end) {
        const c = s.npc.ragdoll.part('chest').body.translation()
        s.player.aimDir.set(c.x - eye.x, c.y - eye.y, c.z - eye.z).normalize()
        s.step()
        for (const f of ['footL', 'footR'] as PartName[]) maxFootY = Math.max(maxFootY, s.npc.ragdoll.part(f).body.translation().y)
        const h = s.npc.ragdoll.part('head').body.translation()
        const hidden = !s.brain.clearLine(eye, new THREE.Vector3(h.x, h.y, h.z), s.player.collider)
        if (s.brain.debug.cover && arrive < 0) arrive = s.t - t0
        if (hidden) hiddenT += DT
        const cp = crate.translation()
        crateMoved = Math.max(crateMoved, Math.hypot(cp.x - wx * 0.5, cp.z + 2.5))
      }
      const m = s.metrics(new THREE.Vector3(wx, 0, -4.5), {
        arriveS: arrive < 0 ? Infinity : arrive,
        hiddenS: hiddenT,
        footMax: maxFootY,
        crateMoved,
        crouch: s.npc.crouch,
      })
      s.dispose()
      return m
    },
  }
}

/**
 * NPC armado contra o jogador parado a ~9 m. Mede: tiros, quantos com o
 * corpo andando (> 0,3 m/s), erro do cano no disparo (graus), tremor da mão
 * mirando (rad/s), se ainda segura a arma no fim. Com `push`, leva um
 * empurrão que derruba no meio e precisa levantar ainda com a arma.
 */
function armedFight(name: string, push: number): Scenario {
  return {
    group: 'armed',
    name,
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed, 'armed')
      const a = s.armed!
      const w = a.weapon
      const eye = new THREE.Vector3((i - 1) * 2, 1.6, -9)
      s.player.eye.copy(eye)
      s.player.weapon = 'gun'
      let shots = 0
      let moving = 0
      let errSum = 0
      w.onShot = (shot) => {
        shots++
        if (Math.hypot(s.npc.velocity.x, s.npc.velocity.z) > 0.3) moving++
        const want = eye.clone().setY(eye.y - 0.35).sub(shot.origin).normalize()
        errSum += THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(w.barrel.dot(want), -1, 1)))
      }
      let wobble = 0
      let wobbleN = 0
      let pushed = false
      const end = s.t + 16
      while (s.t < end) {
        const c = s.npc.ragdoll.part('chest').body.translation()
        s.player.aimDir.set(c.x - eye.x, c.y - eye.y, c.z - eye.z).normalize()
        if (push && !pushed && s.t > 5) {
          pushed = true
          s.npc.push(new THREE.Vector3(0, 0, push))
        }
        s.step()
        if (a.combat.state === 'engage' && s.npc.state === 'standing' && Math.hypot(s.npc.velocity.x, s.npc.velocity.z) < 0.3) {
          const hw = s.npc.ragdoll.part('handR').body.angvel()
          const cw = s.npc.ragdoll.part('chest').body.angvel()
          wobble += Math.hypot(hw.x - cw.x, hw.y - cw.y, hw.z - cw.z)
          wobbleN++
        }
      }
      const m = s.metrics(START, {
        shots,
        movingShots: moving,
        aimErrDeg: shots ? errSum / shots : NaN,
        handWobble: wobbleN ? wobble / wobbleN : NaN,
        held: w.held ? 1 : 0,
      })
      s.dispose()
      return m
    },
  }
}

export const SCENARIOS: Scenario[] = [
  {
    group: 'stand',
    name: 'em pe 10 s',
    trials: 3,
    run: (seed) => {
      const s = newSim(seed)
      s.run(10)
      const m = s.metrics(START)
      s.dispose()
      return m
    },
  },
  push('empurrao leve (40)', 40),
  push('empurrao medio (110)', 110),
  push('empurrao forte (220)', 220),
  {
    group: 'walk',
    name: 'andar 10 m',
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed)
      const a = (i - 1) * 0.35
      const target = new THREE.Vector3(Math.sin(a) * 10, 0, -Math.cos(a) * 10)
      const t0 = s.t
      const arr = walkTo(s, target, false, 30)
      s.run(1)
      const m = s.metrics(target, { arriveS: arr < 0 ? Infinity : arr - t0, ...s.gaitStats() })
      s.dispose()
      return m
    },
  },
  {
    group: 'walk',
    name: 'contornar esquina',
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed)
      // Parede em L: ele precisa dobrar a esquina rente a ela.
      const w = s.physics.world
      w.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 1.3, 2).setTranslation(0.8, 1.3, -4))
      w.createCollider(RAPIER.ColliderDesc.cuboid(2, 1.3, 0.15).setTranslation(2.65, 1.3, -6.15))
      s.run(0.3)
      const target = new THREE.Vector3(3 + i * 0.5, 0, -4.5)
      let grips = 0
      let was = ''
      const t0 = s.t
      s.brain.walkTo(target, i === 2)
      let arr = -1
      while (s.t < t0 + 20) {
        s.step()
        const g = s.npc.debug.grip
        if (g && !was) grips++
        was = g
        const p = s.pelvis()
        if (arr < 0 && Math.hypot(p.x - target.x, p.z - target.z) < 0.6) arr = s.t - t0
      }
      const m = s.metrics(target, { grips, arriveS: arr < 0 ? Infinity : arr })
      s.dispose()
      return m
    },
  },
  {
    group: 'run',
    name: 'correr em zigue-zague',
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed)
      const w = 3 + i
      const pts = [
        [w, -5],
        [-w, -10],
        [w, -15],
        [-w, -20],
        [0, -25],
      ].map(([x, z]) => new THREE.Vector3(x, 0, z))
      const t0 = s.t
      let ok = 1
      for (const p of pts) if (walkTo(s, p, true, 12) < 0) ok = 0
      s.run(1)
      const m = s.metrics(pts[pts.length - 1], { reached: ok, totalS: s.t - t0, ...s.gaitStats() })
      s.dispose()
      return m
    },
  },
  fallThenGetUp('forward'),
  fallThenGetUp('back'),
  {
    group: 'crawl',
    name: 'pernas feridas: rastejar 20 s',
    trials: 3,
    run: (seed, i) => {
      const s = newSim(seed)
      for (const p of ['thighL', 'shinL', 'thighR', 'shinR', 'footL', 'footR'] as PartName[]) s.npc.damage.health.set(p, i === 2 ? 40 : 15)
      // Espera cair e começar a rastejar.
      let t = 0
      while (s.npc.debug.state !== 'crawling' && t < 15) {
        s.step()
        t += DT
      }
      const p0 = s.pelvis()
      const t0 = s.t
      s.run(20)
      const p1 = s.pelvis()
      const m = s.metrics(p0, { startS: t, speedCmS: (100 * Math.hypot(p1.x - p0.x, p1.z - p0.z)) / (s.t - t0), crawling: s.npc.debug.state === 'crawling' ? 1 : 0 })
      s.dispose()
      return m
    },
  },
  crouchStill(0.5),
  crouchStill(1),
  coverRun('mureta, caixa no caminho', false),
  coverRun('parede alta', true),
  armedFight('tiroteio parado', 0),
  armedFight('empurrado no tiroteio', 140),
  shot('tiro na perna (pistola)', 'thighR', 12),
  shot('tiro na perna (rifle)', 'shinR', 16),
  shot('tiro na cabeca (pistola)', 'head', 12),
  shot('tiro na cabeca (rifle)', 'head', 16),
]

export async function runAll(filter?: string) {
  await initPhysics()
  const out: { sc: Scenario; ms: Metrics[] }[] = []
  for (const sc of SCENARIOS) {
    if (filter && !(sc.group + ' ' + sc.name).toLowerCase().includes(filter.toLowerCase())) continue
    const ms: Metrics[] = []
    for (let i = 0; i < sc.trials; i++) ms.push(sc.run(1000 + i * 7919 + sc.name.length, i))
    out.push({ sc, ms })
  }
  return out
}
