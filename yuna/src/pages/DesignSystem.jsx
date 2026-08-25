import { useState } from 'react'
import { ArrowRight, Check, Copy, Heart, Moon, Send, Sun, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/AppShell'
import { Logo, LogoMark, ThemedLogo } from '@/components/brand/Logo'
import { Creative } from '@/components/social/creative'
import { Facebook, Instagram, Linkedin } from '@/components/social/platform-icons'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { CREATIVES, STATUS } from '@/lib/mock-data'
import { usePrefsStore } from '@/store/usePrefsStore'

const PALETTE = [
  {
    group: 'Marca',
    tokens: [
      ['--verde-escuro', 'Verde escuro', 'Cor institucional, fundos e primário no claro'],
      ['--verde-medio', 'Verde médio', 'Hover do primário e estado de sucesso'],
      ['--verde-oliva', 'Oliva', 'Destaque e segunda série dos gráficos'],
      ['--azul-marinho', 'Azul marinho', 'Secundário e tipografia sobre bege'],
      ['--azul-claro', 'Azul claro', 'Informativo e quarta série dos gráficos'],
      ['--bege', 'Bege', 'Fundo institucional e texto sobre verde'],
    ],
  },
  {
    group: 'Superfícies',
    tokens: [
      ['--background', 'Background', 'Fundo da página'],
      ['--surface', 'Surface', 'Cartões e campos'],
      ['--surface-soft', 'Surface soft', 'Faixas e blocos alternados'],
      ['--surface-strong', 'Surface strong', 'Separadores cheios e muted'],
      ['--border', 'Border', 'Traço padrão'],
      ['--border-strong', 'Border strong', 'Traço de ênfase'],
    ],
  },
  {
    group: 'Semântica',
    tokens: [
      ['--primary', 'Primary', 'Ação principal'],
      ['--secondary', 'Secondary', 'Ação secundária'],
      ['--accent', 'Accent', 'Realce pontual'],
      ['--success', 'Success', 'Aprovado e publicado'],
      ['--warning', 'Warning', 'Aguardando retorno'],
      ['--destructive', 'Destructive', 'Erro e remoção'],
    ],
  },
]

const TYPE_SCALE = [
  ['Display 4xl', 'font-display text-[4.1rem] leading-[1.02]', 'Instrument Serif · hero da landing'],
  ['Display 3xl', 'font-display text-[3.1rem] leading-[1.05]', 'Instrument Serif · títulos de entrada'],
  ['Display 2xl', 'font-display text-[2.6rem] leading-[1.1]', 'Instrument Serif · seções'],
  ['Display xl', 'font-display text-[2.1rem] leading-tight', 'Instrument Serif · título de página'],
  ['Display lg', 'font-display text-2xl', 'Instrument Serif · título de cartão e modal'],
  ['Body base', 'text-base', 'Inter Tight · texto corrido'],
  ['Body sm', 'text-sm', 'Inter Tight · interface'],
  ['Body xs', 'text-xs', 'Inter Tight · legenda — piso de 12 px'],
]

const NUMERIC_SCALE = [
  ['5xl', 'stat text-5xl', '98%'],
  ['4xl', 'stat text-4xl', '37.900'],
  ['2xl', 'stat text-2xl', '1.952'],
  ['base', 'stat text-base', '18/24'],
]

function Swatch({ token, name, usage }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(`var(${token})`)
        toast.success('Token copiado', { description: `var(${token})` })
      }}
      className="group flex w-full items-center gap-3 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <span
        className="size-10 shrink-0 rounded-md border border-border/60"
        style={{ background: `var(${token})` }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{usage}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <code className="hidden sm:inline">{token}</code>
        <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </button>
  )
}

function Block({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function DesignSystem() {
  const theme = usePrefsStore((s) => s.theme)
  const toggleTheme = usePrefsStore((s) => s.toggleTheme)
  const [checked, setChecked] = useState(true)
  const [enabled, setEnabled] = useState(true)

  return (
    <>
      <PageHeader
        eyebrow="Referência"
        title="Design system"
        description="Os tokens, a tipografia e os componentes que a plataforma usa. Clique em uma cor para copiar o token."
        actions={
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun /> : <Moon />}
            Ver no tema {theme === 'dark' ? 'claro' : 'escuro'}
          </Button>
        }
      />

      <div className="space-y-4">
        <Block
          title="Marca"
          description="Os arquivos originais são PNG; o componente recorta e repinta a arte conforme o fundo."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className="flex items-center justify-center rounded-lg p-6"
              style={{ background: 'var(--verde-escuro)' }}
            >
              <Logo color="#efece5" className="h-8 w-auto" />
            </div>
            <div
              className="flex items-center justify-center rounded-lg p-6"
              style={{ background: 'var(--azul-marinho)' }}
            >
              <LogoMark color="#efece5" className="size-16" />
            </div>
            <div className="flex items-center justify-center rounded-lg border border-border bg-surface p-6">
              <ThemedLogo className="h-8 w-auto" />
            </div>
          </div>
        </Block>

        <Block title="Cores" description="Todas as cores saem de custom properties e trocam com o tema.">
          <div className="space-y-5">
            {PALETTE.map((group) => (
              <div key={group.group}>
                <p className="mb-2 text-xs tracking-wide text-muted-foreground">{group.group}</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {group.tokens.map(([token, name, usage]) => (
                    <Swatch key={token} token={token} name={name} usage={usage} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Block
            title="Tipografia"
            description="Instrument Serif nos títulos, Inter Tight na interface. Peso máximo 600 — nada de font-black, nada de caixa alta."
          >
            <div className="space-y-4">
              {TYPE_SCALE.map(([name, className, usage]) => (
                <div key={name} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{name}</span>
                    <code className="text-xs text-muted-foreground">{className}</code>
                  </div>
                  <p className={`mt-1 ${className}`}>Criar é conversar com o mundo</p>
                  <p className="mt-1 text-xs text-muted-foreground">{usage}</p>
                </div>
              ))}
            </div>
          </Block>

          <div className="space-y-4">
            <Block
              title="Números"
              description="Petrona 700 com dígitos tabulares. Todo número da interface usa a classe stat."
            >
              <div className="space-y-3">
                {NUMERIC_SCALE.map(([name, className, sample]) => (
                  <div key={name} className="flex items-baseline gap-3">
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">{name}</span>
                    <span className={className}>{sample}</span>
                    <code className="ml-auto text-xs text-muted-foreground">{className}</code>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Raio e sombra" description="Um raio base, três níveis de sombra.">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['radius', 'rounded-lg', 'var(--shadow-soft)'],
                  ['radius-md', 'rounded-md', 'var(--shadow-md)'],
                  ['radius-xl', 'rounded-xl', 'var(--shadow-lg)'],
                ].map(([name, radius, shadow]) => (
                  <div key={name} className="space-y-1.5 text-center">
                    <div
                      className={`h-16 border border-border bg-surface ${radius}`}
                      style={{ boxShadow: shadow }}
                    />
                    <p className="text-xs text-muted-foreground">{name}</p>
                  </div>
                ))}
              </div>
            </Block>
          </div>
        </div>

        <Block title="Botões" description="Seis variantes, quatro tamanhos.">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Principal</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="ghost">Fantasma</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">
                <Trash2 />
                Remover
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Pequeno</Button>
              <Button>Padrão</Button>
              <Button size="lg">
                Grande
                <ArrowRight />
              </Button>
              <Button size="icon" aria-label="Ícone">
                <Heart />
              </Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </div>
        </Block>

        <div className="grid gap-4 xl:grid-cols-2">
          <Block title="Formulários" description="Campos, rótulos e controles.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ds-input">Campo de texto</Label>
                <Input id="ds-input" placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ds-select">Seleção</Label>
                <Select defaultValue="instagram">
                  <SelectTrigger id="ds-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ds-textarea">Texto longo</Label>
                <Textarea id="ds-textarea" rows={3} placeholder="Legenda da publicação" />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="ds-check" checked={checked} onCheckedChange={setChecked} />
                  <Label htmlFor="ds-check">Marcado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="ds-switch" checked={enabled} onCheckedChange={setEnabled} />
                  <Label htmlFor="ds-switch">Ativo</Label>
                </div>
              </div>
            </div>
          </Block>

          <div className="space-y-4">
            <Block title="Status das pautas" description="Um selo por etapa do fluxo.">
              <div className="flex flex-wrap gap-2">
                {Object.keys(STATUS).map((key) => (
                  <StatusBadge key={key} status={key} />
                ))}
              </div>
            </Block>

            <Block title="Selos e indicadores">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Padrão</Badge>
                  <Badge variant="secondary">Secundário</Badge>
                  <Badge variant="outline">Contorno</Badge>
                  <Badge variant="destructive">Erro</Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="stat">64%</span>
                  </div>
                  <Progress value={64} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </Block>

            <Block title="Alertas">
              <Alert>
                <Check />
                <AlertTitle>Peça aprovada</AlertTitle>
                <AlertDescription>
                  A publicação entra no calendário na data programada.
                </AlertDescription>
              </Alert>
            </Block>
          </div>
        </div>

        <Block
          title="Plataformas e peças"
          description="Ícones das redes e os gradientes que servem de placeholder quando a pauta não tem imagem."
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {[
                [Instagram, 'Instagram'],
                [Facebook, 'Facebook'],
                [Linkedin, 'LinkedIn'],
              ].map(([Icon, label]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="size-4" />
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.keys(CREATIVES).map((key) => (
                <div key={key} className="space-y-1.5">
                  <Creative
                    creative={key}
                    ratio="square"
                    className="rounded-lg"
                    headline="Aa"
                    compact
                  />
                  <p className="text-xs text-muted-foreground">{key}</p>
                </div>
              ))}
            </div>
          </div>
        </Block>

        <Block title="Abas" description="Usadas em conteúdo e configurações.">
          <Tabs defaultValue="um">
            <TabsList>
              <TabsTrigger value="um">Primeira</TabsTrigger>
              <TabsTrigger value="dois">Segunda</TabsTrigger>
              <TabsTrigger value="tres">Terceira</TabsTrigger>
            </TabsList>
            <TabsContent value="um" className="mt-3 text-sm text-muted-foreground">
              O conteúdo da primeira aba.
            </TabsContent>
            <TabsContent value="dois" className="mt-3 text-sm text-muted-foreground">
              O conteúdo da segunda aba.
            </TabsContent>
            <TabsContent value="tres" className="mt-3 text-sm text-muted-foreground">
              O conteúdo da terceira aba.
            </TabsContent>
          </Tabs>
        </Block>

        <Block title="Avisos" description="Toasts pela biblioteca sonner, herdando o tema.">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('Peça aprovada', { description: 'Casa Bertoldi' })}
            >
              Sucesso
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast('Enviado para aprovação', { description: 'Aguardando o cliente' })}
            >
              <Send />
              Neutro
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.error('Não foi possível publicar')}
            >
              Erro
            </Button>
          </div>
        </Block>
      </div>
    </>
  )
}
