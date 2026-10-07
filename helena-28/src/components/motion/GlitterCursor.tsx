import { useEffect } from 'react'

const COLORS = ['var(--pink-500)', 'var(--pink-300)', 'var(--orange-500)', 'var(--red-500)', 'var(--white)']
const between = (min: number, max: number) => min + Math.random() * (max - min)

/** Rastro de glitter atrás do mouse. Só com mouse e sem "reduzir movimento" */
export function GlitterCursor() {
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    const layer = document.createElement('div')
    layer.className = 'glitter-layer'
    layer.setAttribute('aria-hidden', 'true')
    document.body.appendChild(layer)

    let last = 0
    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      if (now - last < 24) return
      last = now

      const s = document.createElement('span')
      s.className = 'glitter'
      s.style.left = `${e.clientX}px`
      s.style.top = `${e.clientY}px`
      s.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)])
      s.style.setProperty('--size', `${between(7, 16)}px`)
      s.style.setProperty('--dx', `${between(-28, 28)}px`)
      s.style.setProperty('--dy', `${between(18, 60)}px`)
      s.style.setProperty('--rot', `${between(-180, 180)}deg`)
      s.addEventListener('animationend', () => s.remove())
      layer.appendChild(s)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      layer.remove()
    }
  }, [])

  return null
}
