import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { ALBUMS, type Album } from '@/lib/albums'
import { applyPersistedTheme, applyTheme } from '@/lib/theme'

interface Slot {
  album: Album
  x: number
  y: number
  size: number
  rotate: number
  depth: number
  float: number
  z: number
}

const SLOTS: Slot[] = [
  { album: ALBUMS[0], x: 0, y: 6, size: 148, rotate: -10, depth: 20, float: 14, z: 10 },
  { album: ALBUMS[1], x: 56, y: 12, size: 172, rotate: 8, depth: 34, float: 10, z: 20 },
  { album: ALBUMS[2], x: 18, y: 60, size: 150, rotate: 5, depth: 26, float: 16, z: 25 },
  { album: ALBUMS[3], x: 58, y: 68, size: 132, rotate: 12, depth: 24, float: 12, z: 15 },
  { album: ALBUMS[4], x: 34, y: 32, size: 140, rotate: -14, depth: 42, float: 18, z: 30 },
  { album: ALBUMS[5], x: 6, y: 36, size: 136, rotate: 4, depth: 30, float: 9, z: 12 },
]

function FloatingCard({
  slot,
  index,
  mx,
  my,
}: {
  slot: Slot
  index: number
  mx: MotionValue<number>
  my: MotionValue<number>
}) {
  const { album, depth, rotate, size, float, z } = slot
  const x = useTransform(mx, [-0.5, 0.5], [depth, -depth])
  const y = useTransform(my, [-0.5, 0.5], [depth, -depth])
  const rot = useTransform(mx, [-0.5, 0.5], [rotate - 8, rotate + 8])
  const accent = album.colors[0].hex

  return (
    <motion.div
      style={{ x, y, rotate: rot, zIndex: z, left: `${slot.x}%`, top: `${slot.y}%` }}
      className="absolute"
    >
      <motion.div
        animate={{ y: [0, -float, 0] }}
        transition={{
          repeat: Infinity,
          duration: float * 0.9 + 3,
          repeatType: 'mirror',
          delay: index * 0.7,
          ease: 'easeInOut',
        }}
      >
        <Link
          to={`/discos/${album.id}`}
          onMouseEnter={() => applyTheme(album.theme)}
          onMouseLeave={() => applyPersistedTheme()}
          className="group block"
          style={{ width: size }}
        >
          <div
            className="relative overflow-hidden rounded-lg border border-line-2 bg-surface-2 p-1.5 transition-transform duration-200 group-hover:-translate-y-1.5 group-hover:scale-[1.04]"
            style={{
              boxShadow: `0 14px 34px -10px color-mix(in srgb, ${accent} 60%, #000)`,
            }}
          >
            <img
              src={album.image}
              alt={`Capa de ${album.name}`}
              loading="lazy"
              className="aspect-square w-full rounded-md object-cover"
            />
            <div className="absolute inset-1.5 flex flex-col items-start justify-end rounded-md bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="font-display text-sm font-bold leading-tight text-white">
                {album.shortName}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/70">
                {album.year}
              </p>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}

export default function FloatingAlbums() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smx = useSpring(mx, { stiffness: 60, damping: 18 })
  const smy = useSpring(my, { stiffness: 60, damping: 18 })

  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const leave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <div
      onMouseMove={move}
      onMouseLeave={leave}
      className="relative mx-auto aspect-square hidden w-full max-w-[480px] select-none lg:block"
      aria-label="Álbuns flutuantes — passe o mouse para ver os temas"
    >
      <div
        className="pb-dots absolute inset-0 rounded-full border border-dashed border-line-1 opacity-50"
        aria-hidden="true"
      />
      <div className="absolute inset-[18%] rounded-full border border-line-1" aria-hidden="true" />
      {SLOTS.map((slot, i) => (
        <FloatingCard key={slot.album.id} slot={slot} index={i} mx={smx} my={smy} />
      ))}
    </div>
  )
}