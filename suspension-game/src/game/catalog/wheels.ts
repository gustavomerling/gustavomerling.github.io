export type WheelStyle = 'spokes' | 'lugs' | 'slick' | 'goo' | 'spikes' | 'balloon'

/** Pneu mole: anel de bolinhas ligadas por molas ao cubo (estilo Gish). */
export interface SoftTire {
  segments: number
  /** Rigidez das molas cubo↔anel (Hz) e amortecimento. */
  frequencyHz: number
  dampingRatio: number
  /** Raio do cubo rígido como fração do raio da roda. */
  hubRatio: number
}

export interface WheelDef {
  id: string
  name: string
  radius: number
  density: number
  friction: number
  restitution: number
  /** Torque máximo do motor nesta roda (N·m). */
  maxTorque: number
  /** Velocidade angular máxima (rad/s). */
  speed: number
  style: WheelStyle
  tire: string
  rim: string
  soft?: SoftTire
}

export const WHEELS: WheelDef[] = [
  { id: 'standard', name: 'Padrão', radius: 0.4, density: 1, friction: 0.9, restitution: 0.1, maxTorque: 12, speed: 28, style: 'spokes', tire: '#222', rim: '#bbb' },
  { id: 'small', name: 'Pequena', radius: 0.26, density: 1.2, friction: 0.8, restitution: 0.05, maxTorque: 7, speed: 40, style: 'spokes', tire: '#333', rim: '#ddd' },
  { id: 'offroad', name: 'Off-road', radius: 0.55, density: 1, friction: 1.4, restitution: 0.15, maxTorque: 22, speed: 22, style: 'lugs', tire: '#2b2b2b', rim: '#e0a030' },
  { id: 'tractor', name: 'Trator', radius: 0.7, density: 1.1, friction: 1.6, restitution: 0.1, maxTorque: 40, speed: 13, style: 'lugs', tire: '#262626', rim: '#f2c94c' },
  { id: 'monster', name: 'Monster', radius: 0.85, density: 0.7, friction: 1.2, restitution: 0.25, maxTorque: 45, speed: 16, style: 'lugs', tire: '#1d1d1d', rim: '#d33' },
  { id: 'spikes', name: 'Cravos', radius: 0.45, density: 1.2, friction: 2.4, restitution: 0.05, maxTorque: 18, speed: 24, style: 'spikes', tire: '#30343a', rim: '#9ad' },
  { id: 'balloon', name: 'Balão', radius: 0.65, density: 0.2, friction: 1, restitution: 0.65, maxTorque: 14, speed: 26, style: 'balloon', tire: '#e84393', rim: '#fff' },
  { id: 'slick', name: 'Slick', radius: 0.4, density: 1, friction: 0.5, restitution: 0.05, maxTorque: 14, speed: 40, style: 'slick', tire: '#111', rim: '#4cf' },
  {
    id: 'goo',
    name: 'Gosma',
    radius: 0.55,
    density: 0.8,
    friction: 1.5,
    restitution: 0,
    maxTorque: 32,
    speed: 24,
    style: 'goo',
    tire: '#5fcf3a',
    rim: '#2f7d1c',
    soft: { segments: 16, frequencyHz: 6, dampingRatio: 0.4, hubRatio: 0.4 },
  },
]

export const WHEELS_BY_ID: Record<string, WheelDef> = Object.fromEntries(WHEELS.map((w) => [w.id, w]))
