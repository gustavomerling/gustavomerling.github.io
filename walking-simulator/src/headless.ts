// Teste headless (sem navegador): simula a criatura inicial com cérebros aleatórios e confere
// estabilidade da física, efeito dos músculos e determinismo. Rodar com `npm run headless`.
import { brainController, createBrainFor } from './brain/controller'
import { defaultModel } from './editor/defaultModel'
import { groundYFor, toWorld } from './editor/model'
import { FIXED_DT, type World } from './physics/world'
import { createRng } from './utils/rng'

// Igual ao editor: chão logo abaixo do ponto mais baixo da criatura.
const GROUND_Y = groundYFor(defaultModel)
const STEPS = 60 * 10

type Result = { dx: number; maxCoord: number; maxBoneError: number; nan: boolean; avgAbsActivation: number; sideGap: number }

function centerX(world: World): number {
  return world.particles.reduce((sum, p) => sum + p.pos.x, 0) / world.particles.length
}

function run(seed: number, brainOn: boolean): Result {
  const { world } = toWorld(defaultModel, GROUND_Y)
  if (brainOn) world.controller = brainController(createBrainFor(world, createRng(seed)))
  const x0 = centerX(world)
  let maxCoord = 0
  let maxBoneError = 0
  let activationSum = 0
  // Diferença média de ativação entre os exemplares de trás e da frente de cada músculo (pares consecutivos).
  let sideGapSum = 0
  for (let s = 0; s < STEPS; s++) {
    world.step(FIXED_DT)
    for (const p of world.particles) maxCoord = Math.max(maxCoord, Math.abs(p.pos.x), Math.abs(p.pos.y))
    for (const b of world.bones) {
      const d = Math.hypot(b.b.pos.x - b.a.pos.x, b.b.pos.y - b.a.pos.y)
      maxBoneError = Math.max(maxBoneError, Math.abs(d - b.restLength) / b.restLength)
    }
    for (const m of world.muscles) activationSum += Math.abs(m.activation)
    for (let i = 0; i + 1 < world.muscles.length; i += 2) sideGapSum += Math.abs(world.muscles[i].activation - world.muscles[i + 1].activation)
  }
  const nan = world.particles.some((p) => !Number.isFinite(p.pos.x) || !Number.isFinite(p.pos.y))
  return { dx: centerX(world) - x0, maxCoord, maxBoneError, nan, avgAbsActivation: activationSum / STEPS / Math.max(1, world.muscles.length), sideGap: sideGapSum / STEPS / Math.max(1, world.muscles.length / 2) }
}

const failures: string[] = []
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${label}`)
  if (!ok) failures.push(label)
}

const { world } = toWorld(defaultModel, GROUND_Y)
console.log(
  `Criatura: ${world.particles.length} partículas, ${world.bones.length} ossos, ${world.muscles.length} músculos (${defaultModel.muscles.length} lógicos)`,
)
check(world.muscles.length === defaultModel.muscles.length * 2, `os ${defaultModel.muscles.length} músculos de perna viram ${defaultModel.muscles.length * 2} (frente e trás)`)

const passive = run(0, false)
console.log(`Sem cérebro: dx=${passive.dx.toFixed(1)}px, erro máx. de osso=${(passive.maxBoneError * 100).toFixed(1)}%`)
check(!passive.nan && passive.maxCoord < 5000, 'sem cérebro: sem NaN nem explosão')

const seeds = Array.from({ length: 30 }, (_, i) => i + 1)
const results = seeds.map((s) => run(s, true))
const exploded = results.filter((r) => r.nan || r.maxCoord > 5000).length
const worstBone = Math.max(...results.map((r) => r.maxBoneError))
const dxs = results.map((r) => r.dx).sort((a, b) => a - b)
const avgAct = results.reduce((s, r) => s + r.avgAbsActivation, 0) / results.length
const avgGap = results.reduce((s, r) => s + r.sideGap, 0) / results.length
console.log(
  `30 cérebros aleatórios: dx min=${dxs[0].toFixed(0)} mediana=${dxs[15].toFixed(0)} máx=${dxs[29].toFixed(0)}px; ` +
    `erro máx. de osso=${(worstBone * 100).toFixed(1)}%; ativação média=${avgAct.toFixed(2)}; diferença frente/trás=${avgGap.toFixed(2)}`,
)
check(exploded === 0, 'nenhum cérebro aleatório explode a física')
check(worstBone < 0.15, 'ossos mantêm o comprimento (erro < 15%)')
check(avgAct > 0.1, 'o cérebro gera sinais nos músculos')
check(avgGap > 0.05, 'exemplares da frente e de trás recebem sinais diferentes')
check(dxs[29] - dxs[0] > 20, 'cérebros diferentes produzem comportamentos diferentes')

const a = run(7, true)
const b = run(7, true)
check(a.dx === b.dx, 'mesma semente, mesmo resultado (determinismo)')

if (failures.length > 0) {
  console.log(`\n${failures.length} verificação(ões) falharam`)
  throw new Error("verificações falharam")
}
console.log('\nTudo certo')
