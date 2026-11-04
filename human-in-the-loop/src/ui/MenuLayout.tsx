import type { ReactNode } from 'react'
import { Wordmark } from './Logo'

export interface NavItem {
  id: string
  label: string
  /** Ação imediata (ex.: entrar no jogo) em vez de abrir uma aba. */
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  hint?: string
}

interface Props {
  variant: 'main' | 'pause'
  nav: NavItem[]
  tab: string
  onTab: (id: string) => void
  title: string
  tag?: string
  /** Clique fora do quadro (ex.: voltar ao jogo na pausa). */
  onBackdrop?: () => void
  footer?: ReactNode
  children: ReactNode
}

/** Moldura comum do menu inicial e da pausa: coluna com marca e navegação + painel. */
export function MenuLayout(p: Props) {
  return (
    <div className={`menu-screen ${p.variant}`} onClick={p.onBackdrop}>
      <div className="menu-frame" onClick={(e) => e.stopPropagation()}>
        <aside className="menu-side">
          <Wordmark size={p.variant === 'main' ? 60 : 44} sub={p.variant === 'pause' ? 'pausado' : 'laboratório de física'} />
          <nav className="menu-nav">
            {p.nav.map((n, i) => (
              <button
                key={n.id}
                className={['menu-nav-item', n.primary && 'primary', p.tab === n.id && 'active'].filter(Boolean).join(' ')}
                disabled={n.disabled}
                onClick={() => (n.onClick ? n.onClick() : p.onTab(n.id))}
              >
                <span className="menu-nav-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="menu-nav-label">{n.label}</span>
                {n.hint && <span className="menu-nav-hint">{n.hint}</span>}
              </button>
            ))}
          </nav>
          {p.footer && <footer className="menu-foot">{p.footer}</footer>}
        </aside>
        <section className="menu-panel">
          <header className="menu-panel-head">
            <h2>{p.title}</h2>
            {p.tag && <span className="menu-tag">{p.tag}</span>}
          </header>
          <div className="menu-panel-body">{p.children}</div>
        </section>
      </div>
    </div>
  )
}
