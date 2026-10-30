import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { drawBody } from '../render/skin'
import { EXAMPLES, type Example } from './examples'
import { groundYFor, toWorld } from './model'

const THUMB_W = 150
const THUMB_H = 96

// Miniatura parada da criatura no modo pele, centralizada e em escala.
function Thumb({ example }: { example: Example }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = THUMB_W * dpr
    canvas.height = THUMB_H * dpr
    const groundY = groundYFor(example.model)
    const { world, body } = toWorld(example.model, groundY)
    const xs = world.particles.map((p) => p.pos.x)
    const ys = world.particles.map((p) => p.pos.y)
    const minX = Math.min(...xs) - 14
    const maxX = Math.max(...xs) + 14
    const minY = Math.min(...ys) - 14
    const scale = Math.min(THUMB_W / (maxX - minX), (THUMB_H - 10) / (groundY - minY))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#6aa84f'
    ctx.fillRect(0, THUMB_H - 8, THUMB_W, 8)
    ctx.translate((THUMB_W - (maxX - minX) * scale) / 2, THUMB_H - 8 - (groundY - minY) * scale)
    ctx.scale(scale, scale)
    ctx.translate(-minX, -minY)
    drawBody(ctx, body, 1)
  }, [example])
  return <canvas ref={ref} style={{ width: THUMB_W, height: THUMB_H }} className="rounded-md bg-[#dceef5]" />
}

// Painel com as criaturas prontas. Escolher uma substitui a criatura do editor (dá para desfazer).
export function ExamplePicker({ onPick, onClose }: { onPick: (example: Example) => void; onClose: () => void }) {
  return (
    <div className="relative mb-2 rounded-lg border bg-card p-3">
      <Button variant="ghost" size="icon" className="absolute top-1 right-1" onClick={onClose} aria-label="Fechar exemplos">
        <X />
      </Button>
      <p className="mb-2 text-sm font-semibold">Exemplos</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex)}
            className="flex shrink-0 flex-col items-start gap-1 rounded-md border bg-background p-1.5 text-left transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Thumb example={ex} />
            <span className="px-0.5 text-sm font-medium">{ex.name}</span>
            <span className="w-[150px] px-0.5 text-xs leading-snug text-muted-foreground">{ex.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
