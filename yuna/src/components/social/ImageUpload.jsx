import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Creative } from '@/components/social/creative'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { approxDataUrlBytes, formatBytes, readImageFile } from '@/lib/image'
import { cn } from '@/lib/utils'

// Campo de upload da peça. Devolve uma data URL já redimensionada, que fica
// salva no localStorage junto com a pauta.
export function ImageUpload({ value, creative = 'verde', onChange, label = 'Peça', className }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setLoading(true)
    try {
      const { dataUrl, width, height } = await readImageFile(file)
      onChange(dataUrl)
      toast.success('Imagem carregada', {
        description: `${width}×${height} · ${formatBytes(approxDataUrlBytes(dataUrl))}`,
      })
    } catch (error) {
      toast.error('Não deu para usar essa imagem', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const uploaded = value?.startsWith('data:')

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor="upload-peca">{label}</Label>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors',
          dragging ? 'border-primary bg-primary/[0.06]' : 'border-border',
        )}
      >
        <Creative
          creative={creative}
          image={value}
          ratio="square"
          className="w-20 shrink-0 rounded-md"
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {uploaded
              ? `Imagem própria · ${formatBytes(approxDataUrlBytes(value))}`
              : 'Arraste uma imagem aqui ou escolha um arquivo. Sem imagem, a peça usa o gradiente da marca.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => inputRef.current?.click()}
            >
              {loading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {uploaded ? 'Trocar imagem' : 'Escolher imagem'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(undefined)}
              >
                <Trash2 />
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        id="upload-peca"
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
