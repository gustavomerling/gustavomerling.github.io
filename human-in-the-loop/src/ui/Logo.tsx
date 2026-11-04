/**
 * Marca do projeto: o alvo de quadrantes dos bonecos de crash test, envolto
 * por uma seta em loop (o "humano no loop" que observa e intervém).
 * Desenhada em viewBox 64×64; o favicon (public/favicon.svg) usa o mesmo traço.
 */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className ? `logo-mark ${className}` : 'logo-mark'}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Human in the Loop"
    >
      {/* Seta em loop: abre no topo e aponta para o próprio começo. */}
      <path
        className="logo-loop"
        d="M41.2 6.6 A27 27 0 1 1 22.8 6.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={100}
      />
      <path className="logo-arrow" d="M29.6 6.4 L21.4 1.8 L21.9 11.2 Z" fill="currentColor" />
      {/* Alvo de quadrantes (amarelo/grafite), como no capacete do manequim. */}
      <g className="logo-target">
        <circle cx="32" cy="32" r="20.5" fill="currentColor" />
        <circle cx="32" cy="32" r="18" fill="var(--logo-dark, #22231f)" />
        <path d="M32 32 L32 14 A18 18 0 0 1 50 32 Z" fill="var(--logo-hazard, #f2c21b)" />
        <path d="M32 32 L32 50 A18 18 0 0 1 14 32 Z" fill="var(--logo-hazard, #f2c21b)" />
        <circle cx="32" cy="32" r="2.6" fill="var(--logo-paper, #efece6)" />
      </g>
    </svg>
  )
}

/** Logotipo completo: marca + nome em duas linhas. */
export function Wordmark({ size = 56, sub }: { size?: number; sub?: string }) {
  return (
    <div className="wordmark" style={{ ['--mark' as string]: `${size}px` }}>
      <LogoMark size={size} />
      <div className="wordmark-text">
        <span className="wordmark-top">Human</span>
        <span className="wordmark-bottom">
          <small>in the</small> Loop
        </span>
        {sub && <span className="wordmark-sub">{sub}</span>}
      </div>
    </div>
  )
}
