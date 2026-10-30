import { Bone, PawPrint } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Look } from './Canvas'

// Alterna entre ver a criatura como animal (pele) ou como esqueleto e músculos.
export function LookToggle({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
  return (
    <ToggleGroup type="single" variant="outline" value={look} onValueChange={(v) => v && onChange(v as Look)} aria-label="Aparência">
      <ToggleGroupItem value="skin" aria-label="Pele">
        <PawPrint /> Pele
      </ToggleGroupItem>
      <ToggleGroupItem value="skeleton" aria-label="Esqueleto">
        <Bone /> Esqueleto
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
