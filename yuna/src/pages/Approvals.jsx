import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCheck, MessageSquare, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/AppShell'
import { PostPreview } from '@/components/social/PostPreview'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useScope } from '@/hooks/use-scope'
import { FORMATS, PLATFORMS } from '@/lib/mock-data'
import { can } from '@/lib/permissions'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'

export default function Approvals() {
  const role = useAuthStore((s) => s.role)
  const { posts, clientById } = useScope()
  const setPostStatus = useDataStore((s) => s.setPostStatus)
  const updatePost = useDataStore((s) => s.updatePost)

  const [adjusting, setAdjusting] = useState(null)
  const [comment, setComment] = useState('')

  const isClient = can(role, 'aprovarComoCliente')
  const queue = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'aprovacao' || p.status === 'ajuste')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [posts],
  )

  function approve(post) {
    setPostStatus(post.id, 'aprovado')
    toast.success('Peça aprovada', { description: post.title })
  }

  function requestChange(event) {
    event.preventDefault()
    updatePost(adjusting.id, { status: 'ajuste', notes: comment })
    toast('Ajuste solicitado', { description: adjusting.title })
    setAdjusting(null)
    setComment('')
  }

  return (
    <>
      <PageHeader
        eyebrow={isClient ? 'Sua aprovação' : 'Acompanhamento'}
        title="Aprovações"
        description={
          isClient
            ? 'Veja como cada peça fica publicada e aprove ou peça ajuste no mesmo lugar.'
            : 'Peças que estão com o cliente ou voltaram com pedido de ajuste.'
        }
      />

      {queue.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCheck className="mx-auto size-6 text-success dark:text-primary" />
            <p className="mt-3 font-display text-2xl">Fila limpa.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nenhuma peça esperando retorno neste momento.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {queue.map((post) => {
          const client = clientById(post.clientId)
          return (
            <Card key={post.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={post.status} />
                  <span className="text-xs text-muted-foreground">
                    {client?.name} · {PLATFORMS[post.platform]?.label}{' '}
                    {FORMATS[post.format]?.label?.toLowerCase()} ·{' '}
                    {format(parseISO(post.date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <CardTitle className="font-display text-2xl font-normal">{post.title}</CardTitle>
                <CardDescription>{post.caption}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <PostPreview post={post} client={client} />

                {post.notes && (
                  <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Último comentário</p>
                      <p className="mt-0.5 text-sm">{post.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {isClient ? (
                    <>
                      <Button size="sm" onClick={() => approve(post)}>
                        <ThumbsUp />
                        Aprovar publicação
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjusting(post)
                          setComment(post.notes ?? '')
                        }}
                      >
                        <MessageSquare />
                        Pedir ajuste
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {post.status === 'aprovacao'
                          ? 'Aguardando o cliente. Troque para o papel Cliente no menu do topo para simular a aprovação.'
                          : 'O cliente pediu ajuste — a peça volta para a operação.'}
                      </span>
                      {post.status === 'ajuste' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() => {
                            setPostStatus(post.id, 'aprovacao')
                            toast.success('Reenviado para aprovação')
                          }}
                        >
                          Reenviar para aprovação
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={Boolean(adjusting)} onOpenChange={(v) => !v && setAdjusting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">Pedir ajuste</DialogTitle>
            <DialogDescription>
              Descreva o que precisa mudar. A operação recebe o comentário junto com a peça.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={requestChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="comentario">Comentário</Label>
              <Textarea
                id="comentario"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex.: trocar a foto do segundo slide e revisar o preço."
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">Enviar ajuste</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
