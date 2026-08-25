import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Approvals from '@/pages/Approvals'
import Clients from '@/pages/Clients'
import Content from '@/pages/Content'
import ContentCalendar from '@/pages/ContentCalendar'
import Dashboard from '@/pages/Dashboard'
import DesignSystem from '@/pages/DesignSystem'
import ForgotPassword from '@/pages/ForgotPassword'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Settings from '@/pages/Settings'
import Team from '@/pages/Team'
import { applyTheme, usePrefsStore } from '@/store/usePrefsStore'

function ThemeEffect() {
  const theme = usePrefsStore((s) => s.theme)
  useEffect(() => applyTheme(theme), [theme])
  return null
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <ThemeEffect />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />

          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="calendario" element={<ContentCalendar />} />
            <Route path="conteudo" element={<Content />} />
            <Route path="aprovacoes" element={<Approvals />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="equipe" element={<Team />} />
            <Route path="configuracoes" element={<Settings />} />
            <Route path="design-system" element={<DesignSystem />} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
