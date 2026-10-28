import JSZip from 'jszip';
import { domToBlob } from 'modern-screenshot';
import { SLIDE_WIDTH } from './formats';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'carrossel';

async function settle(root: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) => (img.complete ? img.decode().catch(() => {}) : new Promise((r) => (img.onload = img.onerror = r)))),
  );
  // Dois frames: deixa o ajuste automático de texto rodar depois das fontes.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

const render = async (node: HTMLElement, height: number) => {
  await settle(node);
  return domToBlob(node, { width: SLIDE_WIDTH, height, scale: 1, type: 'image/png' });
};

function download(blob: Blob, fileName: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Gera um PNG por slide (1080px de largura) e baixa tudo num .zip. */
export async function exportSlidesZip(nodes: HTMLElement[], height: number, name: string, onProgress?: (done: number) => void) {
  const zip = new JSZip();
  const base = slug(name);
  for (let i = 0; i < nodes.length; i++) {
    zip.file(`${base}-${String(i + 1).padStart(2, '0')}.png`, await render(nodes[i], height));
    onProgress?.(i + 1);
  }
  download(await zip.generateAsync({ type: 'blob' }), `${base}.zip`);
}

/** Um slide só, como PNG. */
export async function exportSlidePng(node: HTMLElement, height: number, name: string) {
  download(await render(node, height), `${slug(name)}.png`);
}
