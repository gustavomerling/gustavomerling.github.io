import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LayoutGrid, Plus, Search, Send, Trash2 } from 'lucide-react'

import { Facebook, Instagram, Linkedin } from '@/components/social/platform-icons'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/AppShell'
import { Creative } from '@/components/social/creative'
import { ImageUpload } from '@/components/social/ImageUpload'
import { SlidesUpload } from '@/components/social/SlidesUpload'
import { PostPreview } from '@/components/social/PostPreview'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useScope } from '@/hooks/use-scope'
import { CREATIVES, FORMATS, PLATFORMS, STATUS } from '@/lib/mock-data'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'

const PLATFORM_ICON = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin }

function NewPostDialog({ clients }) {
  const addPost = useDataStore((s) => s.addPost)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    clientId: clients[0]?.id ?? '',
    platform: 'instagram',
    format: 'feed',
    creative: 'verde',
    image: undefined,
    slides: [],
    date: '2026-09-08T10:00',
    caption: '',
    hashtags: '',
  })

  const availableFormats = Object.values(FORMATS).filter((f) =>
    f.platforms.includes(form.platform),
  )

  function set(key, value) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'platform') {
        const ok = Object.values(FORMATS).filter((x) => x.platforms.includes(value))
        if (!ok.some((x) => x.id === f.format)) next.format = ok[0]?.id ?? 'feed'
      }
      return next
    })
  }

  function submit(event) {
    event.preventDefault()
    const carrossel = form.format === 'carrossel'
    const slides = carrossel ? form.slides : undefined
    addPost({
      ...form,
      author: 'Marina Alves',
      slides: slides?.length ? slides : undefined,
      // a capa da pauta é o primeiro slide, para a lista e para os outros formatos
      image: carrossel ? slides?.[0]?.image : form.image,
    })
    toast.success('Pauta criada', { description: form.title })
    setOpen(false)
    setForm((f) => ({
      ...f,
      title: '',
      caption: '',
      hashtags: '',
      image: undefined,
      slides: [],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Nova pauta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Nova pauta</DialogTitle>
          <DialogDescription>
            A peça entra como rascunho e pode ser enviada para aprovação depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex.: Bastidores da nova coleção"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={form.clientId} onValueChange={(v) => set('clientId', v)}>
              <SelectTrigger id="cliente" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plataforma">Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => set('platform', v)}>
                <SelectTrigger id="plataforma" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PLATFORMS).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="formato">Formato</Label>
              <Select value={form.format} onValueChange={(v) => set('format', v)}>
                <SelectTrigger id="formato" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFormats.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data e hora</Label>
              <Input
                id="data"
                type="datetime-local"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="criativo">Peça</Label>
              <Select value={form.creative} onValueChange={(v) => set('creative', v)}>
                <SelectTrigger id="criativo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CREATIVES).map((k) => (
                    <SelectItem key={k} value={k}>
                      <span
                        className="mr-1.5 inline-block size-3 rounded-full align-middle"
                        style={{ background: CREATIVES[k] }}
                      />
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.format === 'carrossel' ? (
            <SlidesUpload
              slides={form.slides}
              creative={form.creative}
              onChange={(slides) => set('slides', slides)}
            />
          ) : (
            <ImageUpload
              value={form.image}
              creative={form.creative}
              onChange={(image) => set('image', image)}
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="legenda">Legenda</Label>
            <Textarea
              id="legenda"
              value={form.caption}
              onChange={(e) => set('caption', e.target.value)}
              rows={4}
              placeholder="O texto que acompanha a publicação"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              value={form.hashtags}
              onChange={(e) => set('hashtags', e.target.value)}
              placeholder="#marca #campanha"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Criar pauta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PostRow({ post, client, onOpen }) {
  const Icon = PLATFORM_ICON[post.platform] ?? Instagram

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40"
    >
      <Creative
        creative={post.creative}
        image={post.image}
        ratio="square"
        className="w-14 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm">{post.title}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {client?.name} · {FORMATS[post.format]?.label} ·{' '}
          {format(parseISO(post.date), "d MMM, HH:mm", { locale: ptBR })}
        </p>
      </div>
      <StatusBadge status={post.status} className="shrink-0 text-xs" />
    </button>
  )
}

export default function Content() {
  const role = useAuthStore((s) => s.role)
  const { posts, clients, clientById, global } = useScope()
  const updatePost = useDataStore((s) => s.updatePost)
  const setPostStatus = useDataStore((s) => s.setPostStatus)
  const removePost = useDataStore((s) => s.removePost)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [clientFilter, setClientFilter] = useState('todos')
  const [openId, setOpenId] = useState(null)

  const editable = can(role, 'editarConteudo')
  const open = posts.find((p) => p.id === openId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts
      .filter((p) => (statusFilter === 'todos' ? true : p.status === statusFilter))
      .filter((p) => (clientFilter === 'todos' ? true : p.clientId === clientFilter))
      .filter((p) =>
        q ? `${p.title} ${p.caption} ${p.hashtags}`.toLowerCase().includes(q) : true,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [posts, query, statusFilter, clientFilter])

  return (
    <>
      <PageHeader
        eyebrow="Produção"
        title="Conteúdo"
        description="Todas as pautas da carteira, com preview de como cada peça fica publicada."
        actions={can(role, 'criarConteudo') && <NewPostDialog clients={clients} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, legenda ou hashtag"
            className="h-9 pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.values(STATUS).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {global && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="grade">Grade do perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4 space-y-2">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutGrid className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhuma pauta encontrada com esses filtros.
                </p>
              </CardContent>
            </Card>
          )}
          {filtered.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              client={clientById(p.clientId)}
              onOpen={() => setOpenId(p.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="grade" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Como as peças se organizam no perfil — útil para checar o ritmo visual antes de
                publicar.
              </p>
              <div className="mx-auto grid max-w-md grid-cols-3 gap-0.5">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpenId(p.id)}
                    className="relative transition-opacity hover:opacity-80"
                  >
                    <Creative creative={p.creative} image={p.image} ratio="square" />
                    <span
                      className={cn(
                        'absolute top-1 right-1 size-1.5 rounded-full',
                        p.status === 'publicado' ? 'bg-white' : 'bg-white/50',
                      )}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={open.status} />
                  <span className="text-xs text-muted-foreground">
                    {clientById(open.clientId)?.name} ·{' '}
                    {format(parseISO(open.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <SheetTitle className="font-display text-3xl font-normal">
                  {open.title}
                </SheetTitle>
                <SheetDescription>
                  Criado por {open.author ?? 'equipe Yuna'} · {PLATFORMS[open.platform]?.label}{' '}
                  {FORMATS[open.format]?.label?.toLowerCase()}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-6">
                <PostPreview post={open} client={clientById(open.clientId)} />

                <div className="space-y-3">
                  {editable &&
                    (open.format === 'carrossel' ? (
                      <SlidesUpload
                        slides={open.slides ?? []}
                        creative={open.creative}
                        onChange={(slides) =>
                          updatePost(open.id, {
                            slides: slides.length ? slides : undefined,
                            image: slides[0]?.image ?? open.image,
                          })
                        }
                      />
                    ) : (
                      <ImageUpload
                        label="Peça publicada"
                        value={open.image}
                        creative={open.creative}
                        onChange={(image) => updatePost(open.id, { image })}
                      />
                    ))}

                  <div className="space-y-1.5">
                    <Label htmlFor="legenda-edit">Legenda</Label>
                    <Textarea
                      id="legenda-edit"
                      rows={4}
                      value={open.caption}
                      readOnly={!editable}
                      onChange={(e) => updatePost(open.id, { caption: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hashtags-edit">Hashtags</Label>
                    <Input
                      id="hashtags-edit"
                      value={open.hashtags ?? ''}
                      readOnly={!editable}
                      onChange={(e) => updatePost(open.id, { hashtags: e.target.value })}
                    />
                  </div>
                  {open.notes && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Observação interna</p>
                      <p className="mt-1 text-sm">{open.notes}</p>
                    </div>
                  )}
                </div>

                {open.status === 'publicado' && (
                  <div className="grid grid-cols-4 gap-3 rounded-lg border border-border p-3">
                    {[
                      ['Alcance', open.metrics?.reach],
                      ['Curtidas', open.metrics?.likes],
                      ['Comentários', open.metrics?.comments],
                      ['Salvos', open.metrics?.saves],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="stat text-xl">{(value ?? 0).toLocaleString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                )}

                {editable && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Select
                      value={open.status}
                      onValueChange={(v) => {
                        setPostStatus(open.id, v)
                        toast.success('Status atualizado', { description: STATUS[v]?.label })
                      }}
                    >
                      <SelectTrigger size="sm" className="w-[190px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(STATUS).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {open.status !== 'aprovacao' && open.status !== 'publicado' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPostStatus(open.id, 'aprovacao')
                          toast.success('Enviado para aprovação do cliente')
                        }}
                      >
                        <Send />
                        Enviar para aprovação
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => {
                        removePost(open.id)
                        setOpenId(null)
                        toast('Pauta removida')
                      }}
                    >
                      <Trash2 />
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
