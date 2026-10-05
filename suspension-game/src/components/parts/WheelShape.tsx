import type { WheelDef } from '../../game/catalog/wheels'

/** Roda desenhada em (0,0), em metros. Rotacione o <g> pai para girar. */
export function WheelShape({ def }: { def: WheelDef }) {
  const r = def.radius
  if (def.style === 'balloon') {
    return (
      <g>
        <circle r={r} fill={def.tire} stroke="#0004" strokeWidth={0.02} />
        <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.25} ry={r * 0.14} fill="#ffffff70" transform={`rotate(-35 ${-r * 0.35} ${-r * 0.4})`} />
        <circle r={r * 0.22} fill={def.rim} stroke="#0003" strokeWidth={0.02} />
        <line x1={-r * 0.9} x2={r * 0.9} stroke="#0002" strokeWidth={0.02} />
        <circle r={r * 0.07} fill="#333" />
      </g>
    )
  }
  const rim = r * 0.6
  const lugs = def.style === 'lugs' ? Math.round(r * 28) : 0
  const spikes = def.style === 'spikes' ? 14 : 0
  return (
    <g>
      {Array.from({ length: lugs }, (_, i) => (
        <rect key={i} x={-r * 0.08} y={-r - r * 0.07} width={r * 0.16} height={r * 0.14} fill={def.tire} transform={`rotate(${(i * 360) / lugs})`} />
      ))}
      {Array.from({ length: spikes }, (_, i) => (
        <polygon key={i} points={`${-r * 0.07},${-r + 0.01} ${r * 0.07},${-r + 0.01} 0,${-r - r * 0.16}`} fill="#cfd8dc" transform={`rotate(${(i * 360) / spikes})`} />
      ))}
      <circle r={r} fill={def.tire} />
      {def.style === 'slick' && <circle r={r * 0.9} fill="none" stroke="#333" strokeWidth={r * 0.04} />}
      <circle r={rim} fill={def.rim} />
      {[0, 60, 120].map((a) => (
        <rect key={a} x={-rim} y={-r * 0.05} width={rim * 2} height={r * 0.1} fill="#0005" transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.14} fill="#333" />
    </g>
  )
}
