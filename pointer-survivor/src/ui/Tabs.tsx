import type { ReactNode } from 'react'

interface Props<T extends string> {
  tabs: { id: T; label: string }[]
  active: T
  onChange(id: T): void
  children: ReactNode
}

export function Tabs<T extends string>({ tabs, active, onChange, children }: Props<T>) {
  return (
    <div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`tab ${t.id === active ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel">
        {children}
      </div>
    </div>
  )
}
