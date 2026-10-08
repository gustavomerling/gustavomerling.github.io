import type { Simulation } from '../simulation.ts'

/** Movement rule for one cell: `x, y` position, `i` grid index, `t` element index. */
export type Behavior = (sim: Simulation, x: number, y: number, i: number, t: number) => void
