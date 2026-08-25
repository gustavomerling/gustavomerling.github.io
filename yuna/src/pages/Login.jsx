import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Moon, Sun } from 'lucide-react'

import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES, USERS } from '@/lib/mock-data'
import { useAuthStore } from '@/store/useAuthStore'
import { usePrefsStore } from '@/store/usePrefsStore'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.61-5.15 3.61-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.93l-3.86-3c-1.08.72-2.45 1.15-4.09 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.26a7.2 7.2 0 0 1 0-4.52V6.65H1.29a12 12 0 0 0 0 10.7l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.65l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const theme = usePrefsStore((s) => s.theme)
  const toggleTheme = usePrefsStore((s) => s.toggleTheme)

  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState(USERS.admin.email)
  const [password, setPassword] = useState('yuna2026')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(null)

  function pickRole(next) {
    setRole(next)
    setEmail(USERS[next]?.email ?? '')
  }

  function submit(event, provider = 'email') {
    event?.preventDefault()
    setPending(provider)
    // Autenticação simulada — apenas um atraso para dar sensação de rede.
    window.setTimeout(() => {
      login({
        email: provider === 'google' ? USERS[role]?.email : email,
        role,
        provider,
      })
      navigate('/app')
    }, 650)
  }

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-[#f5f3ec] lg:grid lg:grid-cols-[1.15fr_1fr] dark:bg-background">
      <aside
        className="relative isolate flex min-h-[46vh] flex-col overflow-hidden p-8 text-[#efece5] sm:p-12 lg:min-h-svh lg:p-16"
        style={{ background: 'var(--verde-escuro)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(80% 65% at 18% 12%, rgba(176,193,217,0.10) 0%, transparent 55%), radial-gradient(70% 55% at 95% 95%, rgba(13,50,38,0.85) 0%, transparent 60%)',
          }}
        />

        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo color="#efece5" className="h-7 w-auto" />
        </Link>

        <div className="mt-auto max-w-lg space-y-6 pt-14">
          <p className="text-xs tracking-wide text-[#efece5]/60">Plataforma Yuna</p>
          <p className="font-display text-[2.5rem] leading-[1.08] sm:text-[3.1rem]">
            O processo criativo raramente acontece de uma vez{' '}
            <span className="italic">só</span>.
          </p>
          <p className="text-sm leading-relaxed text-[#efece5]/75">
            Ele se desenvolve aos poucos, entre momentos de foco, pausas para refletir e novas
            perspectivas que surgem no caminho.
          </p>
          <p className="font-display text-2xl text-[#efece5]/90">
            Criar também é conversar com o <span className="italic">mundo</span>.
          </p>
        </div>

        <p className="mt-14 text-xs text-[#efece5]/45">
          yuna · marketing &amp; comunicação · © 2026 · todos os direitos reservados
        </p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-14 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-xs tracking-wide text-muted-foreground">Acessar plataforma</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
          </div>

          <h1 className="font-display text-[2.5rem] leading-tight">
            Entrar na sua <span className="italic">área</span>.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use o e-mail cadastrado para acessar o painel da agência ou o portal do cliente.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="perfil">Entrar como</Label>
              <Select value={role} onValueChange={pickRole}>
                <SelectTrigger id="perfil" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLES).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label} — {USERS[r.id]?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Simulação: o papel escolhido define o que a plataforma mostra.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  to="/esqueci-minha-senha"
                  className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={pending !== null}>
              {pending === 'email' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending !== null}
            onClick={(e) => submit(e, 'google')}
          >
            {pending === 'google' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <GoogleMark />
                Continuar com o Google
              </>
            )}
          </Button>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Não tem acesso?{' '}
            <Link to="/" className="text-foreground underline-offset-4 hover:underline">
              Fale com o seu contato na Yuna
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
