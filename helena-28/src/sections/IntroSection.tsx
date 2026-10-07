import { useEffect, useState } from 'react'
import { Burst } from '../components/intro/Burst'
import { GreetingCard } from '../components/intro/GreetingCard'
import './IntroSection.css'

type Stage = 'closed' | 'opening' | 'leaving' | 'done'

// Quanto tempo cada etapa dura antes de passar para a próxima (ms)
// 1s da capa girando + 2s parado aberto
const OPENING_MS = 3000
const LEAVING_MS = 700
const BURST_MS = 7000

type IntroSectionProps = {
  /** Chamado quando o cartão começa a sair (a página aparece) */
  onReveal?: () => void
}

/**
 * Abertura da LP: cartão fechado por cima da página.
 * Ao clicar, a capa abre, as partículas explodem e o cartão sai, revelando a página.
 */
export function IntroSection({ onReveal }: IntroSectionProps) {
  const [stage, setStage] = useState<Stage>('closed')
  const [bursting, setBursting] = useState(false)

  // Avança as etapas automaticamente depois do clique
  useEffect(() => {
    if (stage === 'opening') {
      const id = setTimeout(() => setStage('leaving'), OPENING_MS)
      return () => clearTimeout(id)
    }
    if (stage === 'leaving') {
      onReveal?.()
      const id = setTimeout(() => setStage('done'), LEAVING_MS)
      return () => clearTimeout(id)
    }
  }, [stage, onReveal])

  // As partículas continuam voando por cima da página depois que o cartão sai
  useEffect(() => {
    if (!bursting) return
    const id = setTimeout(() => setBursting(false), BURST_MS)
    return () => clearTimeout(id)
  }, [bursting])

  // Sem rolagem enquanto o cartão está na tela
  useEffect(() => {
    if (stage === 'done') return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [stage])

  function open() {
    setStage('opening')
    setBursting(true)
  }

  return (
    <>
      {stage !== 'done' && (
        <div className={`intro ${stage === 'leaving' ? 'is-leaving' : ''}`}>
          <GreetingCard stage={stage} onOpen={open} />
        </div>
      )}
      {bursting && <Burst />}
    </>
  )
}
