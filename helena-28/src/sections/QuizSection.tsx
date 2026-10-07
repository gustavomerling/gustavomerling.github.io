import { Section } from '../components/layout'
import { QuizStepper } from '../components/QuizStepper'
import { PERGUNTAS } from '../data/quiz'

export function QuizSection() {
  return (
    <Section
      id="quiz"
      full
      center
      eyebrow="Intervalo"
      title={
        <>
          Quem conhece
          <br />
          <span className="accent">a Helena?</span>
        </>
      }
      subtitle="5 perguntas sorteadas. Sem colar."
    >
      <QuizStepper bank={PERGUNTAS} count={5} />
    </Section>
  )
}
