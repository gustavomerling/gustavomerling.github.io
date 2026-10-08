import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { elementIndex } from '../src/elements/registry.ts'
const W = 200, H = 80
const run = (label: string, setup: (m: any) => void, zx: number) => {
  const grid = new Grid(W, H)
  const sim = new Simulation(grid)
  sim.weather.enabled = false
  sim.setTimeOfDay(0.02)
  const soil = elementIndex('soil'), human = elementIndex('human'), zombie = elementIndex('zombie'), stone = elementIndex('stone')
  for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) grid.place(y * W + x, y > 70 ? stone : soil, 50)
  grid.place(59 * W + 100, human)
  sim.step()
  const hm = sim.memory.get(grid.life[grid.type.indexOf(human)]) as any
  setup(hm)
  grid.place(59 * W + zx, zombie)
  const find = (t: number) => { const i = grid.type.indexOf(t); return i < 0 ? null : { x: i % W, y: Math.floor(i / W), i } }
  let shots = 0
  for (let t = 0; t < 60 * 40; t++) {
    sim.step()
    if (grid.type.includes(elementIndex('shot'))) shots++
    if (t % 120 === 0) {
      const h = find(human), z = find(zombie)
      const zm = z ? (sim.memory.get(grid.life[z.i]) as any) : null
      console.log(label, (t / 60).toFixed(0) + 's', 'human', h && `${h.x} ${sim.thoughtAt(h.x, h.y)!.text} hp ${Math.round(hm.health)} powder ${hm.inv.gunpowder}`, '| zombie', z ? `${z.x} hp ${Math.round(zm.health)}` : 'gone', '| powder cells', grid.type.filter((v) => v === elementIndex('gunpowder')).length)
    }
  }
  console.log(label, 'shot ticks', shots)
}
run('MUSKET', (m) => { m.courage = 0.9; m.tools.gun = true; m.inv.gunpowder = 3; m.tools.sword = 1; m.home = null; m.slept = true; m.name = 'Ana' }, 130)
run('FISTS', (m) => { m.courage = 0.9; m.slept = true; m.name = 'Bo' }, 120)
