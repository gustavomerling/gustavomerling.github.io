import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/** Conta de 0 até o número quando aparece na tela. Aceita "1.673" (formato pt-BR) */
export function CountUp({ value, duration = 1.8 }: { value: string; duration?: number }) {
  const target = Number(value.replace(/\D/g, ''))
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!inView || reduced) return
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setCurrent(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, reduced, target, duration])

  // sem animação ("reduzir movimento"), mostra o número final direto
  const shown = reduced && inView ? target : current
  return <span ref={ref}>{shown.toLocaleString('pt-BR')}</span>
}
