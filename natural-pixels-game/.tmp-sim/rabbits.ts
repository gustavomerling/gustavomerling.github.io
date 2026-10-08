import { Grid } from '../src/engine/grid.ts'
import { Simulation } from '../src/engine/simulation.ts'
import { elementIndex } from '../src/elements/registry.ts'
const W = 200, H = 80
const grid = new Grid(W, H)
const sim = new Simulation(grid)
sim.weather.enabled = false
const soil = elementIndex('soil'), grass = elementIndex('grass'), rabbit = elementIndex('rabbit'), stone = elementIndex('stone')
for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) grid.place(y * W + x, y > 70 ? stone : soil, 120)
for (let x = 0; x < W; x++) grid.place(59 * W + x, grass, 0, 1)
for (let n = 0; n < 4; n++) { grid.place(58 * W + 50 + n * 30, rabbit); grid.place(58 * W + 51 + n * 30, rabbit) }
const count = (t: number) => { let c = 0; for (let i = 0; i < grid.size; i++) if (grid.type[i] === t) c++; return c }
for (let m = 1; m <= 8; m++) { for (let i = 0; i < 3600; i++) sim.step(); console.log(`${m} min rabbits ${count(rabbit)} grass ${count(grass)}`) }
