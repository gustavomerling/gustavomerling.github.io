// Web Worker: evolui a população fora da thread da interface e envia o resultado de cada geração.
import type { Model } from '../editor/model'
import type { TerrainKind } from '../physics/ground'
import { evaluate, type Score } from './episode'
import type { EvaluatorIn, EvaluatorOut } from './evaluator'
import { Evolution } from './population'

export type WorkerIn =
  | { type: 'start'; model: Model; groundY: number; terrain: TerrainKind; seed: number; seedWeights?: Float32Array; startGeneration?: number } | { type: 'pause' } | { type: 'resume' }
export type WorkerOut = {
  type: 'generation'
  generation: number
  best: number
  mean: number
  distance: number
  weights: Float32Array
}

const ctx = self as unknown as {
  postMessage: (message: WorkerOut) => void
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null
}

let evolution: Evolution | null = null
let running = false
// Parâmetros da criatura em treino, repassados aos avaliadores.
let job: { model: Model; groundY: number; terrain: TerrainKind } | null = null

// Avaliadores em paralelo (um por núcleo, deixando um livre para a interface).
// Se o navegador não permitir workers dentro de workers, avalia aqui mesmo.
const POOL_SIZE = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1))
let pool: Worker[] = []
try {
  if (typeof Worker !== 'undefined') {
    pool = Array.from({ length: POOL_SIZE }, () => new Worker(new URL('./evaluator.ts', import.meta.url), { type: 'module' }))
  }
} catch {
  pool = []
}
let nextId = 0

// Divide a população em fatias, uma por avaliador, e junta as notas na ordem original.
async function evaluateAll(population: Float32Array[]): Promise<Score[]> {
  if (pool.length === 0 || !job) return population.map((w) => evaluate(job!.model, job!.groundY, w, job!.terrain))
  const size = Math.ceil(population.length / pool.length)
  const slices = pool.map((_, i) => population.slice(i * size, (i + 1) * size))
  const results = await Promise.all(
    pool.map(
      (worker, i) =>
        new Promise<Score[]>((resolve) => {
          if (slices[i].length === 0) return resolve([])
          const id = nextId++
          const onMessage = (e: MessageEvent<EvaluatorOut>) => {
            if (e.data.id !== id) return
            worker.removeEventListener('message', onMessage)
            resolve(e.data.scores)
          }
          worker.addEventListener('message', onMessage)
          const msg: EvaluatorIn = { id, ...job!, population: slices[i] }
          worker.postMessage(msg)
        }),
    ),
  )
  return results.flat()
}

const loop = async () => {
  if (!running || !evolution) return
  const current = evolution
  const scores = await evaluateAll(current.candidates)
  // Um novo "start" pode ter trocado a evolução enquanto esta geração era avaliada.
  if (current !== evolution) return
  const stats = current.commit(scores)
  ctx.postMessage({
    type: 'generation',
    generation: stats.generation,
    best: stats.best,
    mean: stats.mean,
    distance: stats.bestScore.distance,
    weights: current.bestWeights,
  })
  // Devolve o controle ao event loop para receber pausar/retomar entre gerações.
  setTimeout(loop, 0)
}

ctx.onmessage = (e) => {
  const msg = e.data
  if (msg.type === 'start') {
    job = { model: msg.model, groundY: msg.groundY, terrain: msg.terrain }
    evolution = new Evolution(msg.model, msg.groundY, {
      seed: msg.seed,
      populationSize: 60,
      terrain: msg.terrain,
      seedWeights: msg.seedWeights,
      startGeneration: msg.startGeneration,
    })
    running = true
    void loop()
  } else if (msg.type === 'pause') {
    running = false
  } else if (msg.type === 'resume' && !running) {
    running = true
    void loop()
  }
}
