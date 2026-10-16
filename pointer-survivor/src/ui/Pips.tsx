/** Little level boxes: ■■■□□ */
export function Pips({ value, max }: { value: number; max: number }) {
  return (
    <span className="pips" aria-label={`Level ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip ${i < value ? 'on' : ''}`} />
      ))}
    </span>
  )
}
