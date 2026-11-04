import { useEffect, useRef, useState } from 'react'
import { createGame, type Game } from './game/Game'

/**
 * React cuida só da camada de UI (HUD, menus). A cena 3D e a física rodam
 * fora do ciclo de render do React, num loop imperativo próprio.
 */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('carregando física…')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let game: Game | undefined
    let cancelled = false
    createGame(host).then((g) => {
      if (cancelled) g.dispose()
      else {
        game = g
        setStatus('Passo 1 · laboratório — arraste para orbitar, roda para zoom')
      }
    })
    return () => {
      cancelled = true
      game?.dispose()
    }
  }, [])

  return (
    <>
      <div ref={hostRef} className="viewport" />
      <div className="hud">
        <h1>Human in the Loop</h1>
        <p>{status}</p>
      </div>
    </>
  )
}
