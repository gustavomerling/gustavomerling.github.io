import type { JRef, Model, Skin } from './model'

// Salvar e carregar criaturas: `localStorage` (automático) e arquivo JSON (exportar/importar).
const STORAGE_KEY = 'walking-simulator:model'
const FILE_VERSION = 1

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isPoint = (v: unknown) => isObj(v) && isNum(v.x) && isNum(v.y)
const isRef = (v: unknown): v is JRef => isObj(v) && (v.limb === null || isNum(v.limb)) && isNum(v.i)

// Confere a forma do JSON e as referências entre juntas, membros e músculos. Lança erro se algo não bater.
export function parseModel(data: unknown): Model {
  if (!isObj(data)) throw new Error('arquivo não é uma criatura')
  const { joints, bones, limbs, muscles } = data
  if (!Array.isArray(joints) || !joints.every((j) => isPoint(j) && isNum(j.id))) throw new Error('juntas inválidas')
  const jointIds = new Set(joints.map((j) => j.id as number))
  if (!Array.isArray(bones) || !bones.every((b) => isObj(b) && jointIds.has(b.a as number) && jointIds.has(b.b as number))) {
    throw new Error('ossos inválidos')
  }
  if (
    !Array.isArray(limbs) ||
    !limbs.every((l) => isObj(l) && isNum(l.id) && jointIds.has(l.anchor as number) && Array.isArray(l.points) && l.points.every(isPoint))
  ) {
    throw new Error('membros inválidos')
  }
  const model = { joints, bones, limbs, muscles } as Model
  const refOk = (ref: JRef) =>
    ref.limb === null ? jointIds.has(ref.i) : (model.limbs.find((l) => l.id === ref.limb)?.points.length ?? 0) > ref.i
  if (
    !Array.isArray(muscles) ||
    !muscles.every(
      (m) => isObj(m) && isNum(m.id) && isRef(m.a) && isRef(m.b) && refOk(m.a) && refOk(m.b) && isNum(m.strength) && isNum(m.contraction),
    )
  ) {
    throw new Error('músculos inválidos')
  }
  const skin = data.skin
  const patterns = ['plain', 'spots', 'stripes', 'scales']
  const validSkin = isObj(skin) && isNum(skin.hue) && patterns.includes(skin.pattern as string)
  return {
    joints: model.joints,
    bones: model.bones,
    limbs: model.limbs,
    muscles: model.muscles,
    ...(validSkin ? { skin: { hue: skin.hue as number, pattern: skin.pattern as Skin['pattern'] } } : {}),
    ...(Array.isArray(data.feet) && data.feet.every((f) => isRef(f) && refOk(f)) ? { feet: data.feet as JRef[] } : {}),
  }
}

export function loadSavedModel(): Model | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseModel(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveModel(model: Model): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model))
  } catch {
    // Sem armazenamento (aba privada, cota cheia): segue sem salvar.
  }
}

export function downloadModel(model: Model): void {
  const json = JSON.stringify({ version: FILE_VERSION, ...model }, null, 2)
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'criatura.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function readModelFile(file: File): Promise<Model> {
  return parseModel(JSON.parse(await file.text()))
}

// Cérebro treinado: guardado para a última combinação de criatura + terreno treinada.
const BRAIN_KEY = 'walking-simulator:brain'
export type SavedBrain = { weights: Float32Array; generation: number; distance: number }

// Hash FNV-1a: identifica a criatura (e o terreno) sem guardar o modelo inteiro de novo.
function fingerprint(model: Model, terrain: string): string {
  const text = JSON.stringify([model.joints, model.bones, model.limbs, model.muscles, terrain])
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export function saveBrain(model: Model, terrain: string, brain: SavedBrain): void {
  try {
    const data = { key: fingerprint(model, terrain), weights: Array.from(brain.weights), generation: brain.generation, distance: brain.distance }
    localStorage.setItem(BRAIN_KEY, JSON.stringify(data))
  } catch {
    // Sem armazenamento: o treino só não fica salvo.
  }
}

export function loadBrain(model: Model, terrain: string): SavedBrain | null {
  try {
    const raw = localStorage.getItem(BRAIN_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.key !== fingerprint(model, terrain) || !Array.isArray(data.weights)) return null
    return { weights: Float32Array.from(data.weights), generation: data.generation, distance: data.distance }
  } catch {
    return null
  }
}

export function forgetBrain(): void {
  try {
    localStorage.removeItem(BRAIN_KEY)
  } catch {
    // Nada a apagar.
  }
}
