import { useEffect, useState } from 'react'

const LINKS = [
  { id: 'principios', label: '1. Princípios' },
  { id: 'tokens', label: '2. Tokens & cores' },
  { id: 'eras', label: '3. Temas das eras' },
  { id: 'tipografia', label: '4. Tipografia' },
  { id: 'espacamento', label: '5. Espaço, raio & sombras' },
  { id: 'componentes', label: '6. Componentes' },
  { id: 'marca', label: '7. Marca' },
  { id: 'tom-de-voz', label: '8. Tom de voz' },
  { id: 'acessibilidade', label: '9. Acessibilidade' },
  { id: 'roadmap', label: '10. Roadmap' },
]

const SCROLL_OFFSET = 140

export default function DsNav() {
  const [active, setActive] = useState(LINKS[0].id)

  useEffect(() => {
    const onScroll = () => {
      let current = LINKS[0].id
      for (const link of LINKS) {
        const el = document.getElementById(link.id)
        if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET) {
          current = link.id
        }
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      aria-label="Seções do design system"
      className="sticky top-16 z-30 border-b border-line-1 bg-canvas/85 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[var(--container-max)] px-4 sm:px-6">
        <ul className="flex gap-1 overflow-x-auto whitespace-nowrap py-2" role="tablist" aria-orientation="horizontal">
          {LINKS.map((link) => (
            <li key={link.id} role="none">
              <button
                type="button"
                role="tab"
                aria-selected={active === link.id}
                onClick={() =>
                  document.getElementById(link.id)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active === link.id
                    ? 'bg-accent-subtle text-accent'
                    : 'text-content-secondary hover:bg-surface-1 hover:text-content-primary'
                }`}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}