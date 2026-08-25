import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Building2, Mail, MapPin, Phone, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useScope } from '@/hooks/use-scope'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'

const STATUS_STYLE = {
  ativo: 'border-transparent bg-success/15 text-success dark:text-primary',
  onboarding: 'border-transparent bg-info/25 text-info-foreground dark:text-foreground',
  pausado: 'border-transparent bg-muted text-muted-foreground',
}

const PLANS = ['Gestão completa', 'Conteúdo social', 'Comunicação institucional', 'Performance + social']

function NewClientDialog() {
  const addClient = useDataStore((s) => s.addClient)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    handle: '',
    segment: '',
    plan: PLANS[1],
    contact: '',
    email: '',
    phone: '',
    city: '',
    monthly: '',
    postsMonth: '',
  })

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    addClient({
      ...form,
      monthly: Number(form.monthly) || 0,
      postsMonth: Number(form.postsMonth) || 0,
      handle: form.handle.startsWith('@') ? form.handle : `@${form.handle}`,
    })
    toast.success('Cliente cadastrado', { description: form.name })
    setOpen(false)
    setForm({
      name: '',
      handle: '',
      segment: '',
      plan: PLANS[1],
      contact: '',
      email: '',
      phone: '',
      city: '',
      monthly: '',
      postsMonth: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Novo cliente</DialogTitle>
          <DialogDescription>
            O cadastro entra como onboarding e fica salvo no seu navegador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da conta</Label>
              <Input
                id="nome"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handle">@ do perfil</Label>
              <Input
                id="handle"
                value={form.handle}
                onChange={(e) => set('handle', e.target.value)}
                placeholder="@minhamarca"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="segmento">Segmento</Label>
              <Input
                id="segmento"
                value={form.segment}
                onChange={(e) => set('segment', e.target.value)}
                placeholder="Ex.: Alimentação"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plano">Plano</Label>
              <Select value={form.plan} onValueChange={(v) => set('plan', v)}>
                <SelectTrigger id="plano" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contato">Contato responsável</Label>
              <Input
                id="contato"
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Joinville, SC"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-cliente">E-mail</Label>
              <Input
                id="email-cliente"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(47) 90000-0000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fee">Fee mensal (R$)</Label>
              <Input
                id="fee"
                type="number"
                min="0"
                value={form.monthly}
                onChange={(e) => set('monthly', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="volume">Peças por mês</Label>
              <Input
                id="volume"
                type="number"
                min="0"
                value={form.postsMonth}
                onChange={(e) => set('postsMonth', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit">Cadastrar cliente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Clients() {
  const role = useAuthStore((s) => s.role)
  const { clients, posts } = useScope()
  const updateClient = useDataStore((s) => s.updateClient)
  const removeClient = useDataStore((s) => s.removeClient)

  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)

  const manage = can(role, 'gerenciarClientes')
  const showRevenue = can(role, 'verFaturamento')
  const open = clients.find((c) => c.id === openId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) =>
      q ? `${c.name} ${c.segment} ${c.contact} ${c.handle}`.toLowerCase().includes(q) : true,
    )
  }, [clients, query])

  const total = clients.reduce((sum, c) => sum + (c.monthly ?? 0), 0)

  return (
    <>
      <PageHeader
        eyebrow="Carteira"
        title="Clientes"
        description={
          showRevenue
            ? `${clients.length} contas · R$ ${total.toLocaleString('pt-BR')} de receita recorrente mensal`
            : `${clients.length} contas na carteira`
        }
        actions={manage && <NewClientDialog />}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, segmento ou contato"
          className="h-9 pl-8"
        />
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Segmento</TableHead>
                <TableHead className="hidden lg:table-cell">Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Pautas</TableHead>
                {showRevenue && <TableHead className="text-right">Fee</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const count = posts.filter((p) => p.clientId === c.id).length
                return (
                  <TableRow
                    key={c.id}
                    onClick={() => setOpenId(c.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-medium text-white"
                          style={{ background: c.color }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-sm">{c.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.handle}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {c.segment}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {c.plan}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('font-normal capitalize', STATUS_STYLE[c.status])}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="stat hidden text-right text-sm sm:table-cell">
                      {count}
                    </TableCell>
                    {showRevenue && (
                      <TableCell className="stat text-right text-sm">
                        R$ {(c.monthly ?? 0).toLocaleString('pt-BR')}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {filtered.length === 0 && (
        <Card className="mt-4">
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          </CardContent>
        </Card>
      )}

      <Sheet open={Boolean(open)} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-medium text-white"
                    style={{ background: open.color }}
                  >
                    {open.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <SheetTitle className="font-display text-2xl font-normal">
                      {open.name}
                    </SheetTitle>
                    <SheetDescription>
                      {open.handle} · {open.segment}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Contato</CardTitle>
                    <CardDescription>{open.contact}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5" />
                      {open.email}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-3.5" />
                      {open.phone || '—'}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {open.city || '—'}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Pautas', posts.filter((p) => p.clientId === open.id).length],
                    ['Meta/mês', open.postsMonth ?? 0],
                    showRevenue
                      ? ['Fee', `R$ ${(open.monthly ?? 0).toLocaleString('pt-BR')}`]
                      : ['Plano', open.plan?.split(' ')[0]],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="stat mt-0.5 text-xl">{value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Cliente desde{' '}
                  {open.since
                    ? format(parseISO(open.since), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : '—'}
                </p>

                {manage && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Select
                      value={open.status}
                      onValueChange={(v) => {
                        updateClient(open.id, { status: v })
                        toast.success('Status atualizado')
                      }}
                    >
                      <SelectTrigger size="sm" className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => {
                        removeClient(open.id)
                        setOpenId(null)
                        toast('Cliente removido junto com as pautas')
                      }}
                    >
                      <Trash2 />
                      Remover
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
