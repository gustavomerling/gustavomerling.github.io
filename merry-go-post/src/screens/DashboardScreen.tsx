import { LayoutTemplate, Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SearchInput, matches } from '../components/SearchInput';
import { StoredImage } from '../components/StoredImage';
import { Button, NewItemCard, cx } from '../components/ui';
import { COLOR_ROLES } from '../lib/color';
import { navigate } from '../lib/router';
import { useDb } from '../store/db';
import { TemplatesTab } from './TemplatesTab';

export type DashboardTab = 'clients' | 'templates';

/** Painel inicial: abas de clientes e de templates. */
export function DashboardScreen({ tab }: { tab: DashboardTab }) {
  const createTemplate = useDb((s) => s.createTemplate);
  return (
    <div className="min-h-full">
      <AppHeader
        crumbs={[{ label: tab === 'clients' ? 'Clientes' : 'Templates' }]}
        actions={
          tab === 'clients' ? (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/clients/new')}>
              Novo cliente
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate(`/templates/${createTemplate()}`)}>
              Novo template
            </Button>
          )
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex gap-1 border-b border-zinc-200">
          {(
            [
              ['clients', '/clients', <Users key="i" size={16} />, 'Clientes'],
              ['templates', '/templates', <LayoutTemplate key="i" size={16} />, 'Templates'],
            ] as const
          ).map(([key, to, icon, label]) => (
            <a
              key={key}
              href={`#${to}`}
              className={cx(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition',
                tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-zinc-500 hover:text-zinc-800',
              )}
            >
              {icon}
              {label}
            </a>
          ))}
        </nav>
        {tab === 'clients' ? <ClientsTab /> : <TemplatesTab />}
      </main>
    </div>
  );
}

function ClientsTab() {
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
    <>
      {mine.length > 0 && (
        <div className="mb-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente ou @" />
        </div>
      )}
        {mine.length > 0 && clients.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhum cliente encontrado para “{query}”.</p>}
        {(
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NewItemCard
              shape="row"
              label="Novo cliente"
              hint={mine.length ? 'Logo, cores, fontes e perfil social' : 'Todo carrossel usa a identidade do cliente'}
              onClick={() => navigate('/clients/new')}
            />
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
    </>
  );
}
