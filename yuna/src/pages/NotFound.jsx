import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react'

import { ThemedLogo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'

export default function NotFound() {
  const location = useLocation()
  const authenticated = useAuthStore((s) => s.authenticated)

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg">
        <ThemedLogo className="h-6 w-auto" />

        <p className="stat mt-12 text-[5.5rem] text-primary/25">404</p>

        <h1 className="mt-4 font-display text-[2.5rem] leading-tight">
          Essa página saiu do <span className="italic">roteiro</span>.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O endereço <code className="text-foreground">{location.pathname}</code> não existe na
          plataforma. Pode ter sido movido, ou o link que trouxe você até aqui está desatualizado.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {authenticated ? (
            <Button asChild>
              <Link to="/app">
                <LayoutDashboard />
                Ir para a visão geral
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">
                <Compass />
                Acessar plataforma
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft />
              Voltar para o início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
