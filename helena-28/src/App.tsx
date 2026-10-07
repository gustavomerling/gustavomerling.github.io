import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { DateLock } from './components/DateLock'

// Cada página baixa só quando é aberta: a tela de trava e o QR code carregam leves
const Home = lazy(() => import('./pages/Home'))
const DesignSystem = lazy(() => import('./pages/DesignSystem'))
const QrCode = lazy(() => import('./pages/QrCode'))

function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--pink-100)' }} />}>
      <Routes>
        {/* LP e design system só abrem em 21/10 (prévia: ?preview=1) */}
        <Route
          path="/"
          element={
            <DateLock>
              <Home />
            </DateLock>
          }
        />
        <Route
          path="/design-system"
          element={
            <DateLock>
              <DesignSystem />
            </DateLock>
          }
        />
        <Route path="/qr-code" element={<QrCode />} />
      </Routes>
    </Suspense>
  )
}

export default App
