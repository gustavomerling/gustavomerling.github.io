import DsSection from '@/components/design-system/DsSection'

const PRINCIPLES = [
  {
    title: 'Fans-First & Imersivo',
    body: 'A interface deve fazer o visitante sentir a energia visceral dos shows e a profundidade poética da banda.',
  },
  {
    title: 'Era-Theming Dinâmico',
    body: 'O usuário alterna a identidade visual para sua era favorita — AWKIF, RIOT!, BNE, Self-Titled, After Laughter ou This Is Why — ou usa o tema padrão moderno.',
  },
  {
    title: 'Leitura Editorial',
    body: 'Notícias longas, transcrições e traduções de letras com legibilidade impecável e sem poluição visual.',
  },
  {
    title: 'Mobile-First & Responsivo',
    body: '80%+ dos acessos vêm de smartphones durante shows e lançamentos. A interface mobile deve ser ultra-rápida e sem atrito.',
  },
  {
    title: 'Acessibilidade Universal',
    body: 'WCAG 2.1 AA+: alto contraste, navegação completa por teclado, suporte a leitores de tela e prefers-reduced-motion.',
  },
]

export default function DsPrinciples() {
  return (
    <DsSection id="principios" index="01" label="Fundamentos" title="Princípios de Design (DS-PB)">
      <div className="grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <div
            key={p.title}
            className={`rounded-lg border border-line-1 bg-surface-1 p-5 ${
              i === 0 ? 'sm:col-span-2' : ''
            }`}
          >
            <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-content-primary">
              {p.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-content-secondary">{p.body}</p>
          </div>
        ))}
      </div>
    </DsSection>
  )
}