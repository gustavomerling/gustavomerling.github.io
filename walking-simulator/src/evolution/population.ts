import { HIDDEN_NEURONS } from '../brain/controller'
import { Mlp } from '../brain/mlp'
import { sensorCount } from '../brain/sensors'
import type { Model } from '../editor/model'
import type { TerrainKind } from '../physics/ground'
import { createRng, type Rng } from '../utils/rng'
import { buildEpisode, evaluate, type Score } from './episode'

const MUTATION_SCALES = [0.2, 1, 2.5]

export type EvolutionOptions = {
  seed?: number
  populationSize?: number
  // Fração dos melhores copiada sem mudança para a próxima geração.
  eliteFraction?: number
  // Fração da próxima geração formada por cérebros novos (diversidade).
  immigrantFraction?: number
  mutationRate?: number
  mutationSigma?: number
  terrain?: TerrainKind
  // Cérebro de um treino anterior: entra na população junto com variações dele (continuar o treino).
  seedWeights?: Float32Array
  // Gerações já feitas no treino anterior (a contagem continua daí).
  startGeneration?: number
}

export type GenerationStats = {
  generation: number
  best: number
  mean: number
  bestScore: Score
}

// Neuroevolução: algoritmo genético nos pesos do cérebro. Determinístico para uma mesma semente.
export class Evolution {
  generation = 0
  bestWeights: Float32Array = new Float32Array(0)
  history: GenerationStats[] = []

  private readonly model: Model
  private readonly groundY: number
  private readonly terrain: TerrainKind
  private readonly rng: Rng
  private readonly size: number
  private readonly eliteFraction: number
  private readonly immigrantFraction: number
  private readonly mutationRate: number
  private readonly mutationSigma: number
  private readonly inputs: number
  private readonly outputs: number
  private population: Float32Array[]

  constructor(model: Model, groundY: number, options: EvolutionOptions = {}) {
    this.model = model
    this.groundY = groundY
    this.terrain = options.terrain ?? 'flat'
    this.rng = createRng(options.seed ?? 1)
    this.size = options.populationSize ?? 100
    this.eliteFraction = options.eliteFraction ?? 0.1
    this.immigrantFraction = options.immigrantFraction ?? 0.05
    this.mutationRate = options.mutationRate ?? 0.15
    this.mutationSigma = options.mutationSigma ?? 0.3
    const { world } = buildEpisode(model, groundY)
    this.inputs = sensorCount(world)
    this.outputs = world.muscles.length
    this.population = Array.from({ length: this.size }, () => this.randomWeights())
    const seed = options.seedWeights
    if (seed && seed.length === this.population[0].length) {
      // Um terço da população: o cérebro salvo e mutações dele; o resto continua aleatório (diversidade).
      const copies = Math.max(1, Math.floor(this.size / 3))
      this.population[0] = seed
      for (let i = 1; i < copies; i++) this.population[i] = this.child(seed, seed)
      this.generation = options.startGeneration ?? 0
    }
  }

  private randomWeights(): Float32Array {
    return Mlp.random(this.inputs, HIDDEN_NEURONS, this.outputs, this.rng).weights
  }

  // Torneio de 3: o melhor de três sorteados.
  private pick(ranked: { weights: Float32Array; fitness: number }[]): Float32Array {
    let best = ranked[Math.floor(this.rng.next() * ranked.length)]
    for (let i = 0; i < 2; i++) {
      const other = ranked[Math.floor(this.rng.next() * ranked.length)]
      if (other.fitness > best.fitness) best = other
    }
    return best.weights
  }

  private child(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(a.length)
    // Mutação em várias escalas: cada filho sorteia fina, média ou grossa. A fina refina um passo que já
    // funciona; a grossa ajuda a sair de soluções ruins (com sigma fixo a evolução estacionava cedo).
    const sigma = this.mutationSigma * MUTATION_SCALES[Math.floor(this.rng.next() * MUTATION_SCALES.length)]
    for (let i = 0; i < out.length; i++) {
      // Cruzamento uniforme + mutação gaussiana.
      out[i] = this.rng.next() < 0.5 ? a[i] : b[i]
      if (this.rng.next() < this.mutationRate) out[i] += this.rng.gaussian() * sigma
    }
    return out
  }

  // Cérebros a avaliar nesta geração (a avaliação pode rodar em paralelo, fora desta classe).
  get candidates(): Float32Array[] {
    return this.population
  }

  // Avalia a população atual, registra as estatísticas e gera a próxima geração.
  step(): GenerationStats {
    return this.commit(this.population.map((weights) => evaluate(this.model, this.groundY, weights, this.terrain)))
  }

  // Recebe as notas de `candidates` (mesma ordem), registra as estatísticas e gera a próxima geração.
  commit(scores: Score[]): GenerationStats {
    const ranked = this.population
      .map((weights, i) => ({ weights, score: scores[i], fitness: scores[i].fitness }))
      .sort((x, y) => y.fitness - x.fitness)

    const stats: GenerationStats = {
      generation: ++this.generation,
      best: ranked[0].fitness,
      mean: ranked.reduce((s, r) => s + r.fitness, 0) / ranked.length,
      bestScore: ranked[0].score,
    }
    this.bestWeights = ranked[0].weights
    this.history.push(stats)

    const elites = Math.max(1, Math.round(this.size * this.eliteFraction))
    const immigrants = Math.round(this.size * this.immigrantFraction)
    const next: Float32Array[] = ranked.slice(0, elites).map((r) => r.weights)
    for (let i = 0; i < immigrants; i++) next.push(this.randomWeights())
    // Pais vêm da metade de cima da população.
    const parents = ranked.slice(0, Math.max(2, Math.floor(this.size / 2)))
    while (next.length < this.size) next.push(this.child(this.pick(parents), this.pick(parents)))
    this.population = next
    return stats
  }
}
