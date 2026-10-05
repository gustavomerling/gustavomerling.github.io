import { memo } from 'react'
import type { Terrain } from '../../game/terrain/generate'
import { Flag, Star } from 'lucide-react'

const W = 260
const H = 46

/** Perfil da pista inteira (desenhado uma vez) com marcadores. */
const Profile = memo(function Profile({ terrain }: { terrain: Terrain }) {
  const pts = terrain.segments.flatMap((s) => s.points).filter((p) => p.x >= 0 && p.x <= terrain.finishX)
  const ys = pts.map((p) => p.y)
  const minY = Math.min(...ys) - 1
  const maxY = Math.max(...ys) + 1
  const sx = (x: number) => (x / terrain.finishX) * W
  const sy = (y: number) => ((y - minY) / (maxY - minY)) * (H - 8) + 4
  // amostra a cada ~2 m para ficar leve
  const sampled = pts.filter((_, i) => i % 4 === 0)
  const d = `M0 ${H}` + sampled.map((p) => `L${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('') + `L${W} ${H}Z`
  return (
    <g>
      <path d={d} fill="#ffffff30" stroke="#ffffffaa" strokeWidth={1} />
      {terrain.checkpoints.slice(1).map((c, i) => (
        <line key={i} x1={sx(c.x)} x2={sx(c.x)} y1={sy(c.y) - 7} y2={sy(c.y)} stroke="#7ee0ff" strokeWidth={1.5} />
      ))}
      {terrain.fuel.map((f, i) => (
        <circle key={`f${i}`} cx={sx(f.x)} cy={sy(f.y) - 2} r={2.5} fill="#ff5252" />
      ))}
      <Flag x={W - 14} y={1} width={12} height={12} color="#fff" strokeWidth={2.5} />
    </g>
  )
})

interface Props {
  terrain: Terrain
  carX: number
  ghostX: number | null
  bestX: number
  stars: boolean[]
}

export function Minimap({ terrain, carX, ghostX, bestX, stars }: Props) {
  const sx = (x: number) => Math.max(0, Math.min(W, (x / terrain.finishX) * W))
  return (
    <svg className="minimap" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <rect width={sx(carX)} height={H} fill="#ff6b3d22" />
      <Profile terrain={terrain} />
      {terrain.stars.map((s, i) => (
        <Star key={i} x={sx(s.x) - 4} y={1} width={8} height={8} strokeWidth={2} color={stars[i] ? '#ffd23f' : '#ffffff55'} fill={stars[i] ? '#ffd23f' : 'none'} />
      ))}
      {bestX > 0 && <line x1={sx(bestX)} x2={sx(bestX)} y1={0} y2={H} stroke="#fff" strokeDasharray="2 2" strokeWidth={1} />}
      {ghostX !== null && <circle cx={sx(ghostX)} cy={H - 6} r={3.5} fill="#b0bec5" opacity={0.8} />}
      <circle cx={sx(carX)} cy={H - 6} r={4.5} fill="#ff6b3d" stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}
