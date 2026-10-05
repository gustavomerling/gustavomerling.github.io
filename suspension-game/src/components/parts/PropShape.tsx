import type { PropState } from '../../game/physics/Simulation'
import { poseTransform } from './transform'

/** Objetos do cenário. Um prop pode ter vários corpos (ponte = várias tábuas). */
export function PropShape({ prop }: { prop: PropState }) {
  const { spec, poses } = prop
  switch (spec.kind) {
    case 'rock':
      return (
        <polygon
          transform={poseTransform(poses[0])}
          points={spec.vertices.map((v) => `${v.x},${v.y}`).join(' ')}
          fill="#85868e"
          stroke="#55565c"
          strokeWidth={0.04}
          strokeLinejoin="round"
        />
      )
    case 'crate': {
      const s = spec.size
      return (
        <g transform={poseTransform(poses[0])}>
          <rect x={-s / 2} y={-s / 2} width={s} height={s} fill="#c18a4a" stroke="#6e4a24" strokeWidth={0.04} />
          <path d={`M${-s / 2} ${-s / 2}L${s / 2} ${s / 2}M${s / 2} ${-s / 2}L${-s / 2} ${s / 2}`} stroke="#6e4a24" strokeWidth={0.03} />
        </g>
      )
    }
    case 'log':
      return (
        <g transform={poseTransform(poses[0])}>
          <circle r={spec.radius} fill="#7a5532" stroke="#4a2f18" strokeWidth={0.03} />
          <circle r={spec.radius * 0.5} fill="none" stroke="#4a2f18" strokeWidth={0.02} />
          <line x1={0} y1={0} x2={spec.radius} y2={0} stroke="#4a2f18" strokeWidth={0.02} />
        </g>
      )
    case 'seesaw':
      return (
        <g>
          <polygon points={`${spec.x - 0.35},${spec.y} ${spec.x + 0.35},${spec.y} ${spec.x},${spec.y - spec.height}`} fill="#6b5a48" />
          <g transform={poseTransform(poses[0])}>
            <rect x={-spec.length / 2} y={-0.08} width={spec.length} height={0.16} fill="#b88a52" stroke="#6e4a24" strokeWidth={0.03} />
          </g>
        </g>
      )
    case 'boost': {
      const n = Math.round(spec.length / 0.5)
      return (
        <g className="boost-pad">
          <rect x={spec.x} y={spec.y - 0.06} width={spec.length} height={0.08} fill="#ffb300" />
          {Array.from({ length: n }, (_, i) => (
            <path
              key={i}
              d={`M${spec.x + i * 0.5 + 0.1} ${spec.y - 0.04}l0.2 -0.18l-0.2 -0.18`}
              fill="none"
              stroke="#ff6d00"
              strokeWidth={0.07}
              strokeLinecap="round"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </g>
      )
    }
    case 'trampoline': {
      const w = spec.width
      return (
        <g>
          {Array.from({ length: 4 }, (_, i) => (
            <path
              key={i}
              d={`M${spec.x + 0.2 + i * ((w - 0.4) / 3)} ${spec.y}l0.06 -0.05l-0.12 -0.05l0.12 -0.05l-0.06 -0.05`}
              fill="none"
              stroke="#555"
              strokeWidth={0.03}
            />
          ))}
          <rect x={spec.x} y={spec.y - 0.26} width={w} height={0.08} rx={0.04} fill="#e53935" stroke="#7f1d1d" strokeWidth={0.02} />
          <rect x={spec.x + 0.1} y={spec.y - 0.235} width={w - 0.2} height={0.025} fill="#ffffff88" />
        </g>
      )
    }
    case 'bridge': {
      const w = spec.length / spec.planks
      return (
        <g>
          {poses.map((p, i) => (
            <rect key={i} transform={poseTransform(p)} x={-w * 0.48} y={-0.07} width={w * 0.96} height={0.14} fill="#a87b45" stroke="#5e3f1d" strokeWidth={0.02} />
          ))}
        </g>
      )
    }
  }
}
