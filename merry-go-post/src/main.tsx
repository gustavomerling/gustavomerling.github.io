import './lib/boot';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ensureFont } from './lib/fonts';
import { migrateLegacyImages } from './lib/legacy';
import { runGarbageCollection } from './store/db';
import './styles.css';

ensureFont('Inter');

// As imagens do nome antigo precisam estar no lugar antes da primeira renderização.
migrateLegacyImages().finally(() => {
  // Limpa imagens órfãs (ex.: logo enviado num cadastro que não foi salvo).
  runGarbageCollection();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
