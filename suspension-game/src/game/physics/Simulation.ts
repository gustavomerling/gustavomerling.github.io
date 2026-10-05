// Monta o mundo físico a partir do projeto do carro + terreno e avança no tempo.
// Não sabe nada de React: recebe input, devolve um snapshot com poses e eventos.
//
// Suspensão = junta PRISMÁTICA (trilho com fim de curso, sem girar) + mola/amortecedor
// calculados aqui (F = pré-carga - k·x - c·v). Isso permite girar a suspensão,
// limitar o curso e pendurar qualquer coisa no cubo (inclusive eixos com mais molas).

import { Body, Box, Chain, Circle, DistanceJoint, Polygon, PrismaticJoint, RevoluteJoint, World, type Contact, type Fixture } from 'planck'
import { AXLES_BY_ID } from '../catalog/axles'
import { BLOCKS_BY_ID, wedgeVertices } from '../catalog/blocks'
import { FLAGS_BY_ID, type FlagDef } from '../catalog/flags'
import { HEAD_RADIUS, getChassis, type CargoSpec, type ChassisDef } from '../catalog/chassis'
import { SUSPENSIONS_BY_ID, type SuspensionDef } from '../catalog/suspensions'
import { WHEELS_BY_ID, type WheelDef } from '../catalog/wheels'
import { buildOrder, descendantsOf, lowestPoint, resolveAttachments, suspensionAxis, suspensionTop, type Attachment } from '../car'
import { add, rad, rotate, sub, wrapAngle } from '../geometry'
import { MATERIALS, type MaterialId } from '../terrain/materials'
import { groundY, type PropSpec, type Terrain } from '../terrain/generate'
import type { CarDesign, CarPoses, FlagState, Part, Pose, Vec } from '../types'

export interface DriveInput {
  throttle: -1 | 0 | 1 // acelera / ré
  tilt: -1 | 0 | 1 // -1 = empina (gira anti-horário), +1 = abaixa a frente
  brake: boolean
  nitro: boolean
}

export interface SimOptions {
  /** Capacete no chão = fim da corrida. */
  fragile: boolean
  /** Combustível acaba (pegue galões). */
  fuel: boolean
}

export const DEFAULT_OPTIONS: SimOptions = { fragile: true, fuel: true }

export interface PropState {
  spec: PropSpec
  poses: Pose[]
}

export type EndReason = 'finish' | 'crash' | 'fuel'

export type SimEventType = 'star' | 'fuel' | 'flip' | 'air' | 'checkpoint' | 'crash' | 'boost' | 'jump' | 'nofuel' | 'finish'

export interface SimEvent {
  type: SimEventType
  x: number
  y: number
  text?: string
  points?: number
}

/** Ponto onde uma roda está raspando no chão (para poeira/lama). */
export interface DustPoint {
  x: number
  y: number
  material: MaterialId
  intensity: number // 0..1
}

export interface SimSnapshot {
  car: CarPoses
  props: PropState[]
  stars: boolean[] // true = coletada
  fuelCans: boolean[] // true = pego
  speed: number // m/s (horizontal)
  time: number // s desde a largada
  finishTime: number | null
  ended: EndReason | null
  cargoKept: number
  cargoTotal: number
  nitro: number // 0..1
  fuel: number // 0..1
  score: number
  maxX: number
  checkpoint: number // índice do último checkpoint alcançado
  respawns: number
  flips: number
  airborne: boolean
  flipped: boolean
  wheelSpin: number // rad/s médio das rodas com tração (para o som)
  dust: DustPoint[]
}

/** Todas as peças do carro ficam no mesmo grupo negativo = não colidem entre si. */
const CAR = { filterGroupIndex: -1 }
const GRAVITY = 10
const TILT_TORQUE = 6 // por kg de chassi
const AXLE_LIMIT = rad(80)
/** Ajuste global de força dos motores (arcade: acelera sem empinar à toa). */
const TORQUE_SCALE = 0.55
export const SIM_DT = 1 / 120
export const POINTS = { star: 50, flip: 150, perMeter: 1, airPerSecond: 40 }

/** Mola linear sobre uma junta prismática: F = pré-carga - k·x - c·v ao longo do eixo. */
interface SpringCore {
  joint: PrismaticJoint
  parent: Body
  hub: Body // corpo que desliza no trilho
  axisLocal: Vec // no referencial do pai
  k: number
  c: number
  preload: number
}

interface Spring extends SpringCore {
  def: SuspensionDef
  topLocal: Vec
}

function applySpring(s: SpringCore) {
  const x = s.joint.getJointTranslation()
  const v = s.joint.getJointSpeed()
  const f = s.preload - s.k * x - s.c * v
  const axis = s.parent.getWorldVector(s.axisLocal)
  const point = s.hub.getWorldCenter()
  s.hub.applyForce({ x: axis.x * f, y: axis.y * f }, point, true)
  s.parent.applyForce({ x: -axis.x * f, y: -axis.y * f }, point, true)
}

/** Bandeira: só visual. Mola angular movida pela aceleração/vento do ponto de fixação. */
interface FlagRig {
  id: string
  def: FlagDef
  parent: Body
  local: Vec // base, no referencial do pai
  localAngle: number
  state: FlagState
  bendVel: number
  prevVel: Vec | null
  acc: Vec
}

interface Motor {
  joint: RevoluteJoint
  def: WheelDef
  driven: boolean
  body: Body
  /** Corpos que tocam o chão (roda normal = ela mesma; gosma = bolinhas do anel). */
  contacts: Body[]
  contactRadius: number
}

const poseOf = (b: Body): Pose => {
  const p = b.getPosition()
  return { x: p.x, y: p.y, angle: b.getAngle() }
}

/** Primeiro contato ativo do corpo com algo fora do carro. */
function touching(body: Body): Fixture | null {
  for (let ce = body.getContactList(); ce; ce = ce.next) {
    const c = ce.contact
    if (!c.isTouching()) continue
    const other = c.getFixtureA().getBody() === body ? c.getFixtureB() : c.getFixtureA()
    if (other.getFilterGroupIndex() !== -1) return other
  }
  return null
}

export class Simulation {
  readonly world: World
  readonly chassis: Body
  readonly chassisDef: ChassisDef
  private ground!: Body
  private head!: Fixture
  private bodies = new Map<string, Body>() // cubos de mola, eixos e rodas (por id da peça)
  private carBodies: Body[] = []
  private springs = new Map<string, Spring>()
  private motors: Motor[] = []
  private goo = new Map<string, { segments: Body[]; segRadius: number; radials: SpringCore[]; travel: number; def: WheelDef }>()
  private cargo: { spec: CargoSpec; body: Body; lost: boolean }[] = []
  private props: { spec: PropSpec; bodies: Body[] }[] = []
  /** Corpos do cenário que matam o piloto se o capacete encostar. */
  private hardBodies = new Set<Body>()
  private stars: { pos: Vec; taken: boolean }[]
  private fuelCans: { pos: Vec; taken: boolean }[]
  private events: SimEvent[] = []
  private time = 0
  private finishTime: number | null = null
  private ended: EndReason | null = null
  private nitro = 1
  private fuel = 1
  private noFuelTime = 0
  private flipTime = 0
  private maxX = 0
  private trickPoints = 0
  private flips = 0
  private checkpoint = 0
  private respawns = 0
  private airTime = 0
  private airRotation = 0
  private lastAngle = 0
  private airborne = false
  private padCooldown = 0
  private flags: FlagRig[] = []
  private input: DriveInput = { throttle: 0, tilt: 0, brake: false, nitro: false }

  constructor(
    readonly design: CarDesign,
    readonly terrain: Terrain,
    readonly options: SimOptions = DEFAULT_OPTIONS,
  ) {
    this.world = new World({ gravity: { x: 0, y: GRAVITY } })
    this.buildTerrain(terrain)
    this.stars = terrain.stars.map((pos) => ({ pos, taken: false }))
    this.fuelCans = terrain.fuel.map((pos) => ({ pos, taken: false }))

    const spawn = { x: 0, y: -lowestPoint(design) - 0.3 }
    const at = (v: Vec) => add(spawn, v)

    // --- chassi + blocos (um corpo rígido só)
    this.chassisDef = getChassis(design)
    this.chassis = this.world.createBody({ type: 'dynamic', position: spawn })
    for (const poly of this.chassisDef.polygons) {
      this.chassis.createFixture(new Polygon(poly), { density: this.chassisDef.density, friction: 0.6, ...CAR })
    }
    this.head = this.chassis.createFixture(new Circle(this.chassisDef.head, HEAD_RADIUS), { density: 0.5, friction: 0.5, ...CAR })
    for (const p of design.parts.filter((p) => p.kind === 'block')) this.buildBlock(p)
    this.carBodies.push(this.chassis)
    this.lastAngle = this.chassis.getAngle()

    // --- árvore de peças: pais antes dos filhos
    const att = resolveAttachments(design)
    const parentBody = (a: Attachment) => (a.kind === 'chassis' ? this.chassis : this.bodies.get(a.id)!)

    for (const p of buildOrder(design, att)) {
      if (p.kind === 'block') continue
      const parent = parentBody(att[p.id])
      if (p.kind === 'suspension') this.buildSuspension(p, parent, at)
      else if (p.kind === 'axle') this.buildAxle(p, parent, at)
      else if (p.kind === 'wheel') this.buildWheel(p, parent, at)
      else if (p.kind === 'flag') this.buildFlag(p, parent, at)
    }

    // --- carga
    for (const spec of this.chassisDef.cargo ?? []) {
      const body = this.world.createBody({ type: 'dynamic', position: at(spec) })
      if (spec.kind === 'crate') body.createFixture(new Box(spec.size / 2, spec.size / 2), { density: 0.6, friction: 0.6 })
      else if (spec.kind === 'barrel') body.createFixture(new Box(spec.size * 0.75, spec.size), { density: 0.8, friction: 0.5 })
      else body.createFixture(new Circle(spec.size), { density: 0.5, friction: 0.4, restitution: 0.6 })
      this.cargo.push({ spec, body, lost: false })
    }

    this.tuneSprings(att)

    // capacete no chão = batida
    this.world.on('begin-contact', (c: Contact) => {
      if (!this.options.fragile || this.ended) return
      const a = c.getFixtureA()
      const b = c.getFixtureB()
      const other = a === this.head ? b : b === this.head ? a : null
      if (other && this.hardBodies.has(other.getBody())) this.end('crash')
    })
  }

  // ------------------------------------------------------------ montagem

  private buildBlock(p: Part) {
    const b = BLOCKS_BY_ID[p.typeId]
    const angle = p.angle ?? 0
    const opt = { density: b.density, friction: b.friction ?? 0.6, restitution: b.restitution ?? 0, ...CAR }
    if (b.shape === 'circle') this.chassis.createFixture(new Circle({ x: p.x, y: p.y }, b.w / 2), opt)
    else if (b.shape === 'wedge') this.chassis.createFixture(new Polygon(wedgeVertices(b).map((v) => add(p, rotate(v, angle)))), opt)
    else this.chassis.createFixture(new Box(b.w / 2, b.h / 2, { x: p.x, y: p.y }, angle), opt)
  }

  private buildSuspension(p: Part, parent: Body, at: (v: Vec) => Vec) {
    const def = SUSPENSIONS_BY_ID[p.typeId]
    const hub = this.world.createBody({ type: 'dynamic', position: at(p) })
    hub.createFixture(new Circle(0.05), { density: 32, ...CAR }) // ~250 g: cubo leve demais quebra o solver
    const axis = suspensionAxis(p)
    const joint = this.world.createJoint(
      new PrismaticJoint(
        {
          enableLimit: true,
          lowerTranslation: -def.compression * def.length,
          upperTranslation: def.extension * def.length,
        },
        parent,
        hub,
        at(p),
        axis,
      ),
    ) as PrismaticJoint
    this.bodies.set(p.id, hub)
    this.carBodies.push(hub)
    this.springs.set(p.id, {
      def,
      joint,
      parent,
      hub,
      axisLocal: parent.getLocalVector(axis),
      topLocal: parent.getLocalPoint(at(suspensionTop(p))),
      k: 0,
      c: 0,
      preload: 0,
    })
  }

  private buildAxle(p: Part, parent: Body, at: (v: Vec) => Vec) {
    const a = AXLES_BY_ID[p.typeId]
    const body = this.world.createBody({ type: 'dynamic', position: at(p), angle: p.angle ?? 0, angularDamping: 0.5 })
    body.createFixture(new Box(a.length / 2, a.thickness / 2), { density: a.density, friction: 0.6, ...CAR })
    // balancim limitado a ±80° para não dar a volta
    this.world.createJoint(
      new RevoluteJoint({ enableLimit: true, lowerAngle: -AXLE_LIMIT, upperAngle: AXLE_LIMIT }, parent, body, at(p)),
    )
    this.bodies.set(p.id, body)
    this.carBodies.push(body)
  }

  private buildWheel(p: Part, parent: Body, at: (v: Vec) => Vec) {
    const def = WHEELS_BY_ID[p.typeId]
    const body = def.soft ? this.buildGooWheel(p, def, at(p)) : this.world.createBody({ type: 'dynamic', position: at(p) })
    if (!def.soft) {
      body.createFixture(new Circle(def.radius), {
        density: def.density,
        friction: def.friction,
        restitution: def.restitution,
        ...CAR,
      })
    }
    const joint = this.world.createJoint(
      new RevoluteJoint({ enableMotor: true, maxMotorTorque: 0 }, parent, body, at(p)),
    ) as RevoluteJoint
    this.bodies.set(p.id, body)
    this.carBodies.push(body)
    const g = this.goo.get(p.id)
    this.motors.push({
      joint,
      def,
      driven: p.driven !== false,
      body,
      contacts: g ? g.segments : [body],
      contactRadius: g ? g.segRadius : def.radius,
    })
  }

  private buildFlag(p: Part, parent: Body, at: (v: Vec) => Vec) {
    this.flags.push({
      id: p.id,
      def: FLAGS_BY_ID[p.typeId],
      parent,
      local: parent.getLocalPoint(at(p)),
      localAngle: (p.angle ?? 0) - parent.getAngle(),
      state: { bend: 0, phase: Math.random() * 6, flutter: 0.1, trail: -1 },
      bendVel: 0,
      prevVel: null,
      acc: { x: 0, y: 0 },
    })
  }

  /**
   * Haste = oscilador amortecido. O "alvo" da envergadura vem da força que a ponta sente
   * no referencial do carro (gravidade - aceleração da base) e do vento (velocidade).
   */
  private updateFlags(dt: number) {
    for (const f of this.flags) {
      const base = f.parent.getWorldPoint(f.local)
      const v = f.parent.getLinearVelocityFromWorldPoint(base)
      if (f.prevVel) {
        const k = Math.min(1, dt * 25) // suaviza o ruído da derivada
        f.acc = { x: f.acc.x + ((v.x - f.prevVel.x) / dt - f.acc.x) * k, y: f.acc.y + ((v.y - f.prevVel.y) / dt - f.acc.y) * k }
      }
      f.prevVel = { x: v.x, y: v.y }
      const angle = f.parent.getAngle() + f.localAngle
      const n = rotate({ x: 1, y: 0 }, angle) // perpendicular à haste
      const felt = (GRAVITY - f.acc.y) * n.y + -f.acc.x * n.x // força inercial na direção n
      const wind = -(v.x * n.x + v.y * n.y) // ar empurra contra o movimento
      const soft = 1 / (f.def.frequencyHz * f.def.frequencyHz) // haste mole enverga mais
      const target = Math.max(-1.2, Math.min(1.2, (felt * 0.05 + wind * 0.035) * soft))
      const w = 2 * Math.PI * f.def.frequencyHz
      const st = f.state
      f.bendVel += (-(w * w) * (st.bend - target) - 2 * f.def.dampingRatio * w * f.bendVel) * dt
      st.bend = Math.max(-1.4, Math.min(1.4, st.bend + f.bendVel * dt))
      // pano: tremula mais rápido com velocidade e aponta para trás do movimento
      const speed = Math.hypot(v.x, v.y)
      st.phase += dt * (3 + speed * 1.6)
      st.flutter += (Math.min(1, 0.12 + speed / 10) - st.flutter) * Math.min(1, dt * 3)
      const along = v.x * n.x + v.y * n.y
      const trailTarget = along > 0.8 ? -1 : along < -0.8 ? 1 : st.trail >= 0 ? 1 : -1
      st.trail += (trailTarget - st.trail) * Math.min(1, dt * 4)
    }
  }

  /**
   * Pneu gosma (estilo Gish): cubo rígido + anel de bolinhas. Cada bolinha corre num
   * trilho radial (prismática) com mola -> o anel gira junto com o cubo, mas amassa.
   */
  private buildGooWheel(p: Part, def: WheelDef, center: Vec): Body {
    const soft = def.soft!
    const n = soft.segments
    const hubR = def.radius * soft.hubRatio
    const segR = def.radius * Math.sin(Math.PI / n) * 1.15
    const ringR = def.radius - segR
    const hub = this.world.createBody({ type: 'dynamic', position: center })
    hub.createFixture(new Circle(hubR), { density: def.density * 2, friction: def.friction, ...CAR })

    const segments: Body[] = []
    const radials: SpringCore[] = []
    for (let i = 0; i < n; i++) {
      const dir = rotate({ x: 1, y: 0 }, (i / n) * Math.PI * 2)
      const pos = add(center, { x: dir.x * ringR, y: dir.y * ringR })
      const seg = this.world.createBody({ type: 'dynamic', position: pos })
      seg.createFixture(new Circle(segR), { density: def.density * 2, friction: def.friction, ...CAR })
      const joint = this.world.createJoint(
        new PrismaticJoint(
          { enableLimit: true, lowerTranslation: -(ringR - hubR - segR * 0.3), upperTranslation: 0.03 },
          hub,
          seg,
          pos,
          dir,
        ),
      ) as PrismaticJoint
      radials.push({ joint, parent: hub, hub: seg, axisLocal: dir, k: 0, c: 0, preload: 0 })
      segments.push(seg)
      this.carBodies.push(seg)
    }
    // vizinhos ligados por molinhas: o contorno fica liso em vez de "dentado"
    for (let i = 0; i < n; i++) {
      const a = segments[i]
      const b = segments[(i + 1) % n]
      this.world.createJoint(new DistanceJoint({ frequencyHz: 8, dampingRatio: 0.5 }, a, b, a.getPosition(), b.getPosition()))
    }
    this.goo.set(p.id, { segments, segRadius: segR, radials, travel: ringR - hubR, def })
    return hub
  }

  /** Calcula k e c de cada mola a partir da massa que ela sustenta. */
  private tuneSprings(att: Record<string, Attachment>) {
    const carMass = this.carBodies.reduce((s, b) => s + b.getMass(), 0)
    const wheels = this.design.parts.filter((p) => p.kind === 'wheel')
    const totalWheels = Math.max(1, wheels.length)
    for (const [id, s] of this.springs) {
      const below = descendantsOf(this.design, id, att)
      const wheelsBelow = below.filter((p) => p.kind === 'wheel').length
      const share = wheels.length ? Math.max(wheelsBelow, 0.5) / totalWheels : 1 / this.springs.size
      const mEff = carMass * share
      // massa "não suspensa" pendurada nesta mola (cubo + tudo abaixo)
      let mHub = s.hub.getMass()
      for (const p of below) {
        mHub += this.bodies.get(p.id)?.getMass() ?? 0
        for (const seg of this.goo.get(p.id)?.segments ?? []) mHub += seg.getMass()
      }
      const w = 2 * Math.PI * s.def.frequencyHz
      // limites de estabilidade da integração explícita (massa reduzida cubo × pai)
      const mParent = s.parent.getMass()
      const mu = (mHub * mParent) / (mHub + mParent)
      s.k = Math.min(mEff * w * w, mu * (0.7 / SIM_DT) ** 2)
      s.c = Math.min(2 * s.def.dampingRatio * mEff * w, (mu * 0.6) / SIM_DT)
      const axisWorld = s.parent.getWorldVector(s.axisLocal)
      s.preload = mEff * GRAVITY * Math.max(0, axisWorld.y)
    }
    // anel da gosma: rigidez tal que o peso amasse ~30% do curso (com ~3 bolinhas no chão)
    for (const g of this.goo.values()) {
      const load = (carMass / totalWheels) * GRAVITY
      const stiffness = (g.def.soft!.frequencyHz / 6) ** 2
      for (const r of g.radials) {
        const mSeg = r.hub.getMass()
        const mu = (mSeg * r.parent.getMass()) / (mSeg + r.parent.getMass())
        r.k = Math.min(((load / 3) / (0.3 * g.travel)) * stiffness, mu * (0.7 / SIM_DT) ** 2)
        r.c = Math.min(2 * g.def.soft!.dampingRatio * Math.sqrt(r.k * mSeg), (mu * 0.6) / SIM_DT)
      }
    }
  }

  private buildTerrain(terrain: Terrain) {
    this.ground = this.world.createBody({ type: 'static' })
    this.hardBodies.add(this.ground)
    for (const seg of terrain.segments) {
      const f = this.ground.createFixture(new Chain(seg.points, false), { friction: MATERIALS[seg.material].friction })
      f.setUserData(seg.material)
    }
    for (const spec of terrain.props) {
      const bodies: Body[] = []
      if (spec.kind === 'rock') {
        const b = this.world.createBody({ type: 'static', position: spec })
        b.createFixture(new Polygon(spec.vertices), { friction: 0.8, userData: 'rock' })
        this.hardBodies.add(b)
        bodies.push(b)
      } else if (spec.kind === 'crate') {
        const b = this.world.createBody({ type: 'dynamic', position: spec })
        b.createFixture(new Box(spec.size / 2, spec.size / 2), { density: 0.5, friction: 0.7, userData: 'wood' })
        bodies.push(b)
      } else if (spec.kind === 'log') {
        const b = this.world.createBody({ type: 'dynamic', position: spec })
        b.createFixture(new Circle(spec.radius), { density: 0.6, friction: 0.9, userData: 'wood' })
        bodies.push(b)
      } else if (spec.kind === 'seesaw') {
        const pivot = this.world.createBody({ type: 'static', position: spec })
        pivot.createFixture(new Polygon([{ x: -0.35, y: 0 }, { x: 0.35, y: 0 }, { x: 0, y: -spec.height }]), { friction: 0.8 })
        const top = { x: spec.x, y: spec.y - spec.height }
        const plank = this.world.createBody({ type: 'dynamic', position: { x: top.x, y: top.y - 0.08 }, angle: -0.25 })
        plank.createFixture(new Box(spec.length / 2, 0.08), { density: 1, friction: 0.9, userData: 'wood' })
        this.world.createJoint(new RevoluteJoint({}, pivot, plank, top))
        this.hardBodies.add(pivot).add(plank)
        bodies.push(plank)
      } else if (spec.kind === 'bridge') {
        const w = spec.length / spec.planks
        let prev = this.ground
        for (let i = 0; i < spec.planks; i++) {
          const plank = this.world.createBody({ type: 'dynamic', position: { x: spec.x + (i + 0.5) * w, y: spec.y + 0.07 } })
          plank.createFixture(new Box(w * 0.48, 0.07), { density: 1.2, friction: 0.9, userData: 'wood' })
          this.world.createJoint(new RevoluteJoint({}, prev, plank, { x: spec.x + i * w, y: spec.y + 0.07 }))
          this.hardBodies.add(plank)
          prev = plank
          bodies.push(plank)
        }
        this.world.createJoint(new RevoluteJoint({}, prev, this.ground, { x: spec.x + spec.length, y: spec.y + 0.07 }))
      } else if (spec.kind === 'trampoline') {
        const b = this.world.createBody({ type: 'static', position: { x: spec.x + spec.width / 2, y: spec.y - 0.12 } })
        b.createFixture(new Box(spec.width / 2, 0.12), { friction: 0.9, userData: 'rock' })
        this.hardBodies.add(b)
        bodies.push(b)
      }
      this.props.push({ spec, bodies })
    }
  }

  // ------------------------------------------------------------ simulação

  setInput(input: DriveInput) {
    this.input = input
  }

  /** Eventos acontecidos desde a última chamada (estrela, mortal, batida...). */
  drainEvents(): SimEvent[] {
    const e = this.events
    this.events = []
    return e
  }

  private emit(type: SimEventType, extra: Partial<SimEvent> = {}) {
    const p = this.chassis.getPosition()
    this.events.push({ type, x: p.x, y: p.y, ...extra })
  }

  private end(reason: EndReason) {
    if (this.ended) return
    this.ended = reason
    if (reason === 'finish') this.finishTime = this.time
    this.emit(reason === 'fuel' ? 'nofuel' : reason)
  }

  step(dt = SIM_DT) {
    const input = this.ended ? { throttle: 0, tilt: 0, brake: this.ended === 'finish', nitro: false } : this.input
    const hasFuel = !this.options.fuel || this.fuel > 0
    const boosting = input.nitro && this.nitro > 0 && input.throttle !== 0 && hasFuel
    this.nitro = boosting ? Math.max(0, this.nitro - dt * 0.35) : Math.min(1, this.nitro + dt * 0.06)
    const boost = boosting ? 1.6 : 1
    if (this.options.fuel && !this.ended) {
      this.fuel = Math.max(0, this.fuel - dt * (0.006 + 0.022 * Math.abs(input.throttle) + (boosting ? 0.03 : 0)))
    }

    // molas
    for (const s of this.springs.values()) applySpring(s)
    for (const g of this.goo.values()) g.radials.forEach(applySpring)

    // motores
    for (const { joint, def, driven } of this.motors) {
      if (input.brake) {
        joint.setMotorSpeed(0)
        joint.setMaxMotorTorque(def.maxTorque * 2)
      } else if (driven && input.throttle !== 0 && hasFuel) {
        joint.setMotorSpeed(input.throttle * def.speed * boost)
        joint.setMaxMotorTorque(def.maxTorque * TORQUE_SCALE * boost)
      } else {
        joint.setMotorSpeed(0)
        joint.setMaxMotorTorque(def.maxTorque * 0.02) // resistência ao rolamento
      }
    }
    if (boosting) {
      const fwd = this.chassis.getWorldVector({ x: input.throttle, y: 0 })
      const m = this.chassis.getMass() * 6
      this.chassis.applyForceToCenter({ x: fwd.x * m, y: fwd.y * m }, true)
    }
    if (input.tilt !== 0) this.chassis.applyTorque(input.tilt * TILT_TORQUE * this.chassis.getMass(), true)
    this.applyPads(dt)

    this.world.step(dt, 20, 8) // muitas iterações: cadeias de juntas (molas aninhadas)
    this.updateFlags(dt)

    // regras de jogo
    const pos = this.chassis.getPosition()
    if (!this.ended) {
      this.time += dt
      this.maxX = Math.max(this.maxX, Math.min(pos.x, this.terrain.finishX))
      if (pos.x >= this.terrain.finishX) this.end('finish')
    }
    this.collectPickups()
    this.checkCheckpoints()
    this.checkCargo()
    this.trackTricks(dt)
    const upside = Math.abs(wrapAngle(this.chassis.getAngle())) > rad(110)
    const slow = this.chassis.getLinearVelocity().length() < 1.5
    this.flipTime = upside && slow ? this.flipTime + dt : 0
    if (this.options.fuel && this.fuel <= 0 && !this.ended) {
      this.noFuelTime = Math.abs(this.chassis.getLinearVelocity().x) < 0.4 ? this.noFuelTime + dt : 0
      if (this.noFuelTime > 2) this.end('fuel')
    }
  }

  /** Faixas de impulso e trampolins: testam a posição das rodas. */
  private applyPads(dt: number) {
    this.padCooldown = Math.max(0, this.padCooldown - dt)
    for (const { spec } of this.props) {
      if (spec.kind !== 'boost' && spec.kind !== 'trampoline') continue
      const len = spec.kind === 'boost' ? spec.length : spec.width
      const top = spec.kind === 'boost' ? spec.y : spec.y - 0.24
      const onPad = this.motors.some((m) => {
        const p = m.body.getPosition()
        return p.x >= spec.x && p.x <= spec.x + len && p.y + m.def.radius > top - 0.2 && p.y < top
      })
      if (!onPad) continue
      if (spec.kind === 'boost') {
        const m = this.chassis.getMass() * 30
        this.chassis.applyForceToCenter({ x: m, y: 0 }, true)
        if (this.padCooldown === 0) {
          this.emit('boost', { text: 'Turbo!' })
          this.padCooldown = 1
        }
      } else if (this.padCooldown === 0) {
        for (const b of this.allCarBodies()) {
          const v = b.getLinearVelocity()
          b.setLinearVelocity({ x: v.x, y: Math.min(v.y, -10) })
        }
        this.emit('jump', { text: 'Boing!' })
        this.padCooldown = 0.6
      }
    }
  }

  private allCarBodies() {
    return [...this.carBodies, ...this.cargo.filter((k) => !k.lost).map((k) => k.body)]
  }

  private collectPickups() {
    if (this.ended) return
    const probes = this.carBodies
    const near = (pos: Vec, r: number) => probes.some((b) => {
      const p = b.getPosition()
      return Math.hypot(p.x - pos.x, p.y - pos.y) < r
    })
    for (const s of this.stars) {
      if (!s.taken && near(s.pos, 1.3)) {
        s.taken = true
        this.events.push({ type: 'star', x: s.pos.x, y: s.pos.y, points: POINTS.star })
      }
    }
    for (const f of this.fuelCans) {
      if (!f.taken && near(f.pos, 1.3)) {
        f.taken = true
        this.fuel = 1
        this.events.push({ type: 'fuel', x: f.pos.x, y: f.pos.y, text: 'Tanque cheio!' })
      }
    }
  }

  private checkCheckpoints() {
    const x = this.chassis.getPosition().x
    const cps = this.terrain.checkpoints
    while (this.checkpoint + 1 < cps.length && x >= cps[this.checkpoint + 1].x) {
      this.checkpoint++
      this.emit('checkpoint', { text: `Checkpoint ${cps[this.checkpoint].x} m` })
    }
  }

  /** No ar: soma o giro do chassi. Ao pousar, conta mortais e tempo de voo. */
  private trackTricks(dt: number) {
    const angle = this.chassis.getAngle()
    const delta = wrapAngle(angle - this.lastAngle)
    this.lastAngle = angle
    const grounded = !!touching(this.chassis) || this.motors.some((m) => m.contacts.some((b) => touching(b)))
    if (!grounded) {
      this.airborne = true
      this.airTime += dt
      this.airRotation += delta
      return
    }
    if (this.airborne && !this.ended) {
      const turns = Math.floor((Math.abs(this.airRotation) + 0.6) / (Math.PI * 2))
      if (turns > 0) {
        const pts = POINTS.flip * turns * turns
        this.flips += turns
        this.trickPoints += pts
        const name = this.airRotation < 0 ? 'Mortal para trás' : 'Mortal'
        this.emit('flip', { text: turns > 1 ? `${name} x${turns}!` : `${name}!`, points: pts })
      } else if (this.airTime > 1.2) {
        const pts = Math.round(this.airTime * POINTS.airPerSecond)
        this.trickPoints += pts
        this.emit('air', { text: `Voo de ${this.airTime.toFixed(1)} s`, points: pts })
      }
    }
    this.airborne = false
    this.airTime = 0
    this.airRotation = 0
  }

  private checkCargo() {
    const xs = this.chassisDef.outline.map((v) => v.x)
    const ys = this.chassisDef.outline.map((v) => v.y)
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    for (const c of this.cargo) {
      if (c.lost) continue
      const l = this.chassis.getLocalPoint(c.body.getPosition())
      if (l.x < minX - 0.3 || l.x > maxX + 0.3 || l.y < minY - 1.5 || l.y > maxY + 0.6) c.lost = true
    }
  }

  /** Move o carro inteiro (mantendo a montagem) para `target`, de pé e parado. */
  private teleport(target: Vec) {
    const c = this.chassis.getPosition().clone()
    const turn = -wrapAngle(this.chassis.getAngle())
    for (const b of this.allCarBodies()) {
      const rel = rotate(sub(b.getPosition(), c), turn)
      b.setTransform({ x: target.x + rel.x, y: target.y + rel.y }, b.getAngle() + turn)
      b.setLinearVelocity({ x: 0, y: 0 })
      b.setAngularVelocity(0)
    }
    this.lastAngle = this.chassis.getAngle()
    this.flipTime = 0
    this.airborne = false
    this.airRotation = 0
  }

  /** Desvira o carro onde ele está. */
  rightCar() {
    if (this.ended) return
    const c = this.chassis.getPosition()
    this.teleport({ x: c.x, y: c.y - 1.5 })
  }

  /** Volta ao último checkpoint (também revive depois de batida/sem combustível). */
  respawn() {
    if (this.ended === 'finish') return
    const cp = this.terrain.checkpoints[this.checkpoint]
    const x = cp.x + 1
    const y = groundY(this.terrain.segments, x) ?? cp.y
    this.teleport({ x, y: y - lowestPoint(this.design) - 0.5 })
    if (this.options.fuel) this.fuel = Math.max(this.fuel, 0.5)
    this.noFuelTime = 0
    this.ended = null
    this.respawns++
  }

  private dust(): DustPoint[] {
    const out: DustPoint[] = []
    const speed = Math.abs(this.chassis.getLinearVelocity().x)
    for (const m of this.motors) {
      for (const b of m.contacts) {
        const f = touching(b)
        const mat = f?.getUserData() as MaterialId | undefined
        if (!f || !mat || !MATERIALS[mat]) continue
        const p = b.getPosition()
        const slip = Math.abs(Math.abs(m.body.getAngularVelocity() * m.def.radius) - speed)
        const intensity = Math.min(1, slip / 6 + speed / 25)
        if (intensity > 0.08) out.push({ x: p.x, y: p.y + m.contactRadius, material: mat, intensity })
        break
      }
    }
    return out
  }

  snapshot(): SimSnapshot {
    const car: CarPoses = {
      chassis: poseOf(this.chassis),
      parts: {},
      springs: {},
      blobs: {},
      cargo: this.cargo.map((c) => poseOf(c.body)),
      flags: {},
    }
    for (const [id, body] of this.bodies) car.parts[id] = poseOf(body)
    for (const f of this.flags) {
      const b = f.parent.getWorldPoint(f.local)
      car.parts[f.id] = { x: b.x, y: b.y, angle: f.parent.getAngle() + f.localAngle }
      car.flags[f.id] = { ...f.state }
    }
    for (const [id, s] of this.springs) {
      const top = s.parent.getWorldPoint(s.topLocal)
      const hub = s.hub.getPosition()
      car.springs[id] = { top: { x: top.x, y: top.y }, bottom: { x: hub.x, y: hub.y } }
    }
    for (const [id, g] of this.goo) {
      const center = this.bodies.get(id)!.getPosition()
      car.blobs[id] = g.segments.map((s) => {
        const p = s.getPosition()
        const d = Math.hypot(p.x - center.x, p.y - center.y) || 1
        const k = (d + g.segRadius) / d // empurra para fora: contorno externo
        return { x: center.x + (p.x - center.x) * k, y: center.y + (p.y - center.y) * k }
      })
    }
    const driven = this.motors.filter((m) => m.driven)
    const stars = this.stars.filter((s) => s.taken).length
    return {
      car,
      props: this.props.map(({ spec, bodies }) => ({ spec, poses: bodies.map(poseOf) })),
      stars: this.stars.map((s) => s.taken),
      fuelCans: this.fuelCans.map((f) => f.taken),
      speed: this.chassis.getLinearVelocity().x,
      time: this.time,
      finishTime: this.finishTime,
      ended: this.ended,
      cargoKept: this.cargo.filter((c) => !c.lost).length,
      cargoTotal: this.cargo.length,
      nitro: this.nitro,
      fuel: this.options.fuel ? this.fuel : 1,
      score: Math.floor(this.maxX * POINTS.perMeter) + stars * POINTS.star + this.trickPoints,
      maxX: this.maxX,
      checkpoint: this.checkpoint,
      respawns: this.respawns,
      flips: this.flips,
      airborne: this.airborne,
      flipped: this.flipTime > 1.5,
      wheelSpin: driven.length ? driven.reduce((s, m) => s + Math.abs(m.body.getAngularVelocity()), 0) / driven.length : 0,
      dust: this.dust(),
    }
  }
}
