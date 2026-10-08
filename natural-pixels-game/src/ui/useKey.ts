import { useEffect } from 'react'

/**
 * Calls `handler` on keydown. Pass a key name to filter (e.g. 'Escape'),
 * or omit it to react to any key.
 */
export function useKey(handler: () => void, key?: string) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (key === undefined || e.key === key) handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler, key])
}
