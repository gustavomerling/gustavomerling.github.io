import { useState } from 'react'
import { Icon } from '../icons'
import { Butterfly } from './Butterfly'
import { makeParticles } from './particles'
import './Burst.css'

type BurstProps = {
  /** Explode dentro do elemento pai (position: relative), e não no centro da tela */
  local?: boolean
  /** Quantidades; o padrão é a explosão grande da abertura */
  counts?: Parameters<typeof makeParticles>[0]
}

/** Explosão de confete, ícones e borboletas. Dispara ao montar */
export function Burst({ local, counts }: BurstProps) {
  const [particles] = useState(() => makeParticles(counts))

  return (
    <div className={local ? 'burst burst--local' : 'burst'} aria-hidden>
      {particles.map((p, i) => (
        <span key={i} className={`particle particle--${p.kind}`} style={p.style}>
          {p.kind === 'confetti' && <span className="particle__shape" style={{ background: p.color, width: p.size * 0.6, height: p.size }} />}
          {p.kind === 'dot' && <span className="particle__shape" style={{ background: p.color, width: p.size, height: p.size }} />}
          {p.kind === 'icon' && p.icon && <Icon name={p.icon} size={p.size} color={p.color} />}
          {p.kind === 'butterfly' && <Butterfly size={p.size} color={p.color} />}
        </span>
      ))}
    </div>
  )
}
