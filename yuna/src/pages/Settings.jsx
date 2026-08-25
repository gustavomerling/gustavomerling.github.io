import { useState } from 'react'
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ROLES } from '@/lib/mock-data'
import { abilitiesFor } from '@/lib/permissions'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { usePrefsStore } from '@/store/usePrefsStore'

const NOTIFICATION_LABELS = {
  aprovacoes: ['Aprovações pendentes', 'Avisar quando uma peça precisar do meu retorno'],
  publicacoes: ['Publicações', 'Avisar quando uma peça for publicada'],
  resumoSemanal: ['Resumo semanal', 'Receber o consolidado da semana por e-mail'],
  mencoes: ['Menções e comentários', 'Avisar quando alguém me mencionar em uma pauta'],
}

export default function Settings() {
  const role = useAuthStore((s) => s.role)
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const theme = usePrefsStore((s) => s.theme)
  const setTheme = usePrefsStore((s) => s.setTheme)
  const notifications = usePrefsStore((s) => s.notifications)
  const toggleNotification = usePrefsStore((s) => s.toggleNotification)
  const resetData = useDataStore((s) => s.resetData)

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    jobTitle: profile?.jobTitle ?? '',
  })

  const abilities = abilitiesFor(role)

  function saveProfile(event) {
    event.preventDefault()
    updateProfile(form)
    toast.success('Perfil atualizado')
  }

  return (
    <>
      <PageHeader
        eyebrow="Sua conta"
        title="Configurações"
        description="Perfil, aparência, notificações e os dados desta demonstração."
      />

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Dados pessoais</CardTitle>
              <CardDescription>
                Você está navegando como {ROLES[role]?.label}. Trocar de papel substitui o perfil
                pelo usuário de exemplo daquele papel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="max-w-md space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome-perfil">Nome</Label>
                  <Input
                    id="nome-perfil"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-perfil">E-mail</Label>
                  <Input
                    id="email-perfil"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo-perfil">Cargo</Label>
                  <Input
                    id="cargo-perfil"
                    value={form.jobTitle}
                    onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  />
                </div>
                <Button type="submit">Salvar alterações</Button>
              </form>

              <Separator className="my-6" />

              <div>
                <p className="text-sm font-medium">Permissões deste papel</p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(abilities).map(([key, value]) => (
                    <p
                      key={key}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span
                        className={`size-1.5 rounded-full ${value ? 'bg-success dark:bg-primary' : 'bg-border-strong'}`}
                      />
                      {key}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Tema</CardTitle>
              <CardDescription>
                A escolha fica salva neste navegador e vale para toda a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {[
                ['light', 'Claro', Sun],
                ['dark', 'Escuro', Moon],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex w-36 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                    theme === value
                      ? 'border-primary/60 bg-primary/[0.06]'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="text-sm">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {value === 'light' ? 'Bege e verde escuro' : 'Azul noite e verde claro'}
                  </span>
                </button>
              ))}
              <div className="flex w-36 flex-col items-start gap-2 rounded-xl border border-dashed border-border p-4 opacity-60">
                <Monitor className="size-4" />
                <span className="text-sm">Sistema</span>
                <span className="text-xs text-muted-foreground">
                  Não disponível na demonstração
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Avisos</CardTitle>
              <CardDescription>
                Nada é enviado de verdade — as preferências ficam salvas localmente.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {Object.entries(NOTIFICATION_LABELS).map(([key, [title, description]]) => (
                <div key={key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    className="ml-auto"
                    checked={notifications[key]}
                    onCheckedChange={() => toggleNotification(key)}
                    aria-label={title}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Dados da demonstração</CardTitle>
              <CardDescription>
                Clientes, pautas e preferências ficam no localStorage do seu navegador. Nenhuma
                informação sai daqui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm">Restaurar o conteúdo original</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Volta clientes e pautas ao estado inicial, descartando o que você criou ou
                  alterou.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    resetData()
                    toast.success('Dados restaurados')
                  }}
                >
                  <RotateCcw />
                  Restaurar dados
                </Button>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-sm">Chaves usadas</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>
                    <code>yuna:auth</code> — sessão e papel atual
                  </li>
                  <li>
                    <code>yuna:data</code> — clientes e pautas
                  </li>
                  <li>
                    <code>yuna:prefs</code> — tema, sidebar e notificações
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
