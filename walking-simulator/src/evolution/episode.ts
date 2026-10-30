import { brainController, HIDDEN_NEURONS } from '../brain/controller'
import { Mlp } from '../brain/mlp'
import { sensorCount } from '../brain/sensors'
import { toWorld, type Body, type Model } from '../editor/model'
import { surfaceY, type TerrainKind } from '../physics/ground'
import type { Particle } from '../physics/particle'
import { FIXED_DT, type World } from '../physics/world'
import { bestRotation, type Vec2 } from '../utils/vec2'

// Duração de um episódio de avaliação.
export const EPISODE_SECONDS = 15
export const EPISODE_STEPS = Math.round(EPISODE_SECONDS / FIXED_DT)

export type Episode = { world: World; body: Body; feet: Set<Particle>; torsoCount: number; weightCount: number }

// Monta o mundo da criatura e calcula o tamanho do vetor de pesos do cérebro (depende de sensores e músculos).
export function buildEpisode(model: Model, groundY: number, terrain: TerrainKind = 'flat'): Episode {
  const { world, body, feet } = toWorld(model, groundY, terrain)
  const weightCount = Mlp.weightCount(sensorCount(world), HIDDEN_NEURONS, world.muscles.length)
  return { world, body, feet, torsoCount: model.joints.length, weightCount }
}

// Coloca o cérebro com `weights` no mundo do episódio.
export function attachBrain(ep: Episode, weights: Float32Array): void {
  const brain = new Mlp(sensorCount(ep.world), HIDDEN_NEURONS, ep.world.muscles.length, weights)
  ep.world.controller = brainController(brain)
}

export type Score = {
  fitness: number
  // Distância horizontal do centro de massa, em px (positivo = direita).
  distance: number
  // Fração do tempo caído: algo que não é pé tocando o chão, torso abaixo de 70% da altura inicial ou inclinado demais.
  fall: number
  // Ativação média absoluta dos músculos (esforço).
  effort: number
  // De 0 a 1: quanto o primeiro segmento dos exemplares da frente e de trás de cada membro alterna.
  alternation: number
}

function centerX(world: World): number {
  let sum = 0
  for (const p of world.particles) sum += p.pos.x
  return sum / world.particles.length
}

// Altura mínima do torso (fração da inicial): abaixo disso conta como caído — evita andar de joelho ou se arrastar.
const MIN_HEIGHT = 0.7

// Quanto um joelho precisa passar do outro para contar como cruzamento (fração do primeiro segmento).
const STRIDE_SLACK = 0.15

// Inclinação a partir da qual o torso conta como caído (em radianos).
const MAX_TILT = (30 * Math.PI) / 180

// Rotação do torso em relação à pose inicial: o ângulo que melhor alinha as posições iniciais
// às atuais em torno do centro (funciona para qualquer formato de torso desenhado).
export function torsoTilt(world: World, initial: Vec2[]): number {
  return bestRotation(initial, world.particles.slice(0, initial.length).map((p) => p.pos))
}

// Simula um episódio inteiro e pontua: distância para a direita, menos queda e esforço.
// Andar capotado ou se arrastando quase não vale: a distância é multiplicada pelo tempo em pé.
export function evaluate(model: Model, groundY: number, weights: Float32Array, terrain: TerrainKind = 'flat'): Score {
  const ep = buildEpisode(model, groundY, terrain)
  attachBrain(ep, weights)
  const { world, body, feet, torsoCount } = ep
  // Partes que não são pé: se encostarem no chão, aquele instante conta como queda.
  const notFeet = feet.size === 0 ? [] : world.particles.filter((p) => !feet.has(p))
  // Pares de exemplares (trás, frente) de cada membro, pela ponta do primeiro segmento (o joelho, numa perna).
  // Os dois saem da mesma junta do torso: alternar é o joelho da frente passar à frente do de trás e voltar.
  const pairs: { back: Particle; front: Particle; slack: number }[] = []
  for (let i = 0; i + 1 < body.limbs.length; i += 2) {
    const [anchor, back] = body.limbs[i].chain
    const front = body.limbs[i + 1].chain[1]
    const segment = Math.hypot(back.pos.x - anchor.pos.x, back.pos.y - anchor.pos.y)
    pairs.push({ back, front, slack: Math.max(3, segment * STRIDE_SLACK) })
  }
  const ahead = pairs.map(() => 0)
  let crossings = 0

  const torsoHeight = () => {
    let sum = 0
    for (let i = 0; i < torsoCount; i++) {
      const p = world.particles[i].pos
      sum += surfaceY(world.ground!, p.x) - p.y
    }
    return sum / torsoCount
  }
  const h0 = Math.max(1, torsoHeight())
  const x0 = centerX(world)
  const initial = world.particles.slice(0, torsoCount).map((p) => ({ ...p.pos }))

  let fallen = 0
  let effort = 0
  for (let s = 0; s < EPISODE_STEPS; s++) {
    world.step(FIXED_DT)
    const touching = notFeet.some((p) => p.contact > 0)
    if (touching || torsoHeight() < h0 * MIN_HEIGHT || Math.abs(torsoTilt(world, initial)) > MAX_TILT) fallen++
    for (const m of world.muscles) effort += Math.abs(m.activation)
    // Cruzamento: a ponta da frente passa à frente da de trás (ou volta), com folga para não contar tremidas.
    pairs.forEach(({ back, front, slack }, i) => {
      const d = front.pos.x - back.pos.x
      const side = d > slack ? 1 : d < -slack ? -1 : 0
      if (side !== 0 && side !== ahead[i]) {
        if (ahead[i] !== 0) crossings++
        ahead[i] = side
      }
    })
  }
  const distance = centerX(world) - x0
  const fall = fallen / EPISODE_STEPS
  effort = effort / EPISODE_STEPS / Math.max(1, world.muscles.length)
  // Alternância das coxas: ~1 cruzamento por segundo por membro vale tudo. Sem alternar (pular, galopar
  // ou arrastar os pés), a distância vale só 10%. Criaturas sem membros não são afetadas.
  const alternation = pairs.length === 0 ? 1 : Math.min(1, crossings / pairs.length / EPISODE_SECONDS)
  const fitness = Number.isFinite(distance) ? distance * (1 - 0.9 * fall) * (0.1 + 0.9 * alternation) - 20 * effort : -1e6
  return { fitness, distance, fall, effort, alternation }
}
