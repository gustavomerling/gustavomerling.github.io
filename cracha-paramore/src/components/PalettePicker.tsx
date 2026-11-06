import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ARTIST_LABEL,
  COLOR_PALETTES,
  MONO_PALETTES,
  albumVariations,
  getPalette,
  paletteLabel,
  type AlbumInfo,
  type Palette,
  type PaletteId,
} from '@/lib/palettes'
import { cn } from '@/lib/utils'

interface PalettePickerProps {
  value: PaletteId
  onChange: (id: PaletteId) => void
}

type Artist = AlbumInfo['artist']

function CheckMark() {
  return (
    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}

function AlbumGrid({
  palettes,
  value,
  onChange,
}: {
  palettes: Palette[]
  value: PaletteId
  onChange: (id: PaletteId) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-4">
      {palettes.map((first) => {
        const album = first.album!
        const variations = albumVariations(first)
        const current = variations.find((p) => p.id === value)
        const selected = Boolean(current)
        const palette = current ?? first
        return (
          <button
            key={first.id}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(first.id)
            }}
            className="group min-w-0 text-left"
          >
            <div
              className={cn(
                'relative aspect-square overflow-hidden rounded-lg border-2 transition duration-200',
                selected
                  ? 'border-primary shadow-[0_0_0_3px_rgba(255,85,0,0.16),0_10px_24px_-12px_rgba(0,0,0,0.9)]'
                  : 'border-white/10 group-hover:-translate-y-0.5 group-hover:border-white/30',
              )}
            >
              <img
                src={album.cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover"
              />
              {selected && <CheckMark />}
            </div>
            <span
              className={cn(
                'mt-1.5 line-clamp-2 block text-[11px] font-medium leading-[1.25] transition',
                selected ? 'text-white' : 'text-white/65 group-hover:text-white/90',
              )}
            >
              {album.title}
            </span>
            <span className="mt-1 flex gap-1" aria-hidden="true">
              {[palette.block, palette.accent, palette.bg].map((color) => (
                <span
                  key={color}
                  className="size-2.5 rounded-full border border-white/15"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Miniatura do crachá com as cores da paleta. */
function MiniBadge({ palette }: { palette: Palette }) {
  return (
    <span
      className="flex aspect-[54/86] w-7 shrink-0 overflow-hidden rounded-[3px] border border-white/20"
      style={{ backgroundColor: palette.bg }}
    >
      <span className="w-[26%]" style={{ backgroundColor: palette.block }} />
      <span className="mt-auto h-[14%] flex-1" style={{ backgroundColor: palette.accent }} />
    </span>
  )
}

function VariationPicker({
  palette,
  value,
  onChange,
}: {
  palette: Palette
  value: PaletteId
  onChange: (id: PaletteId) => void
}) {
  const variations = albumVariations(palette)
  if (variations.length < 2) return null
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
        Variações · {palette.album!.title}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {variations.map((variation) => {
          const selected = variation.id === value
          return (
            <button
              key={variation.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(variation.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-lg border-2 p-2 text-left transition',
                selected ? 'border-primary bg-white/[0.04]' : 'border-white/10 hover:border-white/30',
              )}
            >
              <MiniBadge palette={variation} />
              <span className="text-[12px] font-medium text-white/80">{variation.variation}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonoOption({
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
      onClick={onSelect}
      className={cn(
        'relative flex items-center gap-3 rounded-lg border-2 p-2 text-left transition',
        selected ? 'border-primary bg-white/[0.04]' : 'border-white/10 hover:border-white/30',
      )}
    >
      <MiniBadge palette={palette} />
      <span className="text-[12px] font-medium text-white/80">{palette.name}</span>
      {selected && <CheckMark />}
    </button>
  )
}

export function PalettePicker({ value, onChange }: PalettePickerProps) {
  const selected = getPalette(value)
  const [tab, setTab] = useState<Artist>(selected.album?.artist ?? 'paramore')

  useEffect(() => {
    if (selected.album) setTab(selected.album.artist)
  }, [value])

  // Um cartão por álbum (a primeira variação representa o álbum)
  const byArtist = (artist: Artist) =>
    COLOR_PALETTES.filter((p) => p.album?.artist === artist && albumVariations(p)[0] === p)

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(next) => setTab(next as Artist)}>
        <TabsList className="h-9 w-full max-w-[260px] border border-white/8 bg-white/[0.04] p-[3px]">
          <TabsTrigger value="paramore" className="data-[state=active]:bg-white/10">
            {ARTIST_LABEL.paramore}
          </TabsTrigger>
          <TabsTrigger value="hayley" className="data-[state=active]:bg-white/10">
            {ARTIST_LABEL.hayley}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paramore" className="mt-4">
          <AlbumGrid palettes={byArtist('paramore')} value={value} onChange={onChange} />
        </TabsContent>
        <TabsContent value="hayley" className="mt-4">
          <AlbumGrid palettes={byArtist('hayley')} value={value} onChange={onChange} />
        </TabsContent>
      </Tabs>

      {selected.album?.artist === tab && (
        <VariationPicker palette={selected} value={value} onChange={onChange} />
      )}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Preto e branco
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MONO_PALETTES.map((palette) => (
            <MonoOption
              key={palette.id}
              palette={palette}
              selected={palette.id === value}
              onSelect={() => onChange(palette.id)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-white/45">
        Cores de: <span className="font-medium text-white/80">{paletteLabel(selected)}</span>
        {selected.album && <span className="text-white/35"> · {selected.album.year}</span>}
      </p>
    </div>
  )
}
