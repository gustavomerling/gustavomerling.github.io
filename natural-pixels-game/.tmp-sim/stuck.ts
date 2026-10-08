import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { generateWorld } from '../src/engine/worldgen.ts'
import { ELEMENTS, elementIndex } from '../src/elements/registry.ts'
import { createRandom } from '../src/engine/random.ts'
import { planHouse, nextHouse } from '../src/elements/animals/human/tasks/build.ts'
import { Body } from '../src/elements/animals/human/body.ts'

const W = 360, H = 200
const grid = new Grid(W, H)
const sim = new Simulation(grid)
generateWorld(grid, createRandom(5))
const human = elementIndex('human')
let hx = 150
for (let y = 0; y < H; y++) { if (grid.type[y * W + hx] !== 0 && ELEMENTS[grid.type[y * W + hx]].id !== 'cloud') { grid.place((y - 1) * W + hx, human); break } }
const find = () => { for (let i = 0; i < grid.size; i++) if (grid.type[i] === human) return { x: i % W, y: Math.floor(i / W), i }; return null }
const mindOf = () => { const p = find()!; return sim.memory.get(grid.life[p.i]) as any }
const C: Record<string, string> = { air: ' ', soil: '#', stone: 'S', sand: '.', water: '~', grass: '"', wood: '|', leaf: '*', plank: 'P', backwall: 'b', bed: 'B', lamp: 'L', human: 'H', human_body: 'H', human_head: 'O', ladder: 'l', glass: 'g', fence: 'f', wheat: 'w', wheat_ripe: 'W', cloud: 'c' }
const pic = (cx: number, cy: number, w = 30, h = 14) => { for (let y = cy - h; y <= cy + 3; y++) { let r = ''; for (let x = cx - w; x <= cx + w; x++) r += C[ELEMENTS[grid.type[y * W + x]]?.id ?? 'air'] ?? '?'; console.log(r) } }
let stuckLog = 0
for (let t = 1; t <= 3600 * 8; t++) {
  sim.step()
  if (t % 30) continue
  const m = mindOf(); const p = find()!
  if (m.stuck >= 12 && stuckLog < 6 && t > 3600) { stuckLog++; console.log(`t=${(t/60).toFixed(0)}s task=${m.task} phase=${m.phase} at ${p.x},${p.y} target`, m.target, 'home', m.home); pic(p.x, p.y, 20, 8) }
}
const m = mindOf(); console.log('home', m.home, 'inv', m.inv, 'farm', m.farm)
const p = find()!
// Why no upgrade?
const ctxLike: any = (sim as any).ctx; ctxLike.bind(p.x, p.y)
const body = new Body(ctxLike, m)
const next = nextHouse(body); console.log('next', next, next && planHouse(body, next))
pic(m.home.x, m.home.ground, 30, 14)
const ids = new Map<string, number>()
for (let y = m.home.ground - 14; y <= m.home.ground; y++) for (let x = m.home.x - 12; x <= m.home.x + 12; x++) { const id = ELEMENTS[grid.type[y * W + x]].id; ids.set(id, (ids.get(id) ?? 0) + 1) }
console.log([...ids])
