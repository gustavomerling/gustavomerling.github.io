import type { Album } from '@/lib/albums'
import { cn } from '@/lib/utils'

interface AlbumCoverProps {
  album: Album
  className?: string
}

export function AlbumCover({ album, className }: AlbumCoverProps) {
  return (
    <img
      src={album.cover}
      alt=""
      loading="lazy"
      decoding="async"
      className={cn('block h-full w-full object-cover', className)}
    />
  )
}
