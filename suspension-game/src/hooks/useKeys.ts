import { useEffect, useRef } from 'react'

/** Guarda o conjunto de teclas pressionadas num ref (não re-renderiza). */
export function useKeys() {
  const keys = useRef(new Set<string>())
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault()
      keys.current.add(e.key)
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
  return keys
}
