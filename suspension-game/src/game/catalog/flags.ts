export type FlagPattern = 'checkered' | 'red' | 'pirate' | 'rainbow' | 'green'

/**
 * Bandeira = haste flexível + pano. Não pesa nem colide: é animada por uma mola
 * angular que sente a aceleração e a velocidade do ponto onde está presa.
 */
export interface FlagDef {
  id: string
  name: string
  pattern: FlagPattern
  /** Comprimento da haste (m). */
  length: number
  clothW: number
  clothH: number
  /** Rigidez da haste (Hz): menor = enverga mais e balança mais devagar. */
  frequencyHz: number
  dampingRatio: number
  thickness: number
  poleColor: string
}

export const FLAGS: FlagDef[] = [
  { id: 'checkered', name: 'Chegada', pattern: 'checkered', length: 1.1, clothW: 0.5, clothH: 0.34, frequencyHz: 2.2, dampingRatio: 0.18, thickness: 0.04, poleColor: '#cfd4da' },
  { id: 'red', name: 'Vermelha', pattern: 'red', length: 1, clothW: 0.45, clothH: 0.3, frequencyHz: 2.6, dampingRatio: 0.2, thickness: 0.04, poleColor: '#cfd4da' },
  { id: 'pirate', name: 'Pirata', pattern: 'pirate', length: 1.2, clothW: 0.55, clothH: 0.38, frequencyHz: 2, dampingRatio: 0.15, thickness: 0.045, poleColor: '#8d6e63' },
  { id: 'rainbow', name: 'Arco-íris', pattern: 'rainbow', length: 1.1, clothW: 0.55, clothH: 0.36, frequencyHz: 2.2, dampingRatio: 0.18, thickness: 0.04, poleColor: '#eceff1' },
  { id: 'whip', name: 'Antena', pattern: 'green', length: 2, clothW: 0.32, clothH: 0.2, frequencyHz: 1.1, dampingRatio: 0.08, thickness: 0.025, poleColor: '#ff7043' },
]

export const FLAGS_BY_ID: Record<string, FlagDef> = Object.fromEntries(FLAGS.map((f) => [f.id, f]))
