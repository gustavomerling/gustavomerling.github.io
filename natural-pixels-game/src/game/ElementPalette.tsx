import { ChevronDown } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { CATEGORIES } from '../elements/categories.ts'
import { PALETTE, elementIndex } from '../elements/registry.ts'
import type { ElementDefinition } from '../elements/types.ts'

const STORAGE_KEY = 'natural-pixels.closed-families'

interface ElementPaletteProps {
  tool: number
  onSelect: (tool: number) => void
}

/** Hotkey label for a palette position: 1–9, then 0 for the tenth. */
function hotkeyFor(el: ElementDefinition): string {
  const n = PALETTE.indexOf(el)
  return n < 9 ? String(n + 1) : n === 9 ? '0' : ''
}

function loadClosed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveClosed(closed: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...closed]))
  } catch {
    // Storage unavailable (private mode...): the accordion just won't be remembered.
  }
}

/** Elements grouped by family in collapsible sections, generated from the registry. */
export function ElementPalette({ tool, onSelect }: ElementPaletteProps) {
  const [closed, setClosed] = useState(loadClosed)

  const toggle = (id: string) => {
    const next = new Set(closed)
    if (!next.delete(id)) next.add(id)
    setClosed(next)
    saveClosed(next)
  }

  return (
    <div className="palette">
      {CATEGORIES.map((category) => {
        const elements = PALETTE.filter((el) => el.category === category.id)
        if (elements.length === 0) return null
        const open = !closed.has(category.id)
        const hasActive = elements.some((el) => elementIndex(el.id) === tool)
        const Icon = category.icon
        const bodyId = `family-${category.id}`

        return (
          <section key={category.id} className={`accordion ${open ? 'accordion--open' : ''}`}>
            <button
              type="button"
              className={`accordion__header ${hasActive ? 'accordion__header--active' : ''}`}
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => toggle(category.id)}
            >
              <Icon size={16} strokeWidth={2.2} aria-hidden />
              <span className="accordion__label">{category.label}</span>
              <span className="accordion__count">{elements.length}</span>
              <ChevronDown className="accordion__chevron" size={16} aria-hidden />
            </button>
            {open && (
              <div id={bodyId} className="element-grid">
                {elements.map((el) => {
                  const index = elementIndex(el.id)
                  return (
                    <ElementButton key={el.id} element={el} active={tool === index} onClick={() => onSelect(index)} />
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ElementButton({ element, active, onClick }: { element: ElementDefinition; active: boolean; onClick: () => void }) {
  const Icon = element.icon
  const hotkey = hotkeyFor(element)
  return (
    <button
      type="button"
      className={`element-chip ${active ? 'element-chip--active' : ''}`}
      style={{ '--chip-color': element.color.base } as CSSProperties}
      title={hotkey ? `${element.description} (${hotkey})` : element.description}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="element-chip__icon" size={18} strokeWidth={2.2} aria-hidden />
      <span className="element-chip__name">{element.name}</span>
      {hotkey && <kbd className="element-chip__key">{hotkey}</kbd>}
    </button>
  )
}
