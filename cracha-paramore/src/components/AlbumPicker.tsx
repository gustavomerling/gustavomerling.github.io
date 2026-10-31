import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlbumCover } from '@/components/AlbumCover'
import {
  ARTIST_LABEL,
  HAYLEY_ALBUMS,
  PARAMORE_ALBUMS,
  type Album,
  type AlbumId,
  type Artist,
} from '@/lib/albums'
import { cn } from '@/lib/utils'

interface AlbumPickerProps {
  value: AlbumId
  onChange: (id: AlbumId) => void
}

function AlbumGrid({
  albums,
  value,
  onChange,
}: {
  albums: Album[]
  value: AlbumId
  onChange: (id: AlbumId) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-4">
      {albums.map((album) => {
        const selected = album.id === value
        return (
          <button
            key={album.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(album.id)}
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
              <AlbumCover album={album} />
              {selected && (
                <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 line-clamp-2 block text-[11px] font-medium leading-[1.25] transition',
                selected ? 'text-white' : 'text-white/65 group-hover:text-white/90',
              )}
            >
              {album.title}
            </span>
            <span className="mt-0.5 block text-[10px] tracking-wide text-white/35">{album.year}</span>
          </button>
        )
      })}
    </div>
  )
}

export function AlbumPicker({ value, onChange }: AlbumPickerProps) {
  const selected = [...PARAMORE_ALBUMS, ...HAYLEY_ALBUMS].find((album) => album.id === value)
  const [tab, setTab] = useState<Artist>(selected?.artist ?? 'paramore')

  useEffect(() => {
    if (selected) setTab(selected.artist)
  }, [value])

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(next) => setTab(next as Artist)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-9 w-full max-w-[260px] border border-white/8 bg-white/[0.04] p-[3px]">
            <TabsTrigger value="paramore" className="data-[state=active]:bg-white/10">
              Paramore
            </TabsTrigger>
            <TabsTrigger value="hayley" className="data-[state=active]:bg-white/10">
              Hayley Williams
            </TabsTrigger>
          </TabsList>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
            {tab === 'paramore' ? PARAMORE_ALBUMS.length : HAYLEY_ALBUMS.length} álbuns
          </span>
        </div>
        <TabsContent value="paramore" className="mt-4">
          <AlbumGrid albums={PARAMORE_ALBUMS} value={value} onChange={onChange} />
        </TabsContent>
        <TabsContent value="hayley" className="mt-4">
          <AlbumGrid albums={HAYLEY_ALBUMS} value={value} onChange={onChange} />
        </TabsContent>
      </Tabs>

      {selected && (
        <div className="flex items-start gap-2.5 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2.5">
          <span
            className="mt-1 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: selected.palette.accent }}
          />
          <p className="text-xs leading-relaxed text-white/55">
            <span className="font-medium text-white/85">
              {selected.title} · {selected.year}
            </span>{' '}
            — {selected.tagline}
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-white/30">
              {ARTIST_LABEL[selected.artist]}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
