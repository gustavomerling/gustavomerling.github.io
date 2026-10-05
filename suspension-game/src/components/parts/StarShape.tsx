const PTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 0.2 : 0.45
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2
  return `${Math.cos(a) * r},${Math.sin(a) * r}`
}).join(' ')

export function StarShape() {
  return (
    <g className="star">
      <circle r={0.6} fill="#ffe06630" />
      <polygon points={PTS} fill="#ffd400" stroke="#b58900" strokeWidth={0.04} strokeLinejoin="round" />
    </g>
  )
}
