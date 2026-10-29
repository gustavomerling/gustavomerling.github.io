import { Copy, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CarouselItem, HorizontalCarousel, TemplateThumb } from '../components/TemplateThumb';
import { Button, NewItemCard } from '../components/ui';
import { ensureFonts } from '../lib/fonts';
import { demoBrand } from '../lib/preview';
import { navigate } from '../lib/router';
import { ROLE_LABELS, TEMPLATES, templateStyle, type TemplateDef } from '../templates';
import { brandOf, useDb, useMyTemplates } from '../store/db';
import type { Brand } from '../types';

/** Aba Templates do painel: os do usuário (editáveis) e os padrão (para clonar). */
export function TemplatesTab() {
  const mine = useMyTemplates();
  const allClients = useDb((s) => s.clients);
  const userId = useDb((s) => s.currentUserId);
  const posts = useDb((s) => s.posts);
  const createTemplate = useDb((s) => s.createTemplate);
  const deleteTemplate = useDb((s) => s.deleteTemplate);
  const clients = useMemo(() => allClients.filter((c) => c.userId === userId), [allClients, userId]);
  const [brandSource, setBrandSource] = useState('demo');
  const client = clients.find((c) => c.id === brandSource);
  const brand = useMemo(() => (client ? brandOf(client) : demoBrand()), [client]);
  useEffect(() => ensureFonts(Object.values(brand.fonts)), [brand]);

  const usage = (id: string) => posts.reduce((n, p) => n + p.slides.filter((s) => s.templateId === id).length, 0);
  const clone = (t: TemplateDef) => navigate(`/templates/${createTemplate(t)}`);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Os seus templates entram no sorteio de todos os seus clientes e podem ser favoritados.</p>
        <select value={brandSource} onChange={(e) => setBrandSource(e.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm outline-none">
          <option value="demo">Prévia com cores de exemplo</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              Prévia com a marca {c.name}
            </option>
          ))}
        </select>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-zinc-900">Meus templates</h2>
        {(
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <NewItemCard
              shape="slide"
              label="Novo template"
              hint={mine.length ? 'Do zero' : 'Do zero, ou clone um padrão abaixo'}
              onClick={() => navigate(`/templates/${createTemplate()}`)}
            />
            {mine.map((t) => {
              const n = usage(t.id);
              return (
                <div key={t.id} className="group">
                  <a href={`#/templates/${t.id}`} className="block transition group-hover:-translate-y-0.5">
                    <TemplateThumb template={t} brand={brand} />
                  </a>
                  <div className="mt-2 flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900">{t.name || 'Sem nome'}</div>
                      <div className="truncate text-xs text-zinc-500">
                        {t.roles.map((r) => ROLE_LABELS[r]).join(', ')}
                        {n > 0 && ` · em ${n} slide${n > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="ghost" title="Editar" icon={<Pencil size={14} />} onClick={() => navigate(`/templates/${t.id}`)} />
                      <Button size="sm" variant="ghost" title="Duplicar" icon={<Copy size={14} />} onClick={() => createTemplate(t)} />
                      <Button
                        size="sm"
                        variant="danger"
                        title="Apagar"
                        icon={<Trash2 size={14} />}
                        onClick={() => {
                          const warn = n ? `\n\n${n} slide(s) usam este template e voltam para o template de origem.` : '';
                          if (confirm(`Apagar o template "${t.name}"?${warn}`)) deleteTemplate(t.id);
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-900">Templates padrão</h2>
        <p className="mb-4 text-sm text-zinc-500">Não mudam; clone um para ter a sua versão editável.</p>
        <BuiltInRow title="Design" list={TEMPLATES.filter((t) => templateStyle(t) === 'design')} brand={brand} onClone={clone} />
        <BuiltInRow title="Formato de post" list={TEMPLATES.filter((t) => templateStyle(t) === 'social')} brand={brand} onClone={clone} />
      </section>
    </div>
  );
}

function BuiltInRow({ title, list, brand, onClone }: { title: string; list: TemplateDef[]; brand: Brand; onClone: (t: TemplateDef) => void }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 text-sm font-medium text-zinc-600">{title}</div>
      <HorizontalCarousel itemWidth={170}>
        {list.map((t) => (
          <CarouselItem key={t.id}>
            <button type="button" onClick={() => onClone(t)} className="group block w-full text-left" title="Clonar para editar">
              <TemplateThumb template={t} brand={brand}>
                <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow">
                    <Copy size={14} /> Clonar
                  </span>
                </span>
              </TemplateThumb>
              <div className="mt-1.5 truncate text-xs text-zinc-600">{t.name}</div>
            </button>
          </CarouselItem>
        ))}
      </HorizontalCarousel>
    </div>
  );
}
