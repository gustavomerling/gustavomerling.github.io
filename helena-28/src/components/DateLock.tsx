import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ABERTURA, remaining } from '../lib/time'
import { Floaters } from './motion/Floaters'
import { GlitterCursor } from './motion/GlitterCursor'
import { Eyebrow, Ransom, Sticker } from './primitives'
import './DateLock.css'

type DateLockProps = {
  children: ReactNode
  /** Data/hora em que o conteúdo libera (ISO) */
  unlockAt?: string
}

/**
 * Esconde o conteúdo até a data, mostrando uma contagem regressiva.
 * Destrava sozinho quando a hora chega.
 * Prévia (para o Gustavo testar): adicionar ?preview=1 na rota, ex.: #/?preview=1
 * Não é segurança, só protege a surpresa.
 */
export function DateLock({ children, unlockAt = ABERTURA }: DateLockProps) {
  const [params] = useSearchParams()
  const preview = params.has('preview')
  const target = new Date(unlockAt).getTime()
  const [now, setNow] = useState(() => Date.now())
  const locked = !preview && now < target

  useEffect(() => {
    if (!locked) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [locked])

  if (!locked) return children

  const { units } = remaining(target, now)

  return (
    <main className="lock">
      <GlitterCursor />
      <Floaters icons={['bow', 'ghost', 'heart', 'pumpkin', 'spark']} colors={['var(--pink-500)', 'var(--white)', 'var(--red-500)', 'var(--orange-500)']} count={16} seed={7} />

      <span className="lock__sticker">
        <Sticker tone="orange" size={120} rotate={12}>
          28!
        </Sticker>
      </span>

      <div className="lock__inner">
        <Eyebrow>Em breve · 21.10.2026</Eyebrow>
        <h1 className="lock__title">
          <Ransom text="AINDA NÃO" play />
        </h1>

        <div className="lock__count" role="timer" aria-label="Tempo até a abertura">
          {units.map((u, i) => (
            <div key={u.label} className="lock__unit">
              <span className="lock__value">
                <Ransom text={String(u.value).padStart(2, '0')} seed={i * 3 + 1} byChar />
              </span>
              <span className="lock__label">{u.label}</span>
            </div>
          ))}
        </div>

        <p className="lock__text">
          Esse presente só abre no dia 21 de outubro.
          <br />
          Até lá, nada de espiar, diva.
        </p>
      </div>
    </main>
  )
}
