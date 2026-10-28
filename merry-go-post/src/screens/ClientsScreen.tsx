import { Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SearchInput, matches } from '../components/SearchInput';
import { StoredImage } from '../components/StoredImage';
import { Button, EmptyState } from '../components/ui';
import { COLOR_ROLES } from '../lib/color';
import { navigate } from '../lib/router';
import { useDb } from '../store/db';

export function ClientsScreen() {
  const userId = useDb((s) => s.currentUserId);
  const allClients = useDb((s) => s.clients);
  const posts = useDb((s) => s.posts);
  const [query, setQuery] = useState('');
  const mine = useMemo(
    () => allClients.filter((c) => c.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt),
    [allClients, userId],
  );
  const clients = mine.filter((c) => matches(`${c.name} ${c.profile.handle}`, query));

  return (
    <div className="min-h-full">
      <AppHeader
        crumbs={[{ label: 'Clientes' }]}
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/clients/new')}>
            Novo cliente
          </Button>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          {mine.length > 0 && <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente ou @" />}
        </div>
        {mine.length > 0 && clients.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhum cliente encontrado para “{query}”.</p>}
        {mine.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="Nenhum cliente ainda">
            <p>Cadastre logo, cores, fontes e o perfil social do cliente. Todo carrossel usa essa identidade.</p>
            <Button variant="primary" className="mt-4" icon={<Plus size={16} />} onClick={() => navigate('/clients/new')}>
              Cadastrar cliente
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => {
              const count = posts.filter((p) => p.clientId === c.id).length;
              return (
                <a
                  key={c.id}
                  href={`#/clients/${c.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-zinc-100" style={{ background: c.colors.primary }}>
                      {c.profile.avatar ? (
                        <StoredImage id={c.profile.avatar} className="h-full w-full object-cover" />
                      ) : c.logos.negative ? (
                        <StoredImage id={c.logos.negative} className="h-9 w-9 object-contain" />
                      ) : (
                        <span className="text-xl font-bold" style={{ color: c.colors.light }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-zinc-900">{c.name}</div>
                      <div className="truncate text-sm text-zinc-500">{c.profile.handle ? `@${c.profile.handle.replace(/^@/, '')}` : 'sem perfil social'}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {COLOR_ROLES.map((r) => (
                        <span key={r} className="h-6 w-6 rounded-full border-2 border-white shadow-sm" style={{ background: c.colors[r] }} />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-500">
                      {count} {count === 1 ? 'post' : 'posts'}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
