// Teste headless da neuroevolução: o melhor indivíduo deve andar mais longe após algumas gerações.
// Rodar com `npm run headless:evolution`.
import { defaultModel } from './editor/defaultModel'
import { groundYFor } from './editor/model'
import { Evolution } from './evolution/population'

const GENERATIONS = Number(30)
const groundY = groundYFor(defaultModel)
const evo = new Evolution(defaultModel, groundY, { seed: 3, populationSize: 60 })

const t0 = Date.now()
for (let g = 0; g < GENERATIONS; g++) {
  const s = evo.step()
  if (g === 0 || (g + 1) % 5 === 0) {
    console.log(
      `ger ${String(s.generation).padStart(3)}: melhor=${s.best.toFixed(0).padStart(5)} média=${s.mean.toFixed(0).padStart(5)} ` +
        `dist=${s.bestScore.distance.toFixed(0)}px queda=${(s.bestScore.fall * 100).toFixed(0)}% esforço=${s.bestScore.effort.toFixed(2)}`,
    )
  }
}
console.log(`${GENERATIONS} gerações em ${((Date.now() - t0) / 1000).toFixed(1)}s`)

const first = evo.history[0]
const last = evo.history[evo.history.length - 1]
const bestEver = Math.max(...evo.history.map((h) => h.best))
const ok = (cond: boolean, label: string) => console.log(`${cond ? 'OK  ' : 'FALHA'} ${label}`)
ok(last.best > first.best, `melhor da última geração (${last.best.toFixed(0)}) > primeira (${first.best.toFixed(0)})`)
ok(last.mean > first.mean, `média da última geração (${last.mean.toFixed(0)}) > primeira (${first.mean.toFixed(0)})`)
ok(bestEver > 150, `algum indivíduo andou mais de 150 px (melhor: ${bestEver.toFixed(0)})`)
ok(last.bestScore.fall < 0.5, `melhor indivíduo não passa metade do tempo caído (${(last.bestScore.fall * 100).toFixed(0)}%)`)
