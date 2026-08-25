import { Mail, Shield } from 'lucide-react'

import { PageHeader } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ROLES, TEAM } from '@/lib/mock-data'
import { abilitiesFor } from '@/lib/permissions'

const ABILITY_LABEL = {
  verTodosClientes: 'Ver toda a carteira',
  criarConteudo: 'Criar pautas',
  editarConteudo: 'Editar pautas',
  publicar: 'Publicar',
  aprovarComoCliente: 'Aprovar como cliente',
  gerenciarClientes: 'Gerenciar clientes',
  verFaturamento: 'Ver faturamento',
}

export default function Team() {
  return (
    <>
      <PageHeader
        eyebrow="Agência"
        title="Equipe e permissões"
        description="Quem trabalha na conta e o que cada papel pode fazer dentro da plataforma."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Contas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TEAM.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {m.initials}
                        </span>
                        <span className="leading-tight">
                          <span className="block text-sm">{m.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {m.jobTitle}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {ROLES[m.role]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="stat hidden text-right text-sm sm:table-cell">
                      {m.clients}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Shield className="size-4" />
              Matriz de permissões
            </CardTitle>
            <CardDescription>O que cada papel enxerga e pode alterar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.values(ROLES).map((role) => {
              const abilities = abilitiesFor(role.id)
              const allowed = Object.entries(abilities).filter(([, v]) => v)
              return (
                <div key={role.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{role.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {role.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {allowed.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        Somente leitura
                      </span>
                    )}
                    {allowed.map(([key]) => (
                      <span
                        key={key}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {ABILITY_LABEL[key] ?? key}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base font-medium">Convidar alguém</CardTitle>
          <CardDescription>
            Nesta demonstração o convite não é enviado — o fluxo existe para mostrar a interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-3.5" />
            Convites saem do e-mail da agência com o papel já definido.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
