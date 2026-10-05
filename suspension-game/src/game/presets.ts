import type { CarDesign, Part } from './types'

let n = 0
const part = (kind: Part['kind'], typeId: string, x: number, y: number, extra: Partial<Part> = {}): Part => ({
  id: `preset${n++}`,
  kind,
  typeId,
  x,
  y,
  ...extra,
})

/** Mola + roda no cubo dela. */
const corner = (susp: string, wheel: string, x: number, y: number, extra: Partial<Part> = {}) => [
  part('suspension', susp, x, y),
  part('wheel', wheel, x, y, extra),
]

export interface Preset {
  name: string
  design: CarDesign
}

export const PRESETS: Preset[] = [
  {
    name: 'Buggy',
    design: {
      chassisId: 'buggy',
      parts: [...corner('medium', 'standard', -0.9, 0.75), ...corner('medium', 'standard', 0.9, 0.75), part('flag', 'whip', -0.95, -0.37)],
    },
  },
  {
    name: 'Monster Truck',
    design: {
      chassisId: 'truck',
      parts: [
        ...corner('long', 'monster', -1.3, 1.2),
        ...corner('long', 'monster', 1.3, 1.2),
        part('block', 'weight', 0, 0.45),
        part('flag', 'pirate', -1.7, -0.35),
      ],
    },
  },
  {
    name: 'Picape de carga',
    design: { chassisId: 'pickup', parts: [...corner('medium', 'offroad', -1.3, 0.8), ...corner('medium', 'offroad', 1.3, 0.8)] },
  },
  {
    name: 'Gosma',
    design: { chassisId: 'buggy', parts: [...corner('soft', 'goo', -0.9, 0.9), ...corner('soft', 'goo', 0.9, 0.9)] },
  },
  {
    name: '6x6 aninhado',
    design: {
      chassisId: 'truck',
      parts: [
        // traseira: mola -> eixo balancim -> molas nas pontas -> rodas
        part('suspension', 'medium', -1.2, 0.75),
        part('axle', 'axle-short', -1.2, 0.75),
        ...corner('sport', 'standard', -1.7, 1.3),
        ...corner('sport', 'standard', -0.7, 1.3),
        // dianteira
        ...corner('soft', 'offroad', 1.3, 1.15),
      ],
    },
  },
  {
    name: 'Centopeia',
    design: {
      chassisId: 'plank',
      parts: [-1.9, -1.14, -0.38, 0.38, 1.14, 1.9].flatMap((x) => corner('hard', 'small', x, 0.55)),
    },
  },
  {
    name: 'Rally',
    design: {
      chassisId: 'buggy',
      parts: [...corner('sport', 'offroad', -0.95, 0.8), ...corner('sport', 'offroad', 0.95, 0.8), part('flag', 'red', 0.6, -0.4)],
    },
  },
  {
    name: 'Trator',
    design: {
      chassisId: 'truck',
      parts: [
        // rodão traseiro, roda dianteira menor com curso longo e lastro na frente
        ...corner('medium', 'tractor', -1.2, 1.05),
        ...corner('long', 'offroad', 1.4, 1.0),
        part('block', 'weight', 1.3, 0),
      ],
    },
  },
  {
    name: 'Cravos no gelo',
    design: {
      chassisId: 'mini',
      parts: [...corner('sport', 'spikes', -0.6, 0.65), ...corner('sport', 'spikes', 0.6, 0.65), part('block', 'weight', 0, 0)],
    },
  },
  {
    name: 'Pula-pula',
    design: {
      chassisId: 'buggy',
      parts: [
        ...corner('air', 'balloon', -0.9, 0.95),
        ...corner('air', 'balloon', 0.9, 0.95),
        part('block', 'bumper', 1.3, 0.05),
        part('block', 'bumper', -1.3, 0.05),
        part('flag', 'rainbow', -0.95, -0.34),
      ],
    },
  },
  {
    name: 'Tanque',
    design: {
      chassisId: 'plank',
      parts: [
        // dois balancins, cada um numa mola, com duas rodas pequenas
        ...[-1.3, 1.3].flatMap((x) => [
          part('suspension', 'medium', x, 0.7),
          part('axle', 'axle-short', x, 0.7),
          part('wheel', 'small', x - 0.5, 0.7),
          part('wheel', 'small', x + 0.5, 0.7),
        ]),
        ...corner('hard', 'small', 0, 0.6),
        part('block', 'weight', 0, -0.25),
        part('flag', 'whip', -2.1, -0.1),
      ],
    },
  },
  {
    name: 'Tubarão',
    design: {
      chassisId: 'custom',
      // contorno desenhado: cauda, barbatana e focinho (côncavo de propósito)
      customChassis: [
        { x: -2.1, y: -0.7 },
        { x: -1.7, y: -0.1 },
        { x: -0.6, y: -0.35 },
        { x: -0.2, y: -0.9 },
        { x: 0.3, y: -0.4 },
        { x: 1.4, y: -0.3 },
        { x: 2.1, y: 0.05 },
        { x: 1.4, y: 0.3 },
        { x: -1.5, y: 0.3 },
        { x: -2.1, y: 0.6 },
        { x: -1.85, y: 0.1 },
      ],
      parts: [...corner('medium', 'offroad', -1.1, 0.9), ...corner('medium', 'offroad', 1.1, 0.9)],
    },
  },
]

export const DEFAULT_DESIGN = PRESETS[0].design
