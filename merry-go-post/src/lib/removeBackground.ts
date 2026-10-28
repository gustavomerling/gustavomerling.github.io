import { getImageUrl, saveImage } from './images';

type BgRemoval = typeof import('@imgly/background-removal');

/**
 * Carregada da CDN só no primeiro uso: empacotada, ela despeja ~24 MB de WASM no dist.
 * O pacote do npm fica só para os tipos (mesma versão).
 */
const CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
let lib: Promise<BgRemoval> | null = null;

/**
 * Remove o fundo no próprio navegador com @imgly/background-removal (AGPL-3.0).
 * O modelo (~40 MB, CDN da IMG.LY) também só é baixado no primeiro uso.
 */
export async function removeImageBackground(imageId: string, onProgress?: (pct: number) => void): Promise<string> {
  const url = await getImageUrl(imageId);
  if (!url) throw new Error('Imagem não encontrada');
  lib ??= import(/* @vite-ignore */ CDN) as Promise<BgRemoval>;
  const { removeBackground } = await lib;
  const blob = await removeBackground(url, {
    model: 'isnet_fp16',
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (key.startsWith('fetch') && total) onProgress?.(Math.round((current / total) * 100));
    },
  });
  return saveImage(blob);
}
