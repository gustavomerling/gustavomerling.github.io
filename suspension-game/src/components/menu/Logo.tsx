/**
 * Logo: emblema (roda + mola que comprime) ao lado do nome.
 * "SUSPENSION" fino e espaçado em cima, "GARAGE" grande, itálico, com degradê e contorno.
 */
export function Logo({ big = false }: { big?: boolean }) {
  return (
    <div className={big ? 'brand big' : 'brand'}>
      <Emblem />
      <div className="brand-text">
        <span className="brand-top">SUSPENSION</span>
        <span className="brand-main" data-text="GARAGE">
          GARAGE
        </span>
        <span className="brand-stripes">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}

export function Emblem({ className = 'brand-emblem' }: { className?: string }) {
  // mola em zigue-zague entre o "chassi" (barra de cima) e o cubo da roda
  const coil = 'M0 -30 L0 -26 L9 -22 L-9 -17 L9 -12 L-9 -7 L9 -2 L-9 3 L0 7 L0 10'
  return (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden>
      <defs>
        <linearGradient id="brandRing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb547" />
          <stop offset="1" stopColor="#ff5a2c" />
        </linearGradient>
      </defs>
      <circle r={47} fill="#141922" stroke="url(#brandRing)" strokeWidth={5} />
      <circle r={40} fill="none" stroke="#ffffff14" strokeWidth={1.5} />
      {/* chassi */}
      <rect x={-26} y={-36} width={52} height={9} rx={3} fill="#ff6b3d" />
      <g className="brand-spring">
        <rect x={-3.5} y={-28} width={7} height={22} rx={2} fill="#2b313c" />
        <path d={coil} fill="none" stroke="#ffd23f" strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {/* roda */}
      <g className="brand-wheel" transform="translate(0 20)">
        <circle r={19} fill="#0d1015" />
        <circle r={19} fill="none" stroke="#2c323d" strokeWidth={4} strokeDasharray="4 3.4" />
        <circle r={10} fill="#c9d1db" />
        <g stroke="#7d8896" strokeWidth={2.2} strokeLinecap="round">
          <line x1={-8} y1={0} x2={8} y2={0} />
          <line x1={-4} y1={-7} x2={4} y2={7} />
          <line x1={-4} y1={7} x2={4} y2={-7} />
        </g>
        <circle r={3} fill="#ff6b3d" />
      </g>
    </svg>
  )
}
