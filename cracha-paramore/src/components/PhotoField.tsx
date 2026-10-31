import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Camera, Crop, ImagePlus, Trash2, Upload, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotoFrame } from '@/lib/badge'
import { cn } from '@/lib/utils'

interface PhotoFieldProps {
  photoSrc: string | null
  frame: PhotoFrame
  onFile: (file: File) => void
  onCamera: () => void
  onCrop: () => void
  onRemove: () => void
}

export function PhotoField({ photoSrc, frame, onFile, onCamera, onCrop, onRemove }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          event.target.value = ''
        }}
      />

      {photoSrc ? (
        <div className="relative flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 pr-11 sm:flex-row sm:items-center sm:pr-3">
          <div
            className={cn(
              'relative h-20 shrink-0 overflow-hidden border-2 border-white/25 bg-black shadow-inner',
              frame.shape === 'round' ? 'rounded-full' : 'rounded-md',
            )}
            style={{ aspectRatio: frame.aspect }}
          >
            <img src={photoSrc} alt="Sua foto recortada" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/90">Foto pronta</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/45">
              Ajuste o enquadramento sempre que quiser. O recorte é {frame.label} no crachá.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={onCrop}>
                <Crop /> Ajustar corte
              </Button>
              <Button variant="ghost" size="sm" onClick={openPicker} className="text-white/65">
                <Upload /> Trocar
              </Button>
              <Button variant="ghost" size="sm" onClick={onCamera} className="text-white/65">
                <Camera /> Câmera
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remover foto"
            className="absolute right-2 top-2 text-white/40 hover:text-red-400 sm:static sm:self-center"
          >
            <Trash2 />
          </Button>
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Enviar foto"
            onClick={openPicker}
            onKeyDown={onKeyDown}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-7 text-center transition',
              dragging
                ? 'border-primary bg-primary/10'
                : 'border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.045]',
            )}
          >
            <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-white/50 transition group-hover:scale-105 group-hover:text-white/80">
              <ImagePlus className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-white/85">
              Arraste sua foto aqui ou clique para escolher
            </p>
            <p className="mt-1 text-xs text-white/40">JPG, PNG ou WebP · até 20 MB</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={openPicker}>
              <Upload /> Escolher arquivo
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onCamera}>
              <Camera /> Usar a câmera
            </Button>
          </div>
        </>
      )}
      <div className="flex items-start gap-2 text-[11px] leading-relaxed text-white/35">
        <UserRound className="mt-0.5 size-3.5 shrink-0" />
        <p>Sua foto é processada só no seu navegador. Nada é enviado para servidores.</p>
      </div>
    </div>
  )
}
