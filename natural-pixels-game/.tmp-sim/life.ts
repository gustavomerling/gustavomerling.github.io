import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { generateWorld } from '../src/engine/worldgen.ts'
import { ELEMENTS, elementIndex } from '../src/elements/registry.ts'
import { createRandom } from '../src/engine/random.ts'

const W = 360, H = 200
const grid = new Grid(W, H)
const sim = new Simulation(grid)
generateWorld(grid, createRandom(Number(process.argv[2] ?? 5)))
const human = elementIndex('human')
// Drop a human on the ground in the middle-ish, on a flat grass spot.
for (const hx of [150, 200]) for (let y = 0; y < H; y++) { if (grid.type[y * W + hx] !== 0 && ELEMENTS[grid.type[y * W + hx]].id !== 'cloud') { grid.place((y - 1) * W + hx, human); break } }
const count = (id: string) => { const t = elementIndex(id); let n = 0; for (let i = 0; i < grid.size; i++) if (grid.type[i] === t) n++; return n }
const humans = () => { const out: { x: number; y: number }[] = []; for (let i = 0; i < grid.size; i++) if (grid.type[i] === human) out.push({ x: i % W, y: Math.floor(i / W) }); return out }
const minutes = Number(process.argv[3] ?? 12)
let t0 = performance.now(), rainTicks = 0, strikes = 0, maxZ = 0, shots = 0
const seen = new Map<string, number>()
for (let t = 1; t <= minutes * 3600; t++) {
  sim.step()
  if (sim.weather.rain > 0) rainTicks++
  if (sim.weather.flash > 0.99) strikes++
  if (t % 30 === 0) { maxZ = Math.max(maxZ, count('zombie')); shots += count('shot') }
  if (t % 60 === 0) for (const p of humans()) { const th = sim.thoughtAt(p.x, p.y)!; const k = th.text.replace(/\d+%/, '%'); seen.set(k, (seen.get(k) ?? 0) + 1) }
  if (t % (3600 * 2) === 0) {
    console.log(`--- ${t / 3600} min (${((performance.now() - t0) / t).toFixed(2)} ms/tick) rain so far ${(rainTicks / t * 100).toFixed(1)}% strikes ${strikes} maxZombies ${maxZ} shotCells ${shots}`)
    for (const p of humans()) console.log('  ', sim.describeCell(p.x, p.y), '|', sim.thoughtAt(p.x, p.y)!.text)
    console.log('   wheat', count('wheat'), 'ripe', count('wheat_ripe'), 'fence', count('fence'), 'backwall', count('backwall'), 'ladder', count('ladder'), 'bed', count('bed'), 'rabbits', count('rabbit'), 'flowers', count('flower'), 'mushrooms', count('mushroom'), 'fireflies', count('firefly'), 'bees', count('bee'), 'water', count('water'), 'fire', count('fire'), 'zombies', count('zombie'), 'doors', count('door'), 'humans', humans().length, 'gunpowder', count('gunpowder'))
  }
}
console.log([...seen].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}× ${k}`).join('\n'))
