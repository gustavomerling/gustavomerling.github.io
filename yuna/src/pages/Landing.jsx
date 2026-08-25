import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import AOS from 'aos'
import 'aos/dist/aos.css'
import {
  ArrowRight,
  CalendarCheck,
  CheckCheck,
  LayoutGrid,
  Moon,
  Smartphone,
  Sun,
  Users,
} from 'lucide-react'

import { Logo, ThemedLogo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { usePrefsStore } from '@/store/usePrefsStore'

const PILLARS = [
  {
    icon: CalendarCheck,
    title: 'Calendário editorial',
    text: 'Todo o mês em uma tela: o que está em produção, o que espera aprovação e o que já foi publicado.',
  },
  {
    icon: Smartphone,
    title: 'Preview real da peça',
    text: 'Cada pauta é vista como feed, carrossel, stories ou reels antes de sair — no Instagram, Facebook e LinkedIn.',
  },
  {
    icon: CheckCheck,
    title: 'Aprovação sem ruído',
    text: 'O cliente aprova ou pede ajuste no mesmo lugar em que vê a peça. Sem planilha, sem grupo de mensagens.',
  },
  {
    icon: Users,
    title: 'Papéis definidos',
    text: 'Administração, operação, comercial e cliente enxergam exatamente o que precisam enxergar.',
  },
]

const NUMBERS = [
  { value: '190', label: 'peças por mês em produção' },
  { value: '6', label: 'contas ativas na carteira' },
  { value: '2 dias', label: 'ciclo médio de aprovação' },
  { value: '98%', label: 'das pautas publicadas no prazo' },
]

const SECTIONS = [
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'numeros', label: 'Números' },
  { id: 'processo', label: 'Processo' },
]

export default function Landing() {
  const theme = usePrefsStore((s) => s.theme)
  const toggleTheme = usePrefsStore((s) => s.toggleTheme)

  useEffect(() => {
    AOS.init({ duration: 650, easing: 'ease-out-cubic', once: true, offset: 60 })
    return () => AOS.refreshHard()
  }, [])

  // O app roda em HashRouter: um href="#secao" viraria rota. Rolamos na mão.
  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <ThemedLogo className="h-5 w-auto shrink-0" />
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {SECTIONS.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </Button>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:ml-4"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button asChild size="sm">
            <Link to="/login">
              Acessar plataforma
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(70% 55% at 12% 0%, color-mix(in oklab, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(60% 50% at 95% 20%, color-mix(in oklab, var(--info) 22%, transparent) 0%, transparent 62%)',
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
          <div className="space-y-7" data-aos="fade-up">
            <p className="text-xs tracking-wide text-muted-foreground">
              Plataforma Yuna · marketing e comunicação
            </p>
            <h1 className="font-display text-[3.1rem] leading-[1.02] sm:text-[4.1rem]">
              O processo criativo raramente acontece de uma vez{' '}
              <span className="italic">só</span>.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Ele se desenvolve aos poucos, entre momentos de foco, pausas para refletir e novas
              perspectivas que surgem no caminho. A plataforma organiza esse percurso — da pauta
              ao post publicado — sem tirar o tempo de quem cria.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Entrar na sua área
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={() => scrollToSection('plataforma')}>
                Ver como funciona
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Demonstração navegável. Nenhum dado sai do seu navegador.
            </p>
          </div>

          <div className="relative" data-aos="fade-left" data-aos-delay="150">
            <div
              className="relative overflow-hidden rounded-2xl p-8 text-[#efece5] shadow-[var(--shadow-lg)]"
              style={{ background: 'var(--verde-escuro)' }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(80% 65% at 18% 12%, rgba(176,193,217,0.12) 0%, transparent 55%)',
                }}
              />
              <Logo variant="stacked" color="#efece5" className="relative h-24 w-24" />
              <p className="relative mt-8 font-display text-3xl leading-snug">
                Criar também é conversar com o <span className="italic">mundo</span>.
              </p>
              <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-[#efece5]/15 pt-6">
                {NUMBERS.slice(0, 2).map((n) => (
                  <div key={n.label}>
                    <p className="stat text-4xl">{n.value}</p>
                    <p className="mt-1 text-xs leading-snug text-[#efece5]/70">{n.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plataforma" className="border-t border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl space-y-3" data-aos="fade-up">
            <p className="text-xs tracking-wide text-muted-foreground">A plataforma</p>
            <h2 className="font-display text-[2.6rem] leading-[1.1]">
              Quatro coisas resolvidas no mesmo lugar
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PILLARS.map((p, i) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
                  data-aos="fade-up"
                  data-aos-delay={i * 90}
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="mt-4 text-base font-medium">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="numeros" className="border-t border-border/70 bg-surface-soft py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map((n, i) => (
              <div key={n.label} data-aos="fade-up" data-aos-delay={i * 90}>
                <p className="stat text-5xl text-primary">{n.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{n.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="processo" className="border-t border-border/70 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3" data-aos="fade-up">
            <p className="text-xs tracking-wide text-muted-foreground">Como o time trabalha</p>
            <h2 className="font-display text-[2.6rem] leading-[1.1]">
              Da pauta ao post, com o cliente acompanhando
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cada etapa tem um responsável e um estado visível. Nada avança sem alguém saber, e
              nada trava esperando um retorno que ninguém pediu.
            </p>
          </div>

          <ol className="space-y-4">
            {[
              ['Pauta', 'A operação cria a pauta e escolhe plataforma e formato.'],
              ['Criação', 'A peça é montada e vista no preview antes de qualquer envio.'],
              ['Aprovação', 'O cliente aprova ou pede ajuste com um comentário.'],
              ['Publicação', 'A pauta entra no calendário e vira métrica na visão geral.'],
            ].map(([title, text], i) => (
              <li
                key={title}
                className="flex gap-4 rounded-xl border border-border bg-card p-5"
                data-aos="fade-left"
                data-aos-delay={i * 90}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border/70 py-20">
        <div className="mx-auto max-w-3xl px-5 text-center" data-aos="zoom-in">
          <LayoutGrid className="mx-auto size-5 text-muted-foreground" />
          <h2 className="mt-5 font-display text-[2.6rem] leading-[1.1]">
            Entre e navegue como admin, operação, comercial ou cliente
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            A troca de papel fica no menu do usuário, no topo da plataforma.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link to="/login">
              Acessar plataforma
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/70 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>yuna · marketing &amp; comunicação</span>
          <span className="sm:ml-auto">
            © 2026 · demonstração de interface · todos os direitos reservados
          </span>
        </div>
      </footer>
    </div>
  )
}
