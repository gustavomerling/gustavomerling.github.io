import { Mountain } from 'lucide-react'
import type { TerrainKind } from '../physics/ground'

export const TERRAINS: { value: TerrainKind; label: string }[] = [
  { value: 'flat', label: 'Plano' },
  { value: 'hills', label: 'Morros' },
  { value: 'stairs', label: 'Escada' },
  { value: 'rough', label: 'Irregular' },
]

// Terreno usado em Simular e Treinar (o treino evolui a criatura nesse terreno).
export function TerrainSelect({ value, onChange }: { value: TerrainKind; onChange: (t: TerrainKind) => void }) {
  return (
    <label className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-sm shadow-xs" title="Terreno">
      <Mountain className="size-4 text-muted-foreground" />
      <span className="sr-only">Terreno</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TerrainKind)}
        className="cursor-pointer bg-transparent pr-1 font-medium outline-none"
      >
        {TERRAINS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  )
}
