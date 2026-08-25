import { Navigate, Outlet } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/store/useAuthStore'
import { usePrefsStore } from '@/store/usePrefsStore'

export function AppShell() {
  const authenticated = useAuthStore((s) => s.authenticated)
  const sidebarCollapsed = usePrefsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = usePrefsStore((s) => s.setSidebarCollapsed)

  if (!authenticated) return <Navigate to="/login" replace />

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <div className="flex-1 px-3 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-xs tracking-wide text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-[2.1rem] leading-tight">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
