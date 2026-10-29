import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/controls.css'
import './styles/bar.css'
import './styles/panels.css'
import './styles/overlays.css'
import './styles/piano.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
