import { useEffect, useRef, useState } from 'react'

/** Tamanho em px de um elemento, sempre atualizado (ResizeObserver + resize da janela). */
export function useSize<T extends Element>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return [ref, size] as const
}
