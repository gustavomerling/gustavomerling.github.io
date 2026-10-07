import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { HashRouter } from 'react-router'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './components/motion/motion.css'
import App from './App.tsx'

// Hash routing: o GitHub Pages não tem fallback de SPA dentro de /helena-28/dist/
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* respeita o "reduzir movimento" do sistema */}
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <App />
      </HashRouter>
    </MotionConfig>
  </StrictMode>,
)
