import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { ELEMENTS, elementIndex } from '../src/elements/registry.ts'
const W = 220, H = 110
const grid = new Grid(W, H)
const sim = new Simulation(grid)
sim.weather.enabled = false
sim.dayCycle = false
const soil = elementIndex('soil'), human = elementIndex('human'), stone = elementIndex('stone'), grass = elementIndex('grass')
for (let y = 90; y < H; y++) for (let x = 0; x < W; x++) grid.place(y * W + x, y > 100 ? stone : soil, 120)
for (let x = 0; x < W; x++) grid.place(89 * W + x, grass, 0, 1)
for (let x = 20; x < 30; x++) for (let y = 84; y < 89; y++) grid.place(y * W + x, stone)
grid.place(88 * W + 110, human)
sim.step()
const m = sim.memory.get(grid.life[grid.type.indexOf(human)]) as any
m.inv.plank = 400; m.inv.stone = 60; m.tools = { pickaxe: 2, axe: 2, bucket: true, sword: 1, gun: false }; m.inv.grain = 4; m.inv.food = 10
const C: Record<string, string> = { air: ' ', soil: '#', stone: 'S', grass: '"', plank: 'P', backwall: '.', bed: 'B', lamp: 'L', human: 'H', human_body: 'H', human_torch: 'T', human_head: 'o', ladder: '=', glass: 'g', door: 'D', fence: 'f', wheat: 'w', wheat_ripe: 'W', water: '~' }
const humans = () => { const o: any[] = []; for (let i = 0; i < grid.size; i++) if (grid.type[i] === human) o.push({ x: i % W, y: Math.floor(i / W), m: sim.memory.get(grid.life[i]) }); return o }
let lastStage = 0
for (let t = 1; t <= 3600 * 6; t++) {
  sim.step()
  if (t % 600) continue
  const hs = humans()
  const stage = m.home?.stage ?? 0
  const line = hs.map((h) => `${h.m.name}@${h.x},${h.y} ${sim.thoughtAt(h.x, h.y)!.text}`).join(' | ')
  console.log(`${(t / 60).toFixed(0)}s stage ${stage} planks ${m.inv.plank} stone ${m.inv.stone} | ${line}`)
  if (stage !== lastStage && m.home) {
    lastStage = stage
    for (let y = m.home.ground - 20; y <= m.home.ground + 1; y++) { let r = ''; for (let x = m.home.x - 30; x <= m.home.x + 30; x++) r += C[ELEMENTS[grid.type[y * W + x]].id] ?? '?'; console.log('   |' + r) }
  }
}
