import type { TerrainKind } from '../physics/ground'
import { Particle } from '../physics/particle'
import { World } from '../physics/world'
import type { Vec2 } from '../utils/vec2'

// Juntas e ossos do torso, mais os membros presos a juntas do torso.
export type Joint = { id: number; x: number; y: number }
export type Bone = { a: number; b: number }

// Membro: começa numa junta do torso (anchor) e segue por pontos livres,
// cada um virando uma junta do membro. Os ossos ligam anchor -> p1 -> p2 ...
export type Limb = { id: number; anchor: number; points: Vec2[] }

// Referência a uma junta: do torso (limb = null, i = id da junta) ou de um membro (limb = id, i = índice em `points`).
export type JRef = { limb: number | null; i: number }

// Músculo entre duas juntas. Vale para os dois exemplares dos membros que ele toca.
export type Muscle = { id: number; a: JRef; b: JRef; strength: number; contraction: number }

// Aparência no modo "pele": matiz da cor (0–360) e padrão desenhado sobre o corpo.
export type SkinPattern = 'plain' | 'spots' | 'stripes' | 'scales'
export type Skin = { hue: number; pattern: SkinPattern }
export const DEFAULT_SKIN: Skin = { hue: 28, pattern: 'spots' }

// `feet`: juntas que podem tocar o chão. Qualquer outra parte encostando conta como queda no treino.
// Sem `feet`, as pontas dos membros são os pés.
export type Model = { joints: Joint[]; bones: Bone[]; limbs: Limb[]; muscles: Muscle[]; skin?: Skin; feet?: JRef[] }

export function footRefs(model: Model): JRef[] {
  return model.feet ?? model.limbs.map((l) => ({ limb: l.id, i: l.points.length - 1 }))
}

// Marca ou desmarca uma junta como pé (a primeira marcação parte do padrão: pontas dos membros).
export function toggleFoot(model: Model, ref: JRef): Model {
  const feet = footRefs(model)
  const next = feet.some((f) => sameRef(f, ref)) ? feet.filter((f) => !sameRef(f, ref)) : [...feet, ref]
  return { ...model, feet: next }
}

export const emptyModel: Model = { joints: [], bones: [], limbs: [], muscles: [] }

// Raio em pixels para considerar que o clique acertou uma junta existente.
const HIT_RADIUS = 14

// Cada membro é desenhado em dois exemplares: "back" (atrás do torso) e "front" (na frente).
export type LimbSide = 'back' | 'front'
export const LIMB_SIDES: LimbSide[] = ['back', 'front']

export const sameRef = (a: JRef, b: JRef) => a.limb === b.limb && a.i === b.i

export function refPos(model: Model, ref: JRef): Vec2 | undefined {
  if (ref.limb === null) return model.joints.find((j) => j.id === ref.i)
  return model.limbs.find((l) => l.id === ref.limb)?.points[ref.i]
}

// Junta (do torso ou de membro) mais próxima do clique.
export function findRefAt(model: Model, x: number, y: number): JRef | undefined {
  let best: JRef | undefined
  let bestDist = HIT_RADIUS
  const test = (ref: JRef, p: Vec2) => {
    const d = Math.hypot(p.x - x, p.y - y)
    if (d <= bestDist) {
      best = ref
      bestDist = d
    }
  }
  for (const j of model.joints) test({ limb: null, i: j.id }, j)
  for (const limb of model.limbs) limb.points.forEach((p, i) => test({ limb: limb.id, i }, p))
  return best
}

// Cria um músculo; ignora ligação de uma junta com ela mesma e músculos repetidos.
export function addMuscle(model: Model, a: JRef, b: JRef, strength: number, contraction: number): Model {
  if (sameRef(a, b)) return model
  if (model.muscles.some((m) => (sameRef(m.a, a) && sameRef(m.b, b)) || (sameRef(m.a, b) && sameRef(m.b, a)))) return model
  return { ...model, muscles: [...model.muscles, { id: nextId(model.muscles), a, b, strength, contraction }] }
}

export type WorldLimb = { limbId: number; side: LimbSide; particles: Particle[] }

// O que o modo "pele" precisa para desenhar a criatura sobre a física.
export type Body = {
  torso: Particle[]
  // Posições iniciais do torso: referência para girar o padrão da pele junto com o corpo.
  initial: Vec2[]
  // Faces do torso (índices em `torso`): triângulos e quadriláteros fechados por ossos. Viram a área preenchida do corpo.
  faces: number[][]
  torsoBones: [number, number][]
  // Cadeia de cada exemplar de membro, começando na junta do torso.
  limbs: { side: LimbSide; chain: Particle[] }[]
  skin: Skin
}
export type BuiltWorld = { world: World; limbs: WorldLimb[]; body: Body; feet: Set<Particle> }

export function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function findJointAt(model: Model, x: number, y: number): Joint | undefined {
  let best: Joint | undefined
  let bestDist = HIT_RADIUS
  for (const j of model.joints) {
    const d = Math.hypot(j.x - x, j.y - y)
    if (d <= bestDist) {
      best = j
      bestDist = d
    }
  }
  return best
}

export function addJoint(model: Model, x: number, y: number): { model: Model; id: number } {
  const id = nextId(model.joints)
  return { model: { ...model, joints: [...model.joints, { id, x, y }] }, id }
}

// Liga duas juntas do torso com um osso. Não repete ossos nem liga uma junta com ela mesma.
export function connect(model: Model, a: number, b: number): Model {
  if (a === b) return model
  const exists = model.bones.some((bone) => (bone.a === a && bone.b === b) || (bone.a === b && bone.b === a))
  if (exists) return model
  return { ...model, bones: [...model.bones, { a, b }] }
}

export function addLimb(model: Model, anchor: number, points: Vec2[]): Model {
  const limb: Limb = { id: nextId(model.limbs), anchor, points }
  return { ...model, limbs: [...model.limbs, limb] }
}

// Continua um membro existente a partir da ponta: cada ponto novo vira uma junta (subdivisão natural).
export function extendLimb(model: Model, limbId: number, points: Vec2[]): Model {
  return {
    ...model,
    limbs: model.limbs.map((limb) => (limb.id === limbId ? { ...limb, points: [...limb.points, ...points] } : limb)),
  }
}

// Tamanho mínimo de um osso ao dividir um membro, para não criar ossos degenerados.
export const MIN_SEGMENT = 16
// Distância em pixels para considerar que o clique acertou um segmento de membro.
const SEGMENT_HIT_RADIUS = 8

// Segmento de membro clicado: índice em `points` onde a nova junta será inserida.
export type SegmentHit = { limbId: number; index: number; point: Vec2 }

// Procura o segmento de membro mais próximo do clique. Segmentos são anchor -> p1 -> p2 ...
export function findLimbSegmentAt(model: Model, x: number, y: number): SegmentHit | undefined {
  let best: SegmentHit | undefined
  let bestDist = SEGMENT_HIT_RADIUS
  for (const limb of model.limbs) {
    const anchor = model.joints.find((j) => j.id === limb.anchor)
    if (!anchor) continue
    const chain = [anchor, ...limb.points]
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i]
      const b = chain[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const lenSq = dx * dx + dy * dy
      if (lenSq === 0) continue
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lenSq))
      const point = { x: a.x + dx * t, y: a.y + dy * t }
      const dist = Math.hypot(x - point.x, y - point.y)
      // Só divide se os dois novos ossos couberem no tamanho mínimo.
      const fits = Math.hypot(point.x - a.x, point.y - a.y) >= MIN_SEGMENT && Math.hypot(b.x - point.x, b.y - point.y) >= MIN_SEGMENT
      if (fits && dist <= bestDist) {
        best = { limbId: limb.id, index: i, point }
        bestDist = dist
      }
    }
  }
  return best
}

// Insere uma junta no membro. Como os dois exemplares vêm do mesmo membro, ambos são divididos.
export function splitLimb(model: Model, hit: SegmentHit): Model {
  // A nova junta entra em `hit.index`; as juntas dali em diante deslocam um índice e os músculos acompanham.
  const shift = (ref: JRef): JRef => (ref.limb === hit.limbId && ref.i >= hit.index ? { ...ref, i: ref.i + 1 } : ref)
  return {
    ...model,
    muscles: model.muscles.map((m) => ({ ...m, a: shift(m.a), b: shift(m.b) })),
    ...(model.feet ? { feet: model.feet.map(shift) } : {}),
    limbs: model.limbs.map((limb) =>
      limb.id === hit.limbId
        ? { ...limb, points: [...limb.points.slice(0, hit.index), hit.point, ...limb.points.slice(hit.index)] }
        : limb,
    ),
  }
}

// Junta de membro clicada: `index` em `points`; `pivot` é a junta anterior (âncora ou ponto anterior).
export type LimbPointHit = { limbId: number; index: number; pivot: Vec2 }

export function findLimbPointAt(model: Model, x: number, y: number): LimbPointHit | undefined {
  let best: LimbPointHit | undefined
  let bestDist = HIT_RADIUS
  for (const limb of model.limbs) {
    const anchor = model.joints.find((j) => j.id === limb.anchor)
    if (!anchor) continue
    limb.points.forEach((p, index) => {
      const d = Math.hypot(p.x - x, p.y - y)
      if (d <= bestDist) {
        best = { limbId: limb.id, index, pivot: index === 0 ? anchor : limb.points[index - 1] }
        bestDist = d
      }
    })
  }
  return best
}

// Gira a junta `index` do membro e tudo que vem depois dela em torno da junta anterior.
// Os ossos mantêm o tamanho; como os dois exemplares vêm do mesmo membro, ambos giram.
export function rotateLimb(base: Model, hit: LimbPointHit, delta: number): Model {
  const cos = Math.cos(delta)
  const sin = Math.sin(delta)
  return {
    ...base,
    limbs: base.limbs.map((limb) =>
      limb.id === hit.limbId
        ? {
            ...limb,
            points: limb.points.map((p, i) => {
              if (i < hit.index) return p
              const dx = p.x - hit.pivot.x
              const dy = p.y - hit.pivot.y
              return { x: hit.pivot.x + dx * cos - dy * sin, y: hit.pivot.y + dx * sin + dy * cos }
            }),
          }
        : limb,
    ),
  }
}

// Chão logo abaixo do ponto mais baixo da criatura.
export function groundYFor(model: Model): number {
  const ys = [...model.joints.map((j) => j.y), ...model.limbs.flatMap((l) => l.points.map((p) => p.y))]
  return Math.max(...ys) + 4
}

// Converte o modelo em um mundo físico. O membro gera dois exemplares independentes, presos à mesma junta do torso.
// O relevo do terreno começa à frente da junta mais adiantada da criatura.
export function toWorld(model: Model, groundY: number, terrain: TerrainKind = 'flat'): BuiltWorld {
  const xs = [...model.joints.map((j) => j.x), ...model.limbs.flatMap((l) => l.points.map((p) => p.x))]
  const originX = xs.length > 0 ? Math.max(...xs) : 0
  const world = new World({ gravityY: 900, ground: { y: groundY, friction: 1, terrain, originX } })
  const torsoParticles = new Map<number, Particle>()
  for (const j of model.joints) {
    torsoParticles.set(j.id, world.addParticle(new Particle({ x: j.x, y: j.y })))
  }
  for (const bone of model.bones) {
    world.connect(torsoParticles.get(bone.a)!, torsoParticles.get(bone.b)!)
  }

  const limbs: WorldLimb[] = []
  const bodyLimbs: Body['limbs'] = []
  const sideParticles = new Map<string, Particle[]>()
  for (const limb of model.limbs) {
    const anchor = torsoParticles.get(limb.anchor)
    if (!anchor) continue
    for (const side of LIMB_SIDES) {
      let prev = anchor
      const particles = limb.points.map((p) => {
        const part = world.addParticle(new Particle(p))
        part.depth = side === 'back' ? -1 : 1
        world.connect(prev, part)
        prev = part
        return part
      })
      limbs.push({ limbId: limb.id, side, particles })
      bodyLimbs.push({ side, chain: [anchor, ...particles] })
      sideParticles.set(`${limb.id}:${side}`, particles)
    }
  }

  // Músculo que toca um membro é criado uma vez por exemplar (mesmo lado nas duas pontas); os demais, uma vez.
  // Cada exemplar vira um músculo independente no mundo, com o próprio sinal do cérebro.
  const resolve = (ref: JRef, side: LimbSide) =>
    ref.limb === null ? torsoParticles.get(ref.i) : sideParticles.get(`${ref.limb}:${side}`)?.[ref.i]
  for (const muscle of model.muscles) {
    const touchesLimb = muscle.a.limb !== null || muscle.b.limb !== null
    for (const side of touchesLimb ? LIMB_SIDES : (['front'] as LimbSide[])) {
      const a = resolve(muscle.a, side)
      const b = resolve(muscle.b, side)
      if (a && b) world.addMuscle(a, b, muscle.strength, muscle.contraction)
    }
  }
  // Pés: a junta em si (torso) ou os dois exemplares dela (membro).
  const feet = new Set<Particle>()
  for (const ref of footRefs(model)) {
    for (const side of ref.limb === null ? (['front'] as LimbSide[]) : LIMB_SIDES) {
      const p = resolve(ref, side)
      if (p) feet.add(p)
    }
  }
  return { world, limbs, body: buildBody(model, world, bodyLimbs), feet }
}

function buildBody(model: Model, world: World, limbs: Body['limbs']): Body {
  const index = new Map(model.joints.map((j, i) => [j.id, i]))
  const torsoBones = model.bones.map((b) => [index.get(b.a)!, index.get(b.b)!] as [number, number])
  const linked = new Set(torsoBones.flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]))
  const n = model.joints.length
  const has = (a: number, b: number) => linked.has(`${a}:${b}`)
  const faces: number[][] = []
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (!has(a, b)) continue
      for (let c = b + 1; c < n; c++) if (has(b, c) && has(a, c)) faces.push([a, b, c])
      // Quadriláteros a-b-c-d (ex.: gomos da lagarta, que não têm diagonais).
      for (let c = 0; c < n; c++) {
        if (c === a || c === b || !has(b, c)) continue
        for (let d = a + 1; d < n; d++) if (d !== b && d !== c && has(c, d) && has(d, a)) faces.push([a, b, c, d])
      }
    }
  // Sem repetir faces e todas no mesmo sentido: no preenchimento "nonzero", faces sobrepostas em sentidos
  // opostos se anulariam e abririam buracos no corpo.
  const seen = new Set<string>()
  const pts = model.joints
  const unique = faces.filter((f) => {
    const key = [...f].sort((x, y) => x - y).join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  for (const f of unique) {
    let area = 0
    for (let i = 0; i < f.length; i++) {
      const p = pts[f[i]]
      const q = pts[f[(i + 1) % f.length]]
      area += p.x * q.y - q.x * p.y
    }
    if (area < 0) f.reverse()
  }
  return {
    torso: world.particles.slice(0, n),
    initial: model.joints.map((j) => ({ x: j.x, y: j.y })),
    faces: unique,
    torsoBones,
    limbs,
    skin: model.skin ?? DEFAULT_SKIN,
  }
}
