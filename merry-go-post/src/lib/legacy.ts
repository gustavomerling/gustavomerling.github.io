import { createStore, del, entries, setMany } from 'idb-keyval';

/**
 * O app se chamava "wonder-post". Mesma origem (gustavomerling.github.io), então os dados
 * antigos continuam acessíveis: copia para as chaves novas na primeira abertura e apaga as velhas.
 */
const LOCAL_KEYS: [string, string][] = [
  ['wonder-post:db', 'merry-go-post:db'],
  ['wonder-post:ui', 'merry-go-post:ui'],
];

export const IMAGE_DB = 'merry-go-post';
const LEGACY_IMAGE_DB = 'wonder-post';

/** Síncrono: precisa rodar antes de as stores do zustand lerem o localStorage. */
export function migrateLegacyLocalStorage() {
  try {
    for (const [from, to] of LOCAL_KEYS) {
      const old = localStorage.getItem(from);
      if (old !== null && localStorage.getItem(to) === null) localStorage.setItem(to, old);
      if (old !== null) localStorage.removeItem(from);
    }
  } catch {
    // Sem acesso ao storage (aba privada restrita): segue sem migrar.
  }
}

/** Move as imagens do IndexedDB antigo para o novo. */
export async function migrateLegacyImages() {
  try {
    const known = (await indexedDB.databases?.())?.some((d) => d.name === LEGACY_IMAGE_DB);
    if (known === false) return;
    const legacy = createStore(LEGACY_IMAGE_DB, 'images');
    const all = await entries(legacy);
    if (all.length) await setMany(all, createStore(IMAGE_DB, 'images'));
    await Promise.all(all.map(([k]) => del(k, legacy)));
    indexedDB.deleteDatabase(LEGACY_IMAGE_DB);
  } catch {
    // Banco antigo inexistente ou bloqueado: nada a migrar.
  }
}
