import Logo from '@/components/Logo'

const ITEMS = [
  'Paramore',
  'Rock honesto',
  'Seis álbuns',
  'Misery Business',
  'Still Into You',
  'Ain’t it Fun',
  'This Is Why',
  'Hayley • Taylor • Zac',
]

export default function Marquee({ reverse = false }: { reverse?: boolean }) {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div
      className={`overflow-hidden border-y border-line-1 bg-surface-1/50 py-3.5 ${reverse ? 'border-t-0' : ''}`}
      role="presentation"
    >
      <div className={reverse ? 'pb-marquee-track pb-marquee-reverse' : 'pb-marquee-track'}>
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="flex shrink-0 items-center whitespace-nowrap">
            <span className="px-6 font-display text-xs font-bold uppercase tracking-[0.25em] text-content-secondary sm:text-sm">
              {item}
            </span>
            <Logo className="h-3 w-6 text-accent" />
          </span>
        ))}
      </div>
    </div>
  )
}