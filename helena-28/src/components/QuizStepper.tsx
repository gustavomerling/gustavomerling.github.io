import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Pergunta } from '../data/quiz'
import { GIFS } from '../data/gifs'
import { QuizCard } from './cards'
import { GifCard } from './GifCard'
import { Burst } from './intro/Burst'
import { Button, Ransom } from './primitives'
import './QuizStepper.css'

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Sorteia as perguntas e embaralha as opções de cada uma
function draw(bank: Pergunta[], count: number) {
  return shuffle(bank)
    .slice(0, count)
    .map((p) => {
      const options = shuffle(p.options)
      return { ...p, options, answerIndex: options.indexOf(p.answer) }
    })
}

function verdict(score: number, total: number) {
  if (score === total) return 'Gabaritou. Diva!'
  if (score >= total - 1) return 'Quase lá. Conhece bem a Helena.'
  if (score >= total / 2) return 'Dá pra melhorar. Assiste mais filme de bruxa com ela.'
  return 'Fizeram piada do seu mousse.'
}

type QuizStepperProps = {
  bank: Pergunta[]
  /** Quantas perguntas por partida */
  count?: number
}

/** Quiz por etapas: uma pergunta por vez, placar no fim */
export function QuizStepper({ bank, count = 5 }: QuizStepperProps) {
  const [round, setRound] = useState(() => draw(bank, count))
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  // acerto = confete; erro = card sacode
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const finished = step >= round.length
  const current = round[step]

  function next() {
    setStep((s) => s + 1)
    setAnswered(false)
    setFeedback(null)
  }

  function restart() {
    setRound(draw(bank, count))
    setStep(0)
    setScore(0)
    setAnswered(false)
    setFeedback(null)
  }

  return (
    <div className="quiz-stepper">
      <div className="quiz-stepper__progress" aria-hidden>
        {round.map((_, i) => (
          <span key={i} className={i < step || (i === step && answered) ? 'is-done' : i === step ? 'is-current' : ''} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {finished ? (
          <motion.div
            key="result"
            className="quiz-stepper__result card"
            role="status"
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            {score >= round.length - 1 && <Burst local counts={{ confetti: 40, dots: 10, icons: 12, butterflies: 6 }} />}
            <p className="quiz-stepper__score">
              <Ransom text={`${score} DE ${round.length}`} play />
            </p>
            <p className="quiz__reveal">{verdict(score, round.length)}</p>
            {/* a Taylor reage ao placar */}
            <GifCard
              gif={score >= round.length / 2 ? GIFS.me : GIFS.whyMad}
              rotate={score >= round.length / 2 ? 2 : -2}
              className="quiz-stepper__gif"
            />
            <Button onClick={restart}>Jogar de novo</Button>
          </motion.div>
        ) : (
          // cada pergunta entra pela direita e sai pela esquerda, como cartas
          <motion.div
            key={`${step}-${current.question}`}
            className="quiz-stepper__stage"
            initial={{ opacity: 0, x: 90, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -90, rotate: -5 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <p className="quiz-stepper__count">
              Pergunta {step + 1} de {round.length}
            </p>
            <motion.div
              className="quiz-stepper__card"
              animate={feedback === 'wrong' ? { x: [0, -14, 12, -8, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.45 }}
            >
              {feedback === 'correct' && <Burst local counts={{ confetti: 26, dots: 8, icons: 8, butterflies: 0 }} />}
              <QuizCard
                question={current.question}
                options={current.options}
                answer={current.answerIndex}
                reveal={current.reveal}
                onAnswer={(correct) => {
                  setAnswered(true)
                  setFeedback(correct ? 'correct' : 'wrong')
                  if (correct) setScore((s) => s + 1)
                }}
              />
            </motion.div>
            {answered && (
              <motion.div
                className="quiz-stepper__next"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button variant="dark" onClick={next}>
                  {step + 1 < round.length ? 'Próxima pergunta →' : 'Ver resultado'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
