import { useEffect, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Check, Loader2, RotateCcw, RotateCw, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import 'react-easy-crop/react-easy-crop.css'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import type { PhotoFrame } from '@/lib/badge'
import { getCroppedImage } from '@/lib/crop-image'

/** Último enquadramento aplicado, para reabrir o crop no mesmo lugar */
export interface CropState {
  src: string
  aspect: number
  area: Area
  rotation: number
}

interface CropDialogProps {
  open: boolean
  imageSrc: string | null
  frame: PhotoFrame
  initial: CropState | null
  onOpenChange: (open: boolean) => void
  onComplete: (dataUrl: string, state: CropState) => void
}

export function CropDialog({
  open,
  imageSrc,
  frame,
  initial,
  onOpenChange,
  onComplete,
}: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [area, setArea] = useState<Area | null>(null)
  const [areaPercent, setAreaPercent] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  // O Cropper mede o container no mount; durante o zoom-in do diálogo a medida sai escalada
  // e o recorte fica deslocado. Só montamos depois que a animação de abertura termina.
  const [settled, setSettled] = useState(false)

  const restored =
    initial && initial.src === imageSrc && initial.aspect === frame.aspect ? initial : null

  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(restored?.rotation ?? 0)
    setArea(null)
    setAreaPercent(null)
    setProcessing(false)
    const fallback = window.setTimeout(() => setSettled(true), 400)
    return () => window.clearTimeout(fallback)
  }, [open, imageSrc, frame])

  const rotate = (degrees: number) => {
    setRotation((current) => current + degrees)
    setCrop({ x: 0, y: 0 })
  }

  const apply = async () => {
    if (!imageSrc || !area || !areaPercent) return
    setProcessing(true)
    try {
      const result = await getCroppedImage(imageSrc, area, rotation)
      onComplete(result, { src: imageSrc, aspect: frame.aspect, area: areaPercent, rotation })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível recortar a foto. Tente outra imagem.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl gap-4 border-white/10 bg-[#0c0c10] p-4 sm:p-5"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setSettled(true)
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Ajuste sua foto</DialogTitle>
          <DialogDescription>
            Arraste para reposicionar, use o zoom e gire se precisar. O recorte será {frame.label}{' '}
            no crachá.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[min(56vh,380px)] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {imageSrc && settled && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={frame.aspect}
              cropShape={frame.shape}
              showGrid={false}
              objectFit="contain"
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              initialCroppedAreaPercentages={restored?.area}
              onCropComplete={(percent, pixels) => {
                setAreaPercent(percent)
                setArea(pixels)
              }}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={(values) => setZoom(values[0] ?? 1)}
              aria-label="Zoom da foto"
            />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {zoom.toFixed(1)}×
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => rotate(-90)}>
                <RotateCcw /> -90°
              </Button>
              <Button variant="outline" size="sm" onClick={() => rotate(90)}>
                <RotateCw /> +90°
              </Button>
              <button
                type="button"
                onClick={() => {
                  setRotation(0)
                  setZoom(1)
                  setCrop({ x: 0, y: 0 })
                }}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Redefinir
              </button>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {((rotation % 360) + 360) % 360}°
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={apply} disabled={!area || !areaPercent || processing}>
            {processing ? <Loader2 className="animate-spin" /> : <Check />}
            {processing ? 'Recortando...' : 'Aplicar recorte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
