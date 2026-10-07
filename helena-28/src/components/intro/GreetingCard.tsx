import { Icon } from '../icons'
import { Ransom, Sticker, Tape } from '../primitives'
import './GreetingCard.css'

export type CardStage = 'closed' | 'opening' | 'leaving'

type GreetingCardProps = {
  stage: CardStage
  onOpen: () => void
}

/** Cartão fechado que chega flutuando e abre a capa no clique */
export function GreetingCard({ stage, onOpen }: GreetingCardProps) {
  const open = stage !== 'closed'

  return (
    <div className={`gcard-enter ${stage === 'leaving' ? 'is-leaving' : ''}`}>
      <div className="gcard-float">
        <button
          type="button"
          className={`gcard ${open ? 'is-open' : ''}`}
          onClick={onOpen}
          disabled={open}
          aria-label="Abrir o cartão de aniversário"
        >
          <div className="gcard__inside">
            <span className="eyebrow">21.10.2026</span>
            <span className="gcard__inside-title">
              <Ransom text="FELIZ 28" seed={2} />
            </span>
            <span className="hand">Helena!</span>
          </div>

          <div className="gcard__cover">
            <div className="gcard__face gcard__face--front">
              <Tape position="top" tone="orange" />
              <span className="gcard__bow">
                <Icon name="bow" size={64} color="var(--red-500)" />
              </span>
              <span className="gcard__sticker">
                <Sticker tone="orange" size={92} rotate={14}>
                  28!
                </Sticker>
              </span>
              <span className="gcard__ghost">
                <Icon name="ghost" size={44} color="var(--white)" />
              </span>
              <span className="gcard__heart">
                <Icon name="heart" size={30} color="var(--red-500)" />
              </span>

              <div className="gcard__title">
                <span className="gcard__to">para</span>
                <Ransom text="HELENA" />
              </div>
              <span className="gcard__cta">Clique para abrir</span>
            </div>
            <div className="gcard__face gcard__face--back" />
          </div>
        </button>
      </div>
    </div>
  )
}
