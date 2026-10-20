import { Section } from '../components/layout'
import { CountUp } from '../components/motion/CountUp'
import { Floaters } from '../components/motion/Floaters'
import { Reveal } from '../components/motion/Reveal'
import { Hand, Tape } from '../components/primitives'
import { QuizStepper } from '../components/QuizStepper'
import { FRASES_FRANCES, PERGUNTAS_FRANCES } from '../data/frances'
import './FrancesSection.css'

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Duo de boina: uma versão com o chapéu francês */
function Duo({ size = 86 }: { size?: number }) {
  return (
    <svg
      className="fr-duo__owl"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      focusable="false"
    >
      <ellipse cx="23" cy="66" rx="12" ry="23" fill="#4cad00" stroke="var(--ink)" strokeWidth="3" transform="rotate(12 23 66)" />
      <ellipse cx="97" cy="66" rx="12" ry="23" fill="#4cad00" stroke="var(--ink)" strokeWidth="3" transform="rotate(-12 97 66)" />
      <path d="M45 103v7m-6 0h12M75 103v7m-6 0h12" fill="none" stroke="#ff9600" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M60 17c-22 0-34 16-34 38 0 26 16 45 34 45s34-19 34-45c0-22-12-38-34-38Z"
        fill="#58cc02"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <path
        d="M60 58c-12 0-21 9-21 22 0 13 9 21 21 21s21-8 21-21c0-13-9-22-21-22Z"
        fill="#89e219"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <circle cx="43" cy="48" r="17" fill="var(--white)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="77" cy="48" r="17" fill="var(--white)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="46" cy="50" r="7" fill="var(--ink)" />
      <circle cx="74" cy="50" r="7" fill="var(--ink)" />
      <circle cx="48" cy="47" r="2" fill="var(--white)" />
      <circle cx="72" cy="47" r="2" fill="var(--white)" />
      <path d="M51 64h18l-9 12Z" fill="#ff9600" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path
        d="M29 31C28 19 40 8 60 8s32 11 31 23c-9-5-20-7-31-7s-22 2-31 7Z"
        fill="var(--red-500)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <path d="M59 8c0-4 2-6 4-7" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M41 20c5-3 11-5 19-5" fill="none" stroke="var(--white)" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

function Flame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M13.4 2c.7 4.1-1.5 6-3.4 7.9-1.6 1.6-3 3.3-3 5.6A5.6 5.6 0 0 0 12.6 21c3.1 0 5.6-2.3 5.6-5.7 0-2.2-.9-4-1.9-5.5-.4-.6-.9-1.2-1.3-1.8-.8-1.1-1.5-2.2-1.5-3.5 0-1 .1-1.9.5-3Z"
        fill="var(--orange-500)"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 11.8c.3 2-1 3.1-1.7 4.2-.6.8-1 1.5-1 2.4a2.8 2.8 0 0 0 5.6 0c0-1.3-.6-2.4-1.3-3.5-.6-.9-1.2-1.9-1.6-3.1Z"
        fill="var(--orange-300)"
      />
    </svg>
  )
}

function FlagFr() {
  return (
    <svg className="fr__flag" viewBox="0 0 30 20" aria-hidden focusable="false">
      <rect width="10" height="20" fill="#0055a4" />
      <rect x="10" width="10" height="20" fill="var(--white)" />
      <rect x="20" width="10" height="20" fill="var(--red-500)" />
    </svg>
  )
}

function StreakCard() {
  return (
    <article className="fr-duo">
      <Tape position="top" tone="orange" />
      <header className="fr-duo__brand">
        <Duo />
        <span className="fr-duo__wordmark">duolingo</span>
        <span className="fr-duo__flag-wrap">
          <FlagFr />
        </span>
      </header>

      <p className="fr-duo__bubble">bonjour, helena!</p>

      <div className="fr-duo__streak">
        <span className="fr-duo__flame">
          <Flame />
        </span>
        <div className="fr-duo__streak-text">
          <p className="fr-duo__number">
            <CountUp value="500" />
            <span className="fr-duo__plus">+</span>
          </p>
          <p className="fr-duo__label">dias de ofensiva</p>
          <p className="fr-duo__sub">no francês, e contando</p>
        </div>
      </div>

      <div className="fr-duo__week" role="img" aria-label="Sete dias de ofensiva nesta semana">
        {SEMANA.map((dia, i) => (
          <span
            key={i}
            className={i === SEMANA.length - 1 ? 'fr-duo__day is-today' : 'fr-duo__day is-done'}
            aria-hidden
          >
            {i === SEMANA.length - 1 ? <Flame className="fr-duo__check-icon" /> : <span className="fr-duo__check">✓</span>}
            <span className="fr-duo__day-label">{dia}</span>
          </span>
        ))}
      </div>

      <div className="fr-duo__bar" aria-hidden>
        <span />
      </div>
      <div className="fr-duo__bar-label">
        <span>7 de 7 dias</span>
        <span>ofensiva perfeita</span>
      </div>

      <p className="fr-duo__note">a ofensiva não quebra nem no aniversário</p>
    </article>
  )
}

function PhraseBook() {
  return (
    <article className="fr-book">
      <header className="fr-book__head">
        <span className="fr-book__flag">
          <FlagFr />
        </span>
        <div>
          <p className="fr-book__eyebrow">o francês que ela já domina</p>
          <h3 className="fr-book__title">Vocabulaire de survie</h3>
        </div>
      </header>

      <ul className="fr-book__list">
        {FRASES_FRANCES.map((frase, i) => (
          <li key={frase.fr} className={frase.highlight ? 'is-highlight' : undefined}>
            <span className="fr-book__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="fr-book__fr">
              {frase.fr}
              <span className="fr-book__pron">{frase.pron}</span>
            </span>
            <span className="fr-book__pt">{frase.pt}</span>
            <span className="fr-book__check" aria-hidden>
              {frase.highlight ? '♥' : '✓'}
            </span>
          </li>
        ))}
      </ul>

      <p className="fr-book__note">pronúncia aproximada, sem julgamentos</p>
    </article>
  )
}

function verdictFrances(score: number, total: number) {
  if (score === total) return 'Magnifique! O Duo soltou fogos.'
  if (score >= total - 1) return 'Très bien! Quase fluente.'
  if (score >= total / 2) return 'Pas mal. Já dá pra pedir um croissant.'
  return 'Oh là là. O Duo quer uma conversa.'
}

export function FrancesSection() {
  return (
    <Section
      id="frances"
      full
      tone="paper"
      eyebrow="Duolingo · leçon 500"
      title={
        <>
          Ofensiva
          <br />
          <span className="accent">francesa</span>
        </>
      }
      subtitle="Mais de 500 dias de francês no Duolingo. A ofensiva não quebra, e a constância já é fluente."
      decor={
        <Floaters
          icons={['spark', 'star', 'heart', 'bow']}
          colors={['#58cc02', '#0055a4', 'var(--pink-300)', 'var(--orange-500)']}
          count={12}
          seed={42}
        />
      }
    >
      <div className="fr">
        <div className="fr__row">
          <Reveal variant="left">
            <StreakCard />
          </Reveal>
          <Reveal variant="right" delay={0.08}>
            <PhraseBook />
          </Reveal>
        </div>

        <Reveal variant="up" delay={0.1}>
          <div className="fr__quiz">
            <div className="fr__quiz-head">
              <h3 className="fr__quiz-title">Quiz de la France</h3>
              <Hand color="var(--ink-soft)">5 perguntas sorteadas. O Duo está observando.</Hand>
            </div>
            <QuizStepper
              bank={PERGUNTAS_FRANCES}
              count={5}
              verdict={verdictFrances}
              showGif={false}
            />
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
