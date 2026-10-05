export interface SuspensionDef {
  id: string
  name: string
  /** Frequência natural da mola (Hz): menor = mais macia. */
  frequencyHz: number
  /** Amortecimento: 0 = quica muito, 1 = crítico. */
  dampingRatio: number
  /** Comprimento da mola (m), do ponto de fixação até o cubo. */
  length: number
  /** Curso: fração do comprimento que pode comprimir / estender. */
  compression: number
  extension: number
  color: string
}

export const SUSPENSIONS: SuspensionDef[] = [
  { id: 'soft', name: 'Macia', frequencyHz: 1.8, dampingRatio: 0.35, length: 0.8, compression: 0.55, extension: 0.25, color: '#4caf50' },
  { id: 'medium', name: 'Média', frequencyHz: 2.8, dampingRatio: 0.5, length: 0.7, compression: 0.5, extension: 0.2, color: '#ffb300' },
  { id: 'sport', name: 'Esportiva', frequencyHz: 4, dampingRatio: 0.75, length: 0.55, compression: 0.4, extension: 0.12, color: '#29b6f6' },
  { id: 'hard', name: 'Dura', frequencyHz: 6, dampingRatio: 0.85, length: 0.5, compression: 0.3, extension: 0.08, color: '#e53935' },
  { id: 'air', name: 'A ar', frequencyHz: 1.1, dampingRatio: 0.7, length: 0.9, compression: 0.5, extension: 0.3, color: '#90a4ae' },
  { id: 'long', name: 'Curso longo', frequencyHz: 1.4, dampingRatio: 0.4, length: 1.1, compression: 0.6, extension: 0.35, color: '#8e24aa' },
]

export const SUSPENSIONS_BY_ID: Record<string, SuspensionDef> = Object.fromEntries(SUSPENSIONS.map((s) => [s.id, s]))
