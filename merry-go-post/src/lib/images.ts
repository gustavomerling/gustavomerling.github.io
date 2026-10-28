import { clear, createStore, del, entries, get, keys, set, setMany } from 'idb-keyval';
import { uid } from './id';
import { IMAGE_DB } from './legacy';

const store = createStore(IMAGE_DB, 'images');
const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

const MAX_SIDE = 2400;

/** Reduz imagens grandes antes de guardar: o slide final tem no máximo 1920px. */
async function shrink(file: Blob): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (ratio === 1 && file.size < 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), keepAlpha ? 'image/webp' : 'image/jpeg', 0.9),
  );
}

export async function saveImage(file: Blob): Promise<string> {
  const id = uid();
  const blob = await shrink(file);
  await set(id, blob, store);
  urlCache.set(id, URL.createObjectURL(blob));
  return id;
}

export function getImageUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return Promise.resolve(cached);
  let p = pending.get(id);
  if (!p) {
    p = get<Blob>(id, store).then((blob) => {
      pending.delete(id);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    });
    pending.set(id, p);
  }
  return p;
}

export const peekImageUrl = (id: string) => urlCache.get(id) ?? null;

/** Apaga do IndexedDB toda imagem que não está mais referenciada. */
export async function collectGarbage(referenced: Set<string>) {
  const all = (await keys(store)) as string[];
  await Promise.all(
    all
      .filter((k) => !referenced.has(k))
      .map((k) => {
        const url = urlCache.get(k);
        if (url) URL.revokeObjectURL(url);
        urlCache.delete(k);
        return del(k, store);
      }),
  );
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Todas as imagens como data URL, para o backup. */
export async function dumpImages(): Promise<Record<string, string>> {
  const all = (await entries(store)) as [string, Blob][];
  const out: Record<string, string> = {};
  for (const [k, blob] of all) out[k] = await blobToDataUrl(blob);
  return out;
}

/** Restaura as imagens de um backup (substitui as atuais). */
export async function restoreImages(map: Record<string, string>) {
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  await clear(store);
  const items = await Promise.all(Object.entries(map).map(async ([k, url]) => [k, await (await fetch(url)).blob()] as [string, Blob]));
  await setMany(items, store);
}
