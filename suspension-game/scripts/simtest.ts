// Teste da física sem tela: roda cada modelo pronto e imprime a trajetória.
// Uso: npx rolldown scripts/simtest.ts --platform node --format esm -o simtest.tmp.mjs && node simtest.tmp.mjs
import { Simulation, SIM_DT, type SimEvent } from '../src/game/physics/Simulation'
import { generateTerrain } from '../src/game/terrain/generate'
import { PRESETS } from '../src/game/presets'
import type { CarDesign } from '../src/game/types'

const fragile = process.argv.includes('--fragile')

function run(name: string, design: CarDesign, seconds: number, throttle: -1 | 0 | 1) {
  const sim = new Simulation(design, generateTerrain(1), { fragile, fuel: true })
  const events: SimEvent[] = []
  const log: string[] = []
  for (let i = 0; i <= seconds / SIM_DT; i++) {
    // "piloto" simples: inclina contra o ângulo do chassi
    const a = sim.chassis.getAngle()
    const tilt = a < -0.25 ? 1 : a > 0.25 ? -1 : 0
    sim.setInput({ throttle, tilt, brake: false, nitro: false })
    sim.step()
    events.push(...sim.drainEvents())
    const snap = sim.snapshot()
    if (snap.ended === 'crash' || snap.ended === 'fuel') sim.respawn()
    else if (snap.flipped) sim.rightCar()
    if (i % Math.round(2 / SIM_DT) === 0) {
      const s = sim.snapshot()
      const c = s.car.chassis
      if (!Number.isFinite(c.x)) {
        log.push('NaN!')
        break
      }
      log.push(`${(i * SIM_DT).toFixed(0)}s x${c.x.toFixed(0)} y${c.y.toFixed(1)} a${((c.angle * 180) / Math.PI).toFixed(0)}`)
    }
  }
  const s = sim.snapshot()
  const count = (t: string) => events.filter((e) => e.type === t).length
  console.log(name.padEnd(16), log.join(' | '))
  console.log(''.padEnd(16), `★${s.stars.filter(Boolean).length} carga ${s.cargoKept}/${s.cargoTotal} pts ${s.score} combustível ${(s.fuel * 100).toFixed(0)}% batidas ${count('crash')} mortais ${s.flips} voos ${count('air')} galões ${count('fuel')} pads ${count('boost') + count('jump')} respawns ${s.respawns}`)
}

for (const p of PRESETS) {
  run(p.name + ' idle', p.design, 4, 0)
  run(p.name, p.design, 30, 1)
}
