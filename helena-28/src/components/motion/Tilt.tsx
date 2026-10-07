import { useRef, type PointerEvent, type ReactNode } from 'react'

type TiltProps = {
  children: ReactNode
  /** Inclinação máxima em graus */
  max?: number
  /** Brilho holográfico, como adesivo metalizado */
  glare?: boolean
  className?: string
}

/** Inclina em 3D seguindo o mouse (só com mouse; no toque fica parado) */
export function Tilt({ children, max = 12, glare = true, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      const px = (clientX - r.left) / r.width
      const py = (clientY - r.top) / r.height
      el.style.setProperty('--rx', `${(0.5 - py) * max}deg`)
      el.style.setProperty('--ry', `${(px - 0.5) * max}deg`)
      el.style.setProperty('--gx', `${px * 100}%`)
      el.style.setProperty('--gy', `${py * 100}%`)
      el.classList.add('is-tilting')
    })
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.classList.remove('is-tilting')
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div
      ref={ref}
      className={['tilt', glare && 'tilt--glare', className].filter(Boolean).join(' ')}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  )
}
