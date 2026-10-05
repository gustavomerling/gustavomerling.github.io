/** Galão de combustível (vermelho), centrado em (0,0). */
export function FuelCanShape() {
  return (
    <g className="pickup">
      <circle r={0.55} fill="#ff525222" />
      <rect x={-0.22} y={-0.28} width={0.44} height={0.56} rx={0.06} fill="#e53935" stroke="#7f1d1d" strokeWidth={0.03} />
      <rect x={0.05} y={-0.38} width={0.12} height={0.12} rx={0.02} fill="#333" />
      <path d="M-0.14 -0.18L0.14 0.18M0.14 -0.18L-0.14 0.18" stroke="#ffcdd2" strokeWidth={0.04} />
      <text y={0.22} fontSize={0.13} textAnchor="middle" fill="#fff" fontWeight={800}>
        FUEL
      </text>
    </g>
  )
}
