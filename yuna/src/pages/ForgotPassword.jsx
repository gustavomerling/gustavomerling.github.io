import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MailCheck, Send } from 'lucide-react'

import { ThemedLogo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')

  function submit(event) {
    event.preventDefault()
    setState('sending')
    window.setTimeout(() => setState('sent'), 700)
  }

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 py-14">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para o login
        </Link>

        <ThemedLogo className="h-6 w-auto" />

        {state === 'sent' ? (
          <div className="mt-8 space-y-4">
            <span className="grid size-10 place-items-center rounded-full bg-success/12 text-success">
              <MailCheck className="size-5" />
            </span>
            <h1 className="font-display text-[2.35rem] leading-tight">
              Confira sua <span className="italic">caixa</span>.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Se existir uma conta para <span className="text-foreground">{email}</span>, o link de
              redefinição chega em alguns minutos. O link expira em 30 minutos.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild>
                <Link to="/login">Voltar para o login</Link>
              </Button>
              <Button variant="ghost" onClick={() => setState('idle')}>
                Usar outro e-mail
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="font-display text-[2.35rem] leading-tight">
              Recuperar o <span className="italic">acesso</span>.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Informe o e-mail cadastrado e enviaremos um link para você criar uma senha nova.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
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
              <Button type="submit" className="w-full" disabled={state === 'sending'}>
                {state === 'sending' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Send />
                    Enviar link de redefinição
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground">
              Continua sem acesso? Fale com o administrador da sua conta na Yuna.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
