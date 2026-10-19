import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@ui/App';
import { applySettings, settingsStore } from '@ui/services';
import './ui/styles.css';

applySettings(settingsStore.get());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
