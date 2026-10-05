import { useId } from 'react'
import type { FlagDef, FlagPattern } from '../../game/catalog/flags'
import { deg } from '../../game/geometry'
import { REST_FLAG, type FlagState } from '../../game/types'

/**
 * Bandeira com base em (0,0) e haste para cima (-y), no referencial da peça.
 * A haste vira um arco de circunferência com ângulo `bend` na ponta; o pano fica preso na
 * ponta, alinhado com a tangente, e ondula conforme `phase`/`flutter`.
 */
export function FlagShape({ def, state = REST_FLAG }: { def: FlagDef; state?: FlagState }) {
  const id = useId().replace(/:/g, '')
  const L = def.length
  const b = state.bend
  // arco de comprimento L que gira `b` radianos
  const small = Math.abs(b) < 1e-3
  const R = small ? 0 : L / b
  const tip = small ? { x: 0, y: -L } : { x: R * (1 - Math.cos(b)), y: -R * Math.sin(b) }
  const ctrl = small ? { x: 0, y: -L / 2 } : { x: 0, y: -R * Math.tan(b / 2) }

  const W = def.clothW
  const H = def.clothH
  const N = 8
  const wave = (i: number, off: number) =>
    Math.sin(state.phase - i * 1.3 + off) * 0.07 * state.flutter * (i / N) * (W / 0.5)
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= N; i++) {
    const x = (W * i) / N
    top.push(`${x},${wave(i, 0)}`)
    bottom.unshift(`${x},${H + wave(i, 0.4)}`)
  }
  const cloth = `M${top.join('L')}L${bottom.join('L')}Z`

  return (
    <g>
      <path
        d={`M0 0Q${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y}`}
        fill="none"
        stroke={def.poleColor}
        strokeWidth={def.thickness}
        strokeLinecap="round"
      />
      <circle r={def.thickness * 1.3} fill="#555" />
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${deg(b)}) scale(${state.trail} 1)`}>
        <clipPath id={`cloth${id}`}>
          <path d={cloth} />
        </clipPath>
        <g clipPath={`url(#cloth${id})`}>
          <PatternFill pattern={def.pattern} w={W} h={H} />
          {/* sombreado das dobras */}
          <path d={cloth} fill="none" stroke="#0003" strokeWidth={0.02} />
        </g>
        <circle r={def.thickness * 1.1} fill="#f2c94c" />
      </g>
    </g>
  )
}

/** Desenho do pano no retângulo (0,0)-(w,h), x saindo da haste. */
function PatternFill({ pattern, w, h }: { pattern: FlagPattern; w: number; h: number }) {
  const x0 = -0.05
  const y0 = -0.15
  const W = w + 0.2
  const H = h + 0.3
  switch (pattern) {
    case 'checkered': {
      const n = 5
      const s = w / n
      return (
        <g>
          <rect x={x0} y={y0} width={W} height={H} fill="#fff" />
          {Array.from({ length: (n + 2) * 5 }, (_, i) => {
            const cx = i % (n + 2)
            const cy = Math.floor(i / (n + 2))
            return (cx + cy) % 2 ? null : <rect key={i} x={cx * s - s} y={cy * s - s} width={s} height={s} fill="#111" />
          })}
        </g>
      )
    }
    case 'pirate':
      return (
        <g>
          <rect x={x0} y={y0} width={W} height={H} fill="#111" />
          <circle cx={w / 2} cy={h * 0.4} r={h * 0.2} fill="#eee" />
          <circle cx={w / 2 - h * 0.08} cy={h * 0.38} r={h * 0.05} fill="#111" />
          <circle cx={w / 2 + h * 0.08} cy={h * 0.38} r={h * 0.05} fill="#111" />
          <path
            d={`M${w / 2 - h * 0.3} ${h * 0.65}L${w / 2 + h * 0.3} ${h * 0.88}M${w / 2 + h * 0.3} ${h * 0.65}L${w / 2 - h * 0.3} ${h * 0.88}`}
            stroke="#eee"
            strokeWidth={h * 0.08}
            strokeLinecap="round"
          />
        </g>
      )
    case 'rainbow': {
      const colors = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa']
      const sh = H / colors.length
      return (
        <g>
          {colors.map((c, i) => (
            <rect key={c} x={x0} y={y0 + i * sh} width={W} height={sh + 0.002} fill={c} />
          ))}
        </g>
      )
    }
    case 'green':
      return (
        <g>
          <rect x={x0} y={y0} width={W} height={H} fill="#2e7d32" />
          <rect x={x0} y={h * 0.38} width={W} height={h * 0.24} fill="#fff" />
        </g>
      )
    default:
      return <rect x={x0} y={y0} width={W} height={H} fill="#e53935" />
  }
}
