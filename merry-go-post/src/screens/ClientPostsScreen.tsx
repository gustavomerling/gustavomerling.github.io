import { Copy, LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SearchInput, matches } from '../components/SearchInput';
import { StoredImage } from '../components/StoredImage';
import { Button, EmptyState } from '../components/ui';
import { ensureFonts } from '../lib/fonts';
import { FORMATS } from '../lib/formats';
import { navigate } from '../lib/router';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { brandOf, useDb } from '../store/db';
import { NotFound } from './NotFound';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function ClientPostsScreen({ clientId }: { clientId: string }) {
  const client = useDb((s) => s.clients.find((c) => c.id === clientId));
  const allPosts = useDb((s) => s.posts);
  const createPost = useDb((s) => s.createPost);
  const duplicatePost = useDb((s) => s.duplicatePost);
  const deletePost = useDb((s) => s.deletePost);
  const [query, setQuery] = useState('');
  const all = useMemo(() => allPosts.filter((p) => p.clientId === clientId).sort((a, b) => b.updatedAt - a.updatedAt), [allPosts, clientId]);
  const posts = all.filter((p) => matches(`${p.title} ${p.caption}`, query));
  const brand = useMemo(() => (client ? brandOf(client) : null), [client]);

  useEffect(() => {
    if (client) ensureFonts(Object.values(client.fonts));
  }, [client]);

  if (!client || !brand) return <NotFound message="Esse cliente não existe mais." />;

  const newPost = () => navigate(`/posts/${createPost(client.id)}`);

  return (
    <div className="min-h-full">
      <AppHeader
        crumbs={[{ label: 'Clientes', to: '/clients' }, { label: client.name }]}
        actions={
          <>
            <Button icon={<Pencil size={15} />} onClick={() => navigate(`/clients/${client.id}/edit`)}>
              <span className="hidden sm:inline">Editar cliente</span>
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={newPost}>
              Criar post
            </Button>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full" style={{ background: client.colors.primary }}>
            {client.profile.avatar ? (
              <StoredImage id={client.profile.avatar} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold" style={{ color: client.colors.light }}>
                {client.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-zinc-500">
              {all.length} {all.length === 1 ? 'post' : 'posts'} · {client.fonts.base} / {client.fonts.highlight} / {client.fonts.ultra}
            </p>
          </div>
        </div>

        {all.length > 0 && (
          <div className="mb-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar post" />
          </div>
        )}
        {all.length > 0 && posts.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhum post encontrado para “{query}”.</p>}
        {all.length === 0 ? (
          <EmptyState icon={<LayoutTemplate size={22} />} title="Nenhum post ainda">
            <p>Cole o texto, envie as imagens e o carrossel é montado na hora.</p>
            <Button variant="primary" className="mt-4" icon={<Plus size={16} />} onClick={newPost}>
              Criar post
            </Button>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {posts.map((p) => (
              <div key={p.id} className="group">
                <a href={`#/posts/${p.id}`} className="block overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm transition group-hover:shadow-md">
                  {p.slides[0] ? (
                    <ScaledSlide format={p.format}>
                      <SlideView slide={p.slides[0]} index={0} total={p.slides.length} format={p.format} brand={brand} pagination={p.pagination} />
                    </ScaledSlide>
                  ) : (
                    <div className="grid aspect-[4/5] place-items-center text-sm text-zinc-400">Rascunho sem slides</div>
                  )}
                </a>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{p.title}</div>
                    <div className="text-xs text-zinc-500">
                      {p.slides.length} slides · {FORMATS[p.format].label} · {dateFmt.format(p.updatedAt)}
                    </div>
                  </div>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <Button size="sm" variant="ghost" title="Duplicar" icon={<Copy size={15} />} onClick={() => duplicatePost(p.id)} />
                    <Button
                      size="sm"
                      variant="danger"
                      title="Apagar"
                      icon={<Trash2 size={15} />}
                      onClick={() => confirm(`Apagar "${p.title}"?`) && deletePost(p.id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
