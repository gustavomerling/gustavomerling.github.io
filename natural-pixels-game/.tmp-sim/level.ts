import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { ELEMENTS, elementIndex } from '../src/elements/registry.ts'
const W = 200, H = 100
const grid = new Grid(W, H)
const sim = new Simulation(grid)
sim.weather.enabled = false
sim.dayCycle = false
const soil = elementIndex('soil'), human = elementIndex('human'), stone = elementIndex('stone'), sand = elementIndex('sand')
// Flat site 104..116 at ground 80; bumpy around it.
const top = (x: number) => (x >= 100 && x <= 120 ? 80 : 80 + Math.round(Math.sin(x * 0.7) * 2.5))
for (let x = 0; x < W; x++) for (let y = top(x); y < H; y++) grid.place(y * W + x, y > 92 ? stone : y > 84 ? sand : soil, 80)
grid.place(79 * W + 110, human)
sim.step()
const m = sim.memory.get(grid.life[grid.type.indexOf(human)]) as any
m.inv.plank = 30; m.noStone = true; m.inv.stone = 20; m.tools = { pickaxe: 2, axe: 2, bucket: true, sword: 1, gun: false }; m.inv.food = 10
const C: Record<string, string> = { air: ' ', soil: '#', stone: 'S', sand: '.', plank: 'P', backwall: 'b', bed: 'B', lamp: 'L', human: 'H', human_body: 'H', human_torch: 'T', human_head: 'o', door: 'D', fence: 'f', wheat: 'w', grass: '"' }
const pic = () => { for (let y = 70; y <= 86; y++) { let r = ''; for (let x = 80; x <= 140; x++) r += C[ELEMENTS[grid.type[y * W + x]].id] ?? '?'; console.log('|' + r + '|', y) } }
pic()
const seen = new Map<string, number>()
for (let t = 1; t <= 3600 * 5; t++) {
  sim.step()
  if (t % 60 === 0 && m.stuck >= 12 && (globalThis as any).dbg === undefined) { (globalThis as any).dbg = 1; const i = grid.type.indexOf(human); const hx = i % W, hy = Math.floor(i / W); console.log('STUCK', m.task, 'phase', m.phase, 'at', hx, hy, 'target', m.target); for (let y = hy - 5; y <= hy + 3; y++) { let r = ''; for (let x = hx - 8; x <= hx + 8; x++) r += C[ELEMENTS[grid.type[y * W + x]].id] ?? '?'; console.log('   |' + r + '|', y) } }
  if (t % 60 === 0) { const i = grid.type.indexOf(human); const th = sim.thoughtAt(i % W, Math.floor(i / W))!.text.replace(/\d+%/, ''); seen.set(th, (seen.get(th) ?? 0) + 1) }
}
pic()
console.log('home', m.home, 'earth', m.inv.earth, [...seen].map(([k, v]) => `${v}× ${k}`).join(' | '))
