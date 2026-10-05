import { useCallback, useState } from 'react'

const LIMIT = 100

/** Estado com desfazer/refazer. `set` grava no histórico; `replace` não. */
export function useHistory<T>(initial: () => T) {
  const [h, setH] = useState(() => ({ past: [] as T[], present: initial(), future: [] as T[] }))

  const set = useCallback(
    (next: T) =>
      setH((s) => (Object.is(s.present, next) ? s : { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [] })),
    [],
  )
  const undo = useCallback(
    () => setH((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)),
    [],
  )
  const redo = useCallback(
    () => setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)),
    [],
  )

  return { value: h.present, set, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 }
}
