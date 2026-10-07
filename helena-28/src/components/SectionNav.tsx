import { useEffect, useState } from 'react'
import './SectionNav.css'

type SectionNavProps = {
  items: { id: string; label: string }[]
}

/** Pontinhos fixos na lateral: um por seção, com a atual destacada */
export function SectionNav({ items }: SectionNavProps) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    // a seção "ativa" é a que cruza o meio da tela
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [items])

  return (
    <nav className="section-nav" aria-label="Seções">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === active ? 'section-nav__dot is-active' : 'section-nav__dot'}
          aria-label={item.label}
          aria-current={item.id === active ? 'true' : undefined}
          // href="#id" brigaria com o HashRouter, por isso o scroll é manual
          onClick={() => document.getElementById(item.id)?.scrollIntoView()}
        >
          <span className="section-nav__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
