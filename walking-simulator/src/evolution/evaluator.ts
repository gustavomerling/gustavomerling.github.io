// Sub-worker de avaliação: simula uma fatia da população e devolve as notas.
// O worker de treino (worker.ts) divide cada geração entre vários destes, um por núcleo.
import type { Model } from '../editor/model'
import type { TerrainKind } from '../physics/ground'
import { evaluate, type Score } from './episode'

export type EvaluatorIn = { id: number; model: Model; groundY: number; terrain: TerrainKind; population: Float32Array[] }
export type EvaluatorOut = { id: number; scores: Score[] }

const ctx = self as unknown as {
  postMessage: (message: EvaluatorOut) => void
  onmessage: ((e: MessageEvent<EvaluatorIn>) => void) | null
}

ctx.onmessage = (e) => {
  const { id, model, groundY, terrain, population } = e.data
  ctx.postMessage({ id, scores: population.map((w) => evaluate(model, groundY, w, terrain)) })
}
