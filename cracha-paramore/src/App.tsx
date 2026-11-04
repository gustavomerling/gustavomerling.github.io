import { useMemo, useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Printer,
  RotateCcw,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { BadgePreview } from '@/components/BadgePreview'
import { CameraDialog } from '@/components/CameraDialog'
import { CropDialog, type CropState } from '@/components/CropDialog'
import { PalettePicker } from '@/components/PalettePicker'
import { PhotoField } from '@/components/PhotoField'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBadgeVariant } from '@/hooks/use-badge-variant'
import { ensureFontsReady, useFontsReady } from '@/hooks/use-fonts'
import { useImage } from '@/hooks/use-image'
import { createBadgeCanvas, PHOTO_FRAMES, type BadgeData } from '@/lib/badge'
import { DEFAULT_PALETTE_ID, getPalette, type PaletteId } from '@/lib/palettes'
import { canvasToCmykPdf, canvasToPng, downloadBlob, slugify } from '@/lib/export'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ROLE_PRESETS = ['Administrador', 'Moderador', 'Editor', 'Designer', 'Fotógrafo', 'Mídia']

function StepHeading({
  step,
  title,
  hint,
}: {
  step: string
  title: string
  hint: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 font-badge text-[15px] leading-none tracking-[0.12em] text-primary/85">
        {step}
      </span>
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/40">{hint}</p>
      </div>
    </div>
  )
}

export default function App() {
  const variant = useBadgeVariant()
  const assetsReady = useFontsReady()
  const [name, setName] = useState('')
  const [role, setRole] = useState('Administrador')
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID)
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [originalSrc, setOriginalSrc] = useState<string | null>(null)
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  const photo = useImage(photoSrc)
  const palette = getPalette(paletteId)
  const badgeData = useMemo<BadgeData>(
    () => ({ name, role, palette, variant, photo }),
    [name, role, palette, variant, photo],
  )

  const canDownload = Boolean(name.trim() && photo && assetsReady)
  const dirty =
    Boolean(name.trim()) ||
    Boolean(photoSrc) ||
    role !== 'Administrador' ||
    paletteId !== DEFAULT_PALETTE_ID

  const prepareSource = (source: string) => {
    const probe = new Image()
    probe.onload = () => {
      setOriginalSrc(source)
      setCropOpen(true)
    }
    probe.onerror = () => {
      toast.error('Formato de imagem não suportado', {
        description: 'Tente um arquivo JPG, PNG ou WebP.',
      })
    }
    probe.src = source
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Escolha um arquivo de imagem', {
        description: 'Aceitamos JPG, PNG e WebP.',
      })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Imagem muito grande', {
        description: 'O limite é de 20 MB.',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') prepareSource(reader.result)
      else toast.error('Não foi possível ler a imagem.')
    }
    reader.onerror = () => toast.error('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }

  const clearAll = () => {
    setName('')
    setRole('Administrador')
    setPaletteId(DEFAULT_PALETTE_ID)
    setPhotoSrc(null)
    setOriginalSrc(null)
    setBusy(null)
    toast('Campos limpos', { description: 'Pronto para começar de novo.' })
  }

  const download = async (kind: 'png' | 'pdf') => {
    if (!canDownload || !photo) {
      toast.error('Falta completar o crachá', {
        description: 'Informe seu nome e envie uma foto.',
      })
      return
    }

    setBusy(kind)
    try {
      await ensureFontsReady()
      await new Promise((resolve) => window.setTimeout(resolve, 60))
      const data: BadgeData = { ...badgeData, photo }
      const base = `cracha-paramore-equipe-${slugify(name)}-v${variant}-${palette.id}`

      if (kind === 'png') {
        const canvas = createBadgeCanvas(data, 300)
        const blob = await canvasToPng(canvas, 300)
        downloadBlob(blob, `${base}-300dpi.png`)
        toast.success('PNG pronto para baixar', {
          description: '300 DPI · 54 × 86 mm (CR80)',
        })
      } else {
        const canvas = createBadgeCanvas(data, 600)
        const blob = await canvasToCmykPdf(canvas, {
          title: `Crachá Paramore Brasil — ${name.trim()}`,
          author: 'Paramore Brasil',
        })
        downloadBlob(blob, `${base}-cmyk.pdf`)
        toast.success('PDF CMYK pronto para baixar', {
          description: '600 DPI · 54 × 86 mm (CR80)',
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível gerar o arquivo', {
        description: 'Tente novamente ou use outro navegador.',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grain relative min-h-dvh overflow-x-hidden">
      <Toaster position="top-center" richColors closeButton />

      <header className="relative z-10 mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex shrink-0 flex-col leading-none">
            <span className="whitespace-nowrap font-display text-[18px] font-bold leading-none tracking-[-0.045em] text-white sm:text-[21px]">
              PARAMORE
            </span>
            <span className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.52em] text-primary sm:text-[9px]">
              Brasil
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-white/35 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              100% no navegador
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:px-2.5 sm:text-[10px]">
              <ShieldCheck className="size-3.5" />
              Equipe
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-8 sm:py-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            <span className="size-1.5 rounded-full bg-primary" />
            Gerador de crachá · equipe
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2.7rem,7vw,4.9rem)] font-bold leading-[0.94] tracking-[-0.05em] text-balance text-white">
            <span className="block">Crachá da equipe</span>
            <span className="text-primary">Paramore Brasil</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45 sm:text-[15px]">
            Preencha nome, foto e função e escolha as cores. O crachá sai pronto para compartilhar
            ou imprimir.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white/40">
              <Ruler className="size-3.5 text-primary/80" /> 54 × 86 mm · CR80
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white/40">
              <ImageIcon className="size-3.5 text-primary/80" /> PNG 300 DPI
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white/40">
              <FileText className="size-3.5 text-primary/80" /> PDF CMYK 600 DPI
            </span>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(350px,0.98fr)] lg:items-start lg:gap-6">
          <Card className="gap-0 overflow-hidden border-white/10 bg-card/80 py-0 shadow-2xl shadow-black/25 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white/90">Personalize o crachá</p>
                  <p className="text-[11px] text-white/35">Leva menos de um minuto.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={!dirty || busy !== null}
                className="text-white/40 hover:text-white/80"
              >
                <RotateCcw /> Limpar
              </Button>
            </div>

            <div className="divide-y divide-white/6">
              <section className="space-y-4 px-5 py-5 sm:px-6">
                <StepHeading
                  step="01"
                  title="Seu nome"
                  hint="Como você quer aparecer no crachá?"
                />
                <div className="relative">
                  <Label htmlFor="badge-name" className="sr-only">
                    Seu nome
                  </Label>
                  <Input
                    id="badge-name"
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, 30))}
                    placeholder="Ex.: Ana Souza"
                    maxLength={30}
                    autoComplete="name"
                    autoCapitalize="words"
                    spellCheck={false}
                    className="h-12 border-white/10 bg-white/[0.03] pr-14 text-base placeholder:text-white/25"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-white/25">
                    {name.length}/30
                  </span>
                </div>
              </section>

              <section className="space-y-4 px-5 py-5 sm:px-6">
                <StepHeading
                  step="02"
                  title="Sua foto"
                  hint="Use uma foto nítida, com o rosto mais ou menos centralizado."
                />
                <PhotoField
                  photoSrc={photoSrc}
                  frame={PHOTO_FRAMES[variant]}
                  onFile={handleFile}
                  onCamera={() => setCameraOpen(true)}
                  onCrop={() => {
                    if (originalSrc) setCropOpen(true)
                  }}
                  onRemove={() => {
                    setPhotoSrc(null)
                    setOriginalSrc(null)
                  }}
                />
              </section>

              <section className="space-y-4 px-5 py-5 sm:px-6">
                <StepHeading
                  step="03"
                  title="Função na equipe"
                  hint="Aparece no campo FUNÇÃO do crachá."
                />
                <div className="relative">
                  <Label htmlFor="badge-role" className="sr-only">
                    Função na equipe
                  </Label>
                  <Input
                    id="badge-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value.slice(0, 24))}
                    placeholder="Ex.: Administrador"
                    maxLength={24}
                    className="h-11 border-white/10 bg-white/[0.03] pr-14 text-sm placeholder:text-white/25"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-white/25">
                    {role.length}/24
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PRESETS.map((preset) => {
                    const active = role.toLowerCase() === preset.toLowerCase()
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRole(preset)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                          active
                            ? 'border-primary/50 bg-primary/10 text-white'
                            : 'border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/75',
                        )}
                      >
                        {preset}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="space-y-4 px-5 py-5 sm:px-6">
                <StepHeading
                  step="04"
                  title="Cores"
                  hint="Escolha uma combinação de cores ou uma das versões em preto e branco."
                />
                <PalettePicker value={paletteId} onChange={setPaletteId} />
              </section>
            </div>
          </Card>

          <aside className="lg:sticky lg:top-6">
            <BadgePreview
              data={badgeData}
              assetsReady={assetsReady}
              ready={canDownload}
              busy={busy}
              onDownload={download}
            />
            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                <Printer className="size-3.5 text-primary/80" /> Pronto para imprimir
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
                O PDF sai no tamanho CR80 (54 × 86 mm) e em CMYK. Para um resultado de gráfica,
                imprima em papel de 300 g e faça o corte arredondado.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-[11px] leading-relaxed text-white/30 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white/55">
              PARAMORE <span className="text-primary">BRASIL</span>
            </p>
            <p className="mt-2 max-w-xl">Projeto de fã, sem vínculo oficial com o Paramore.</p>
          </div>
          <div className="sm:text-right">
            <p>Fotos e dados processados apenas no seu navegador.</p>
          </div>
        </div>
      </footer>

      <CameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(source) => {
          setOriginalSrc(source)
          setCropOpen(true)
        }}
      />
      <CropDialog
        open={cropOpen}
        imageSrc={originalSrc}
        frame={PHOTO_FRAMES[variant]}
        initial={cropState}
        onOpenChange={setCropOpen}
        onComplete={(source, state) => {
          setPhotoSrc(source)
          setCropState(state)
          toast.success('Foto adicionada', {
            description: 'Você pode ajustar o corte quando quiser.',
          })
        }}
      />
    </div>
  )
}
