import type { ReactNode } from 'react'

/** Centers a dialog Window over its positioned parent. */
export function Modal({ children }: { children: ReactNode }) {
  return <div className="modal-layer">{children}</div>
}
