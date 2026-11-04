import { Check } from 'lucide-react'
import {
  COLOR_PALETTES,
  MONO_PALETTES,
  getPalette,
  type Palette,
  type PaletteId,
} from '@/lib/palettes'
import { cn } from '@/lib/utils'

interface PalettePickerProps {
  value: PaletteId
  onChange: (id: PaletteId) => void
}

function Swatch({
  palette,
  selected,
  onSelect,
}: {
  palette: Palette
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={palette.name}
      title={palette.name}
      onClick={onSelect}
      className="group min-w-0"
    >
      <span
        className={cn(
          'relative flex aspect-[54/86] overflow-hidden rounded-md border-2 transition duration-200',
          selected
            ? 'border-primary shadow-[0_0_0_3px_rgba(255,85,0,0.16)]'
            : 'border-white/10 group-hover:-translate-y-0.5 group-hover:border-white/30',
        )}
        style={{ backgroundColor: palette.bg }}
      >
        <span className="w-[24%]" style={{ backgroundColor: palette.block }} />
        <span className="relative flex-1">
          <span
            className="absolute inset-x-0 bottom-0 h-[11%]"
            style={{ backgroundColor: palette.accent }}
          />
        </span>
        {selected && (
          <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        )}
      </span>
    </button>
  )
}

export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const selected = getPalette(value)

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Cores
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {COLOR_PALETTES.map((palette) => (
            <Swatch
              key={palette.id}
              palette={palette}
              selected={palette.id === value}
              onSelect={() => onChange(palette.id)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Preto e branco
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {MONO_PALETTES.map((palette) => (
            <Swatch
              key={palette.id}
              palette={palette}
              selected={palette.id === value}
              onSelect={() => onChange(palette.id)}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-white/45">
        Selecionado: <span className="font-medium text-white/80">{selected.name}</span>
      </p>
    </div>
  )
}
