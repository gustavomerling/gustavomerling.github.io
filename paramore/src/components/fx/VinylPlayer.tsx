import { Disc3, Volume2 } from 'lucide-react'
import type { Album } from '@/lib/albums'

interface VinylPlayerProps {
  album: Album
  isPlaying?: boolean
  currentTrack?: string
  onTogglePlay?: () => void
}

export default function VinylPlayer({
  album,
  isPlaying = true,
  currentTrack,
}: VinylPlayerProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-[420px] items-center justify-center py-6 select-none">
      {/* Glow de fundo sincronizado com a cor do álbum */}
      <div
        className="pointer-events-none absolute h-64 w-64 rounded-full opacity-60 blur-3xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${album.colors[0]?.hex || 'var(--color-accent)'} 0%, transparent 75%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-center">
        {/* Capa do Álbum (Case frontal) */}
        <div
          className="group relative z-20 aspect-square w-56 sm:w-64 overflow-hidden rounded-xl border border-line-2 bg-surface-2 shadow-2xl transition-all duration-500 hover:rotate-1 hover:scale-[1.03]"
          style={{
            boxShadow: `0 20px 40px -15px color-mix(in srgb, ${album.colors[0]?.hex || '#000'} 65%, #000 35%)`,
          }}
        >
          <img
            src={album.image}
            alt={`Capa de ${album.name}`}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />

          {/* Badge Holográfico da Era */}
          <div className="absolute bottom-2.5 left-2.5 rounded-md bg-black/75 px-2 py-1 backdrop-blur-md">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
              {album.year} · {album.shortName}
            </p>
          </div>
        </div>

        {/* Disco de Vinil saindo da capa com sulcos hiper-realistas */}
        <div
          className={`absolute z-10 aspect-square w-52 sm:w-60 rounded-full border-2 border-[#18181b] bg-[#09090b] shadow-2xl transition-all duration-700 ease-out ${
            isPlaying
              ? 'translate-x-28 sm:translate-x-32 rotate-[360deg]'
              : 'translate-x-12 rotate-45'
          }`}
          style={{
            animation: isPlaying ? 'paramore-vinyl-spin 8s linear infinite' : 'none',
            boxShadow: '0 0 25px rgba(0,0,0,0.85), inset 0 0 25px rgba(0,0,0,0.9)',
          }}
        >
          {/* Sulcos do disco (Vinyl grooves) */}
          <div
            className="absolute inset-1.5 rounded-full opacity-40"
            style={{
              backgroundImage:
                'repeating-radial-gradient(circle, transparent 0, transparent 2px, rgba(255,255,255,0.06) 3px, transparent 4px)',
            }}
          />
          <div
            className="absolute inset-8 rounded-full opacity-50"
            style={{
              backgroundImage:
                'repeating-radial-gradient(circle, transparent 0, transparent 3px, rgba(255,255,255,0.08) 4px, transparent 5px)',
            }}
          />

          {/* Rótulo central do vinil */}
          <div
            className="absolute inset-0 m-auto flex size-20 items-center justify-center rounded-full border-4 border-[#121216] shadow-inner"
            style={{
              backgroundColor: album.colors[0]?.hex || '#c22626',
            }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <Disc3 className="size-5 text-white/90" />
              <span className="mt-0.5 font-display text-[8px] font-extrabold uppercase tracking-tight text-white line-clamp-1">
                {album.shortName}
              </span>
            </div>
            {/* Furo central do disco */}
            <div className="absolute size-3 rounded-full bg-[#09090b] border border-white/20" />
          </div>
        </div>
      </div>

      {/* Onda de áudio/Equalizador animado se houver faixa tocando */}
      {currentTrack && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-line-1 bg-surface-1/90 px-3.5 py-1 backdrop-blur-md shadow-lg">
          <Volume2 className="size-3.5 text-accent animate-pulse" />
          <div className="flex items-end gap-0.5 h-3">
            {[0.4, 0.9, 0.6, 1, 0.3, 0.8, 0.5, 0.7].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-accent"
                style={{
                  height: `${h * 100}%`,
                  animation: `paramore-eq-bounce 0.8s ease-in-out infinite alternate ${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] font-medium text-content-primary max-w-[130px] truncate">
            {currentTrack}
          </span>
        </div>
      )}
    </div>
  )
}
