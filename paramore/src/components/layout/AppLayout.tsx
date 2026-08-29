import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CursorFX from '@/components/fx/CursorFX'
import AnimatedOutlet from '@/components/layout/AnimatedOutlet'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <CursorFX />
      <Navbar />
      <main className="flex-1">
        <AnimatedOutlet />
      </main>
      <Footer />
    </div>
  )
}