import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Printer,
  RotateCcw,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { AlbumPicker } from '@/components/AlbumPicker'
import { BadgePreview } from '@/components/BadgePreview'
import { CameraDialog } from '@/components/CameraDialog'
import { CropDialog, type CropState } from '@/components/CropDialog'
import { PhotoField } from '@/components/PhotoField'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminMode } from '@/hooks/use-admin-mode'
import { useBadgeVariant } from '@/hooks/use-badge-variant'
import { useAlbumCoversReady } from '@/hooks/use-album-covers'
import { ensureFontsReady, useFontsReady } from '@/hooks/use-fonts'
import { useImage } from '@/hooks/use-image'
import { createBadgeCanvas, PHOTO_FRAMES, type BadgeData } from '@/lib/badge'
import { preloadAlbumCovers } from '@/lib/album-covers'
import {
  DEFAULT_ALBUM_ID,
  getAlbum,
  type AlbumId,
} from '@/lib/albums'
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
  const isAdmin = useAdminMode()
  const variant = useBadgeVariant()
  const fontsReady = useFontsReady()
  const coversReady = useAlbumCoversReady()
  const assetsReady = fontsReady && coversReady
  const [name, setName] = useState('')
  const [role, setRole] = useState('Administrador')
  const [albumId, setAlbumId] = useState<AlbumId>(DEFAULT_ALBUM_ID)
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [originalSrc, setOriginalSrc] = useState<string | null>(null)
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  const photo = useImage(photoSrc)
  const album = getAlbum(albumId)
  const badgeData = useMemo<BadgeData>(
    () => ({ name, role, album, isAdmin, variant, photo }),
    [name, role, album, isAdmin, variant, photo],
  )

  const canDownload = Boolean(name.trim() && photo && assetsReady)
  const dirty =
    Boolean(name.trim()) ||
    Boolean(photoSrc) ||
    role !== 'Administrador' ||
    albumId !== DEFAULT_ALBUM_ID

  useEffect(() => {
    document.title = isAdmin
      ? 'Crachá da equipe · Paramore Brasil'
      : 'Crachá Paramore Brasil'
  }, [isAdmin])

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
    setAlbumId(DEFAULT_ALBUM_ID)
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
      await Promise.all([ensureFontsReady(), preloadAlbumCovers()])
      await new Promise((resolve) => window.setTimeout(resolve, 60))
      const data: BadgeData = { ...badgeData, photo }
      const base = `cracha-paramore-${isAdmin ? 'equipe' : 'fa'}-${slugify(name)}-${album.id}${variant > 1 ? `-v${variant}` : ''}`

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
          <a
            href="#/"
            className="group flex shrink-0 flex-col leading-none"
            aria-label="Paramore Brasil — voltar ao modo fã"
          >
            <span className="whitespace-nowrap font-display text-[18px] font-bold leading-none tracking-[-0.045em] text-white transition group-hover:text-white/85 sm:text-[21px]">
              PARAMORE
            </span>
            <span className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.52em] text-primary sm:text-[9px]">
              Brasil
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-white/35 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              100% no navegador
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] sm:px-2.5 sm:text-[10px]',
                isAdmin
                  ? 'border-amber-200/25 bg-amber-200/[0.06] text-amber-200/90'
                  : 'border-white/12 bg-white/[0.03] text-white/55',
              )}
            >
              {isAdmin ? <ShieldCheck className="size-3.5" /> : <Sparkles className="size-3.5" />}
              {isAdmin ? 'Modo equipe' : 'Área de fãs'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-8 sm:py-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            <span className="size-1.5 rounded-full bg-primary" />
            Gerador de crachá · fã-clube oficial
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2.7rem,7vw,4.9rem)] font-bold leading-[0.94] tracking-[-0.05em] text-balance text-white">
            <span className="block">Crachá do</span>
            <span className="text-primary">Paramore Brasil</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45 sm:text-[15px]">
            Escolha uma foto, assine seu nome e marque o álbum que te acompanha. A gente transforma
            tudo em um crachá do Paramore Brasil pronto para compartilhar ou imprimir.
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

        {isAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200/20 bg-[linear-gradient(110deg,rgba(232,200,115,0.08),rgba(255,85,0,0.04))] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-amber-200/25 bg-amber-200/10 text-amber-200">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-amber-50">Modo equipe ativado</p>
                <p className="text-xs leading-relaxed text-amber-100/45">
                  Você está criando um crachá de administrador do Paramore Brasil.
                </p>
              </div>
            </div>
            <a
              href="#/"
              className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[11px] font-medium text-amber-100/55 transition hover:bg-white/5 hover:text-amber-100 sm:self-center"
            >
              <ArrowLeft className="size-3.5" /> Sair do modo equipe
            </a>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(350px,0.98fr)] lg:items-start lg:gap-6">
          <Card className="gap-0 overflow-hidden border-white/10 bg-card/80 py-0 shadow-2xl shadow-black/25 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white/90">Personalize seu crachá</p>
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
                  title="Escolha sua era"
                  hint="Qual álbum você levaria para sempre no peito?"
                />
                <AlbumPicker value={albumId} onChange={setAlbumId} />
              </section>

              {isAdmin && (
                <section className="space-y-4 px-5 py-5 sm:px-6">
                  <StepHeading
                    step="04"
                    title="Cargo na equipe"
                    hint="Este texto aparece abaixo do seu nome no crachá de administrador."
                  />
                  <div className="relative">
                    <Label htmlFor="badge-role" className="sr-only">
                      Cargo na equipe
                    </Label>
                    <Input
                      id="badge-role"
                      value={role}
                      onChange={(event) => setRole(event.target.value.slice(0, 24))}
                      placeholder="Ex.: Administrador"
                      maxLength={24}
                      className="h-11 border-amber-200/15 bg-white/[0.03] pr-14 text-sm placeholder:text-white/25 focus-visible:border-amber-200/40 focus-visible:ring-amber-200/15"
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
                              ? 'border-amber-200/40 bg-amber-200/10 text-amber-100'
                              : 'border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20 hover:text-white/75',
                          )}
                        >
                          {preset}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
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
            <p className="mt-2 max-w-xl">
              Projeto de fã, sem vínculo oficial com Paramore ou Hayley Williams. As capas dos
              álbuns pertencem aos seus respectivos detentores e são usadas aqui apenas em um
              projeto de fã, sem fins comerciais.
            </p>
          </div>
          <div className="sm:text-right">
            <p>Fotos e dados processados apenas no seu navegador.</p>
            <p className="mt-1">Feito para a fã-base brasileira.</p>
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
