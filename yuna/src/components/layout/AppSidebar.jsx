import { Link, useLocation } from 'react-router-dom'
import { LifeBuoy, Sparkles } from 'lucide-react'

import { Logo, LogoMark } from '@/components/brand/Logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ROLES } from '@/lib/mock-data'
import { navForRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'

export function AppSidebar() {
  const location = useLocation()
  const role = useAuthStore((s) => s.role)
  const posts = useDataStore((s) => s.posts)
  const { state } = useSidebar()

  const items = navForRole(role)
  const pending = posts.filter((p) => p.status === 'aprovacao').length
  const collapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-3">
        <Link
          to="/app"
          className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-opacity hover:opacity-80"
        >
          {collapsed ? (
            <LogoMark color="#efece5" className="h-7 w-7 shrink-0" />
          ) : (
            <Logo color="#efece5" className="h-6 w-auto shrink-0" />
          )}
          {!collapsed && (
            <span className="ml-auto rounded-full border border-sidebar-border px-2 py-0.5 text-xs text-sidebar-foreground/70">
              {ROLES[role]?.short}
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.to === '/app'
                    ? location.pathname === '/app' || location.pathname === '/app/'
                    : location.pathname.startsWith(item.to)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link to={item.to}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge === 'pendentes' && pending > 0 && (
                      <SidebarMenuBadge>{pending}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Central de ajuda">
              <Link to="/app/configuracoes">
                <LifeBuoy />
                <span>Central de ajuda</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground">
              <Sparkles className="size-3.5" />
              Ambiente de demonstração
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/65">
              Todos os dados ficam no seu navegador. Troque de papel no menu do topo para ver
              outras permissões.
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
