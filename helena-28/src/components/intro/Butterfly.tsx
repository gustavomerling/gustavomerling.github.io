/** Borboleta com asas que batem (a animação está em Burst.css) */
export function Butterfly({ size, color }: { size: number; color: string }) {
  const wings = (
    <>
      <path d="M20 15C14 1 1 2 3.5 12.5 5 18 12 17 20 15Z" />
      <path d="M20 17c-7 1-13 8.5-8.5 11.5C16 31 19 24 20 17Z" />
    </>
  )
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 40 32" fill={color} stroke="var(--ink)" strokeWidth={1.3} strokeLinejoin="round">
      <g className="butterfly__wing">{wings}</g>
      <g className="butterfly__wing">
        <g transform="translate(40 0) scale(-1 1)">{wings}</g>
      </g>
      <ellipse cx="20" cy="16" rx="1.7" ry="8" fill="var(--ink)" stroke="none" />
      <path d="M19.5 8.5 17 4M20.5 8.5 23 4" fill="none" />
    </svg>
  )
}
