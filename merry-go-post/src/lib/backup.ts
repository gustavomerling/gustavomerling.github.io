import { migrateDb, useDb, type CustomTemplate } from '../store/db';
import type { Client, Post, User } from '../types';
import { dumpImages, restoreImages } from './images';

interface BackupFile {
  app: 'merry-go-post' | 'wonder-post';
  version: 1;
  exportedAt: string;
  data: { users: User[]; clients: Client[]; posts: Post[]; templates?: CustomTemplate[] };
  images: Record<string, string>;
}

/** Baixa um .json com todos os usuários, clientes, posts e imagens deste navegador. */
export async function exportBackup() {
  const { users, clients, posts, templates } = useDb.getState();
  const file: BackupFile = {
    app: 'merry-go-post',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { users, clients, posts, templates },
    images: await dumpImages(),
  };
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `merry-go-post-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Substitui tudo pelo conteúdo do backup. */
export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>;
  // Backups do nome antigo (wonder-post) continuam valendo.
  if ((parsed.app !== 'merry-go-post' && parsed.app !== 'wonder-post') || !parsed.data) throw new Error('Este arquivo não é um backup do Merry Go Post.');
  const data = migrateDb(parsed.data as unknown as Record<string, unknown>);
  await restoreImages(parsed.images ?? {});
  useDb.getState().replaceAll({ users: data.users, clients: data.clients, posts: data.posts, templates: data.templates });
}

/** Espaço usado pelo site neste navegador (localStorage + IndexedDB). */
export async function storageUsage() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(1)} GB`;
