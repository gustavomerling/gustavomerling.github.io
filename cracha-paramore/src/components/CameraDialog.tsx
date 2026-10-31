import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, RefreshCcw, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CameraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (dataUrl: string) => void
}

type CameraStatus = 'starting' | 'ready' | 'error'

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'A câmera foi bloqueada. Libere a permissão no navegador ou envie uma foto da galeria.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhuma câmera foi encontrada neste dispositivo. Você pode enviar uma foto.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'A câmera está em uso por outro aplicativo. Feche-o e tente de novo.'
  }
  if (!window.isSecureContext) {
    return 'A câmera só funciona em uma conexão segura (HTTPS). Use o envio de foto.'
  }
  return 'Não foi possível abrir a câmera. Você também pode enviar uma foto.'
}

export function CameraDialog({ open, onOpenChange, onCapture }: CameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('starting')
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setStatus('starting')
    setError('')

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('getUserMedia indisponível', 'NotSupportedError')
      }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1600 },
            height: { ideal: 1600 },
          },
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        } else {
          throw error
        }
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      if (!cancelled) setStatus('ready')
    }

    start().catch((reason: unknown) => {
      if (cancelled) return
      setStatus('error')
      setError(cameraErrorMessage(reason))
    })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [open, facingMode, attempt])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.94))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-4 border-white/10 bg-[#0c0c10] p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Camera className="size-5 text-primary" /> Tirar foto
          </DialogTitle>
          <DialogDescription>
            Permita o acesso à câmera. A imagem fica apenas no seu navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/5] max-h-[60vh] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[68%] w-[68%] rounded-full border border-white/35 shadow-[0_0_0_999px_rgba(0,0,0,0.22)]" />
          </div>

          {status !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#08080a]/85 px-8 text-center">
              {status === 'starting' ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm text-white/70">Abrindo a câmera...</p>
                </>
              ) : (
                <>
                  <CameraOff className="size-9 text-white/50" />
                  <p className="max-w-xs text-sm leading-relaxed text-white/70">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
                    <RotateCcw /> Tentar de novo
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))}
            disabled={status !== 'ready'}
            className="text-white/70"
          >
            <RefreshCcw /> Virar câmera
          </Button>
          <button
            type="button"
            onClick={capture}
            disabled={status !== 'ready'}
            aria-label="Capturar foto"
            className="group grid size-16 place-items-center rounded-full border-2 border-white/80 bg-white/10 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="size-11 rounded-full bg-white transition group-active:scale-90" />
          </button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white/70">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
