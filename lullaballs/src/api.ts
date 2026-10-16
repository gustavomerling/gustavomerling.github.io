import type { Song } from './audio/notes';
import type { Post } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export const api = {
  songs: () => fetch('/api/songs').then((r) => json<Song[]>(r)),
  posts: () => fetch('/api/posts').then((r) => json<Post[]>(r)),
  savePost: (p: Post) =>
    fetch(`/api/posts/${p.date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    }).then((r) => json(r)),
  deletePost: (date: string) => fetch(`/api/posts/${date}`, { method: 'DELETE' }).then((r) => json(r)),
  deleteExport: (date: string) => fetch(`/api/export/${date}`, { method: 'DELETE' }).then((r) => json(r)),
  uploadExport: (date: string, blob: Blob) =>
    fetch(`/api/export/${date}`, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: blob })
      .then((r) => json<{ file: string; path: string }>(r)),
};
