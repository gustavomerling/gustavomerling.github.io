import { useEffect, useState } from 'react'
import { playSfx } from '../game/audio'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'

const BOOT_SECONDS = 2.4

/** Windows 2000-style splash. Any key/click continues once loaded (and skips the bar). */
export function BootScreen({ onDone }: { onDone(): void }) {
  const [progress, setProgress] = useState(0)
  const ready = progress >= 1

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1000 / BOOT_SECONDS)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const go = () => {
      // first user gesture also unlocks WebAudio
      playSfx('click')
      onDone()
    }
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [onDone])

  return (
    <div className="boot">
      <div className="boot-panel">
        <div className="boot-banner">
          <Icon name="cursor" size={56} />
          <div className="boot-logo-text">
            <div className="small">Microsurvive</div>
            <div className="big">
              Pointer Survivor<sup>2000</sup>
            </div>
            <div className="edition">Professional</div>
          </div>
        </div>
        <div className="boot-stripe" />
        <div className="boot-foot">
          <div>{ready ? <span className="blink">Press any key or click to continue...</span> : 'Starting up...'}</div>
          <ProgressBar value={progress} max={1} label="Loading" />
          <div className="nt">Built on Click Technology</div>
        </div>
      </div>
    </div>
  )
}
