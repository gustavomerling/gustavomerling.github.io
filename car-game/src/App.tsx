import { useEffect, useRef } from 'react'
import { startScene } from './game/scene'

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return
    return startScene(mountRef.current)
  }, [])

  return (
    <>
      <div className="viewport" ref={mountRef} />
      <div className="hud">
        <strong>Car Game</strong> · hello world
        <br />
        Arraste para girar a câmera
      </div>
    </>
  )
}
