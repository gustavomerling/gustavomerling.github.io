import type { Effects } from './effects'

/** Desenha partículas e textos flutuantes (coordenadas do mundo, em metros). */
export function EffectsLayer({ fx }: { fx: Effects }) {
  return (
    <g pointerEvents="none">
      {fx.particles.map((p, i) => {
        const t = Math.max(0, p.life / p.max)
        if (p.kind === 'ring') {
          const grow = 1 - t
          return <circle key={i} cx={p.x} cy={p.y} r={p.r + grow * 1.4} fill="none" stroke={p.color} strokeWidth={0.08 * t + 0.01} opacity={t} />
        }
        return <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.kind === 'dust' ? t * 0.7 : t} />
      })}
      {fx.popups.map((p, i) => {
        const t = p.life / p.max
        const s = 1 + (1 - t) * 0.3
        return (
          <text
            key={`t${i}`}
            x={p.x}
            y={p.y}
            fontSize={0.55 * s}
            fontWeight={900}
            textAnchor="middle"
            fill={p.color}
            stroke="#0008"
            strokeWidth={0.05}
            paintOrder="stroke"
            opacity={Math.min(1, t * 2)}
          >
            {p.text}
          </text>
        )
      })}
    </g>
  )
}
