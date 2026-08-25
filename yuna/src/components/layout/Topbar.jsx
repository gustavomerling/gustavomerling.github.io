import { Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Check, LogOut, Moon, Repeat, Search, Settings, Sun, UserRound } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ROLES } from '@/lib/mock-data'
import { buildCrumbs } from '@/lib/routes'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { usePrefsStore } from '@/store/usePrefsStore'

export function Topbar({ crumbLabels }) {
  const location = useLocation()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const profile = useAuthStore((s) => s.profile)
  const setRole = useAuthStore((s) => s.setRole)
  const logout = useAuthStore((s) => s.logout)
  const theme = usePrefsStore((s) => s.theme)
  const toggleTheme = usePrefsStore((s) => s.toggleTheme)
  const pending = useDataStore((s) => s.posts.filter((p) => p.status === 'aprovacao').length)

  const crumbs = buildCrumbs(location.pathname, crumbLabels)
  const user = profile ?? { name: 'Convidado', email: '', initials: 'YN', jobTitle: '' }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-5" />

      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1
            return (
              <Fragment key={crumb.to}>
                <BreadcrumbItem className={i === 0 ? 'hidden sm:inline-flex' : undefined}>
                  {last ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!last && (
                  <BreadcrumbSeparator className={i === 0 ? 'hidden sm:block' : undefined} />
                )}
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente ou pauta"
            className="h-8 w-56 pl-8 text-xs"
            aria-label="Buscar"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative size-8" aria-label="Notificações">
          <Bell className="size-4" />
          {pending > 0 && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition-colors hover:bg-muted/70"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {user.initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROLES[role]?.label}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {user.jobTitle}
                {user.org ? ` · ${user.org}` : ''}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Repeat className="size-3" />
              Simular outro papel
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {Object.values(ROLES).map((r) => (
                <DropdownMenuItem
                  key={r.id}
                  onSelect={() => setRole(r.id)}
                  className="items-start gap-2"
                >
                  <Check
                    className={`mt-0.5 size-3.5 ${role === r.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="leading-tight">
                    <span className="block text-xs">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/app/configuracoes">
                <UserRound className="size-3.5" />
                Meu perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app/configuracoes">
                <Settings className="size-3.5" />
                Preferências
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} variant="destructive">
              <LogOut className="size-3.5" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
