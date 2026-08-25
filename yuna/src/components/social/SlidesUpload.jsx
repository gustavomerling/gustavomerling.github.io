import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Creative } from '@/components/social/creative'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { approxDataUrlBytes, formatBytes, readImageFile } from '@/lib/image'
import { cn } from '@/lib/utils'

const MAX_SLIDES = 10

// Carrossel: várias peças em sequência. Aceita seleção múltipla de uma vez e
// permite reordenar, renomear e remover cada slide.
export function SlidesUpload({ slides = [], creative = 'verde', onChange, className }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function addFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    const room = MAX_SLIDES - slides.length
    if (room <= 0) {
      toast.error(`O carrossel aceita até ${MAX_SLIDES} slides.`)
      return
    }
    const batch = files.slice(0, room)

    setLoading(true)
    const added = []
    for (const [i, file] of batch.entries()) {
      try {
        const { dataUrl } = await readImageFile(file)
        added.push({
          creative,
          image: dataUrl,
          headline: '',
          kicker: `Slide ${slides.length + i + 1}`,
        })
      } catch (error) {
        toast.error(`Não deu para usar ${file.name}`, { description: error.message })
      }
    }
    setLoading(false)

    if (added.length > 0) {
      onChange([...slides, ...added])
      const skipped = files.length - batch.length
      toast.success(
        `${added.length} ${added.length === 1 ? 'slide adicionado' : 'slides adicionados'}`,
        skipped > 0 ? { description: `${skipped} ignorado(s) pelo limite de ${MAX_SLIDES}.` } : undefined,
      )
    }
  }

  function patch(index, next) {
    onChange(slides.map((s, i) => (i === index ? { ...s, ...next } : s)))
  }

  function remove(index) {
    onChange(slides.filter((_, i) => i !== index))
  }

  function move(index, delta) {
    const target = index + delta
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const total = slides.reduce((sum, s) => sum + approxDataUrlBytes(s.image), 0)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="upload-slides">Slides do carrossel</Label>
        <span className="text-xs text-muted-foreground">
          {slides.length}/{MAX_SLIDES}
          {total > 0 && ` · ${formatBytes(total)}`}
        </span>
      </div>

      {slides.length > 0 && (
        <ul className="space-y-2">
          {slides.map((slide, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-lg border border-border p-2.5"
            >
              <div className="relative shrink-0">
                <Creative
                  creative={slide.creative ?? creative}
                  image={slide.image}
                  ratio="square"
                  className="w-16 rounded-md"
                />
                <span className="stat absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                  {index + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  value={slide.headline ?? ''}
                  onChange={(e) => patch(index, { headline: e.target.value })}
                  placeholder="Título do slide"
                  className="h-8"
                  aria-label={`Título do slide ${index + 1}`}
                />
                <Input
                  value={slide.kicker ?? ''}
                  onChange={(e) => patch(index, { kicker: e.target.value })}
                  placeholder="Apoio (ex.: Dia 1)"
                  className="h-8"
                  aria-label={`Apoio do slide ${index + 1}`}
                />
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Mover para trás"
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === slides.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Mover para frente"
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => remove(index)}
                  aria-label={`Remover slide ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'rounded-lg border border-dashed p-3 text-center transition-colors',
          dragging ? 'border-primary bg-primary/[0.06]' : 'border-border',
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || slides.length >= MAX_SLIDES}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          Adicionar imagens
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Selecione vários arquivos de uma vez ou arraste aqui. Sem imagem, cada slide usa o
          gradiente da marca.
        </p>
      </div>

      <input
        id="upload-slides"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
