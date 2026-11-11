import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Atualização do app instalado na tela inicial: o celular pode manter o app aberto por dias,
// então procura versão nova ao abrir, ao voltar para o app e a cada hora. Com autoUpdate,
// o service worker novo assume na hora e a página recarrega sozinha.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, reg) {
    if (!reg) return;
    const check = async () => {
      if (reg.installing || !navigator.onLine) return;
      try {
        // Pede o sw.js sem cache HTTP para não ficar preso numa versão antiga
        const res = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
        if (res.status === 200) await reg.update();
      } catch {
        /* sem rede: tenta de novo depois */
      }
    };
    check();
    setInterval(check, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
