import { useEffect, useState } from 'react'
import { preloadAlbumCovers } from '@/lib/album-covers'

export function useAlbumCoversReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    preloadAlbumCovers().then(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  return ready
}
