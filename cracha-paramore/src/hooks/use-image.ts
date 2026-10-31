import { useEffect, useState } from 'react'

export function useImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }

    let active = true
    const next = new Image()
    next.decoding = 'async'
    next.onload = () => {
      if (active) setImage(next)
    }
    next.onerror = () => {
      if (active) setImage(null)
    }
    next.src = src

    return () => {
      active = false
      next.onload = null
      next.onerror = null
    }
  }, [src])

  return image
}
