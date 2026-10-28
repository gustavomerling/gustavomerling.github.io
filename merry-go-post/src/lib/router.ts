import { useSyncExternalStore } from 'react';

/** Roteamento por hash: o GitHub Pages não tem fallback de SPA, então #/rota nunca dá 404. */
const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useHashPath() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    read,
  );
}

export const navigate = (path: string) => {
  window.location.hash = path;
};

/** match('/clients/:id', '/clients/abc') → { id: 'abc' } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
