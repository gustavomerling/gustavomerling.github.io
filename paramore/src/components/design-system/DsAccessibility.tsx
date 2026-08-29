import DsSection from '@/components/design-system/DsSection'
import CodeBlock from '@/components/ui/CodeBlock'

const FOCUS_CSS = `:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 3px;
}`

const MOTION_CSS = `@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`

export default function DsAccessibility() {
  return (
    <DsSection id="acessibilidade" index="09" label="Inclusão" title="Acessibilidade & performance">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line-1 bg-surface-1 p-5">
          <h3 className="font-display text-base font-bold text-content-primary">Contraste</h3>
          <p className="mt-2 text-sm text-content-secondary">
            Taxa mínima de <strong className="text-content-primary">7:1</strong> nos
            textos principais contra o fundo escuro — supera o 4.5:1 exigido pelo nível
            AAA das WCAG.
          </p>
        </div>
        <div className="rounded-lg border border-line-1 bg-surface-1 p-5">
          <h3 className="font-display text-base font-bold text-content-primary">Teclado</h3>
          <p className="mt-2 text-sm text-content-secondary">
            Todos os elementos interativos exibem anel de foco visível e delineado
            (ver snippet ao lado), além de navegação completa por teclado.
          </p>
        </div>
        <div className="rounded-lg border border-line-1 bg-surface-1 p-5">
          <h3 className="font-display text-base font-bold text-content-primary">Movimento</h3>
          <p className="mt-2 text-sm text-content-secondary">
            Transições de era e rotação de discos são desativadas quando o usuário tem
            <code className="font-mono"> prefers-reduced-motion</code> ativo no sistema
            operacional.
          </p>
        </div>
        <div className="rounded-lg border border-line-1 bg-surface-1 p-5">
          <h3 className="font-display text-base font-bold text-content-primary">Leitores de tela</h3>
          <p className="mt-2 text-sm text-content-secondary">
            Estrutura semântica (landmarks), <code className="font-mono">aria-*</code> nos
            componentes interativos e textos alternativos em todas as imagens.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CodeBlock code={FOCUS_CSS} name="focus-visible" />
        <CodeBlock code={MOTION_CSS} name="prefers-reduced-motion" />
      </div>
    </DsSection>
  )
}