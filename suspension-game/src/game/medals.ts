import type { SimSnapshot } from './physics/Simulation'

export const MEDALS = [
  { name: 'Nenhuma', rule: '' },
  { name: 'Bronze', rule: 'Cruze a chegada' },
  { name: 'Prata', rule: 'Chegue com metade das estrelas' },
  { name: 'Ouro', rule: 'Todas as estrelas, sem voltar ao checkpoint' },
]

/** Medalha da corrida (0 = nenhuma). */
export function medalFor(s: SimSnapshot): number {
  if (s.ended !== 'finish') return 0
  const stars = s.stars.filter(Boolean).length
  if (stars === s.stars.length && s.respawns === 0) return 3
  if (stars >= s.stars.length / 2) return 2
  return 1
}
