import { BadgeCheck, Star, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ColorField } from '../components/ColorField';
import { FontPicker } from '../components/FontPicker';
import { ImageDrop } from '../components/ImageDrop';
import { StoredImage } from '../components/StoredImage';
import { Button, Card, Field, Input, SectionTitle, cx } from '../components/ui';
import { COLOR_LABELS, COLOR_ROLES, FIXED_COLORS } from '../lib/color';
import { ensureFonts } from '../lib/fonts';
import { navigate } from '../lib/router';
import { sampleSlide } from '../lib/sample';
import { harmonize } from '../lib/systemColor';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { CarouselItem, HorizontalCarousel, TemplateThumb } from '../components/TemplateThumb';
import { TEMPLATES, getTemplate, templateStyle, type TemplateDef } from '../templates';
import { brandOf, newClientDefaults, runGarbageCollection, useDb, useMyTemplates, type ClientData } from '../store/db';
import type { Brand, Client, SocialProfile } from '../types';
import { NotFound } from './NotFound';

type Draft = ClientData;

export function ClientFormScreen({ clientId }: { clientId?: string }) {
  const existing = useDb((s) => (clientId ? s.clients.find((c) => c.id === clientId) : undefined));
  const createClient = useDb((s) => s.createClient);
  const updateClient = useDb((s) => s.updateClient);
  const deleteClient = useDb((s) => s.deleteClient);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? structuredClone({
          name: existing.name,
          logos: existing.logos,
          profile: existing.profile,
          colors: existing.colors,
          fonts: existing.fonts,
          favoriteTemplates: existing.favoriteTemplates,
          hashtags: existing.hashtags ?? '',
        })
      : newClientDefaults(),
  );

  useEffect(() => ensureFonts(Object.values(draft.fonts)), [draft.fonts]);

  const brand: Brand = useMemo(() => brandOf(draft), [draft]);
  const myTemplates = useMyTemplates();

  if (clientId && !existing) return <NotFound message="Esse cliente não existe mais." />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setProfile = (patch: Partial<SocialProfile>) => set('profile', { ...draft.profile, ...patch });

  const save = () => {
    if (!draft.name.trim()) return;
    const data = { ...draft, name: draft.name.trim() };
    if (existing) {
      updateClient(existing.id, (c: Client) => Object.assign(c, data));
      runGarbageCollection();
      navigate(`/clients/${existing.id}`);
    } else {
      const id = createClient(data);
      navigate(`/clients/${id}`);
    }
  };

  const toggleFavorite = (id: string) =>
    set('favoriteTemplates', draft.favoriteTemplates.includes(id) ? draft.favoriteTemplates.filter((f) => f !== id) : [...draft.favoriteTemplates, id]);

  return (
    <div className="min-h-full pb-24">
      <AppHeader
        crumbs={[
          { label: 'Clientes', to: '/clients' },
          ...(existing ? [{ label: existing.name, to: `/clients/${existing.id}` }] : []),
          { label: existing ? 'Editar' : 'Novo cliente' },
        ]}
      />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">{existing ? `Editar ${existing.name}` : 'Novo cliente'}</h1>

        <Card>
          <SectionTitle>Identidade</SectionTitle>
          <Field label="Nome do cliente">
            <Input autoFocus={!existing} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Café da Esquina" />
          </Field>
        </Card>

        <Card>
          <SectionTitle hint="O positivo vai sobre fundos claros; o negativo, sobre fundos escuros. PNG ou SVG transparente funciona melhor.">Logos</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <LogoSlot label="Positivo" dark={false} id={draft.logos.positive} onChange={(id) => set('logos', { ...draft.logos, positive: id })} />
            <LogoSlot label="Negativo" dark id={draft.logos.negative} onChange={(id) => set('logos', { ...draft.logos, negative: id })} />
          </div>
        </Card>

        <Card>
          <SectionTitle hint="Usado nos templates em formato de post: avatar, @, seguidores…">Perfil social</SectionTitle>
          <div className="grid gap-6 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {draft.profile.avatar ? (
                    <>
                      <StoredImage id={draft.profile.avatar} className="h-20 w-20 rounded-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProfile({ avatar: undefined })}
                        className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-zinc-500 shadow hover:text-red-600"
                        title="Remover avatar"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <ImageDrop className="h-20 w-20 rounded-full! text-xs" label="Avatar" onImages={([id]) => setProfile({ avatar: id })} />
                  )}
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <Field label="Nome de exibição">
                    <Input value={draft.profile.displayName} onChange={(e) => setProfile({ displayName: e.target.value })} placeholder={draft.name || 'Nome'} />
                  </Field>
                  <Field label="@ do perfil">
                    <Input value={draft.profile.handle} onChange={(e) => setProfile({ handle: e.target.value.replace(/^@/, '') })} placeholder="usuario" />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Posts">
                  <Input value={draft.profile.posts} onChange={(e) => setProfile({ posts: e.target.value })} placeholder="128" />
                </Field>
                <Field label="Seguidores">
                  <Input value={draft.profile.followers} onChange={(e) => setProfile({ followers: e.target.value })} placeholder="12,5 mil" />
                </Field>
                <Field label="Seguindo">
                  <Input value={draft.profile.following} onChange={(e) => setProfile({ following: e.target.value })} placeholder="310" />
                </Field>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={draft.profile.verified} onChange={(e) => setProfile({ verified: e.target.checked })} className="h-4 w-4 accent-brand-600" />
                <BadgeCheck size={16} className="text-sky-500" /> Selo de verificado
              </label>
              <Field label="Hashtags padrão" hint="Entram no fim da legenda gerada de cada post.">
                <Input value={draft.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#marketing #dicas #suamarca" />
              </Field>
            </div>
            <TemplatePreview templateId="social-profile" brand={brand} />
          </div>
        </Card>

        <Card>
          <SectionTitle hint="Os templates combinam esses cinco papéis automaticamente.">Cores</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COLOR_ROLES.map((r) => (
              <ColorField key={r} label={COLOR_LABELS[r]} value={draft.colors[r]} onChange={(hex) => set('colors', { ...draft.colors, [r]: hex })} />
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {Object.values(FIXED_COLORS).map((c) => (
              <span key={c.hex} className="h-4 w-4 rounded-full border border-black/15" style={{ background: c.hex }} title={c.label} />
            ))}
            Preto e branco absolutos já fazem parte de toda marca: aparecem nas opções de cor dos slides e dos templates.
          </p>
          <SystemColorNote primary={draft.colors.primary} />
        </Card>

        <Card>
          <SectionTitle hint="Do Google Fonts. Negrito no texto usa a de destaque; ==marcação== usa a de ultradestaque.">Tipografia</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <FontPicker label="Base" hint="Textos corridos" sample="Texto corrido" value={draft.fonts.base} onChange={(f) => set('fonts', { ...draft.fonts, base: f })} />
            <FontPicker label="Destaque" hint="Títulos e negrito" sample="Título forte" value={draft.fonts.highlight} onChange={(f) => set('fonts', { ...draft.fonts, highlight: f })} />
            <FontPicker label="Ultradestaque" hint="Frases de impacto" sample="IMPACTO" value={draft.fonts.ultra} onChange={(f) => set('fonts', { ...draft.fonts, ultra: f })} />
          </div>
        </Card>

        <Card>
          <SectionTitle hint="Favoritos aparecem com mais frequência quando o carrossel é gerado.">Templates favoritos</SectionTitle>
          {myTemplates.length > 0 && <TemplateGroup title="Meus templates" brand={brand} favorites={draft.favoriteTemplates} onToggle={toggleFavorite} list={myTemplates} />}
          <TemplateGroup title="Design" brand={brand} favorites={draft.favoriteTemplates} onToggle={toggleFavorite} list={TEMPLATES.filter((t) => templateStyle(t) === 'design')} />
          <TemplateGroup title="Formato de post" brand={brand} favorites={draft.favoriteTemplates} onToggle={toggleFavorite} list={TEMPLATES.filter((t) => templateStyle(t) === 'social')} />
          <p className="text-xs text-zinc-500">
            Para criar ou clonar templates, use a aba <a href="#/templates" className="font-medium text-brand-700 hover:underline">Templates</a> do painel.
          </p>
        </Card>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          {existing && (
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              onClick={() => {
                if (confirm(`Apagar ${existing.name} e todos os posts dele?`)) {
                  deleteClient(existing.id);
                  navigate('/clients');
                }
              }}
            >
              Apagar cliente
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={() => navigate(existing ? `/clients/${existing.id}` : '/clients')}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={!draft.name.trim()}>
              {existing ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mostra a cor de interface derivada da primária (ver harmonize). */
function SystemColorNote({ primary }: { primary: string }) {
  const sys = harmonize(primary);
  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: sys.hex }} />
      Cor da interface deste cliente: <strong className="font-medium text-zinc-700">{sys.name}</strong> — a versão equilibrada mais próxima da primária.
    </p>
  );
}

function LogoSlot({ label, dark, id, onChange }: { label: string; dark: boolean; id?: string; onChange: (id?: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>
      <div className={cx('relative h-36 overflow-hidden rounded-xl', dark ? 'bg-[#18181b]' : 'checker')}>
        {id ? (
          <>
            <StoredImage id={id} className="h-full w-full object-contain p-6" />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-zinc-500 shadow hover:text-red-600"
              title="Remover"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <ImageDrop className={cx('h-full', dark && 'border-[#3f3f46]! text-[#a1a1aa]! hover:bg-[#27272a]!')} label={`Enviar logo ${label.toLowerCase()}`} onImages={([nid]) => onChange(nid)} />
        )}
      </div>
    </div>
  );
}

function TemplatePreview({ templateId, brand, children }: { templateId: string; brand: Brand; children?: ReactNode }) {
  const t = getTemplate(templateId);
  const slide = useMemo(() => sampleSlide(t), [t]);
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
      <ScaledSlide format="4x5">
        <SlideView slide={slide} index={0} total={1} format="4x5" brand={brand} pagination={{ style: 'none', x: 50, y: 95, color: 'auto' }} />
      </ScaledSlide>
      {children}
    </div>
  );
}

function TemplateGroup({
  title,
  list,
  brand,
  favorites,
  onToggle,
}: {
  title: string;
  list: TemplateDef[];
  brand: Brand;
  favorites: string[];
  onToggle: (id: string) => void;
}) {
  const count = list.filter((t) => favorites.includes(t.id)).length;
  return (
    <div className="mb-5">
      <div className="mb-2 text-sm font-medium text-zinc-600">
        {title}
        {count > 0 && <span className="ml-2 text-xs font-normal text-amber-600">{count} favorito{count > 1 ? 's' : ''}</span>}
      </div>
      <HorizontalCarousel itemWidth={140}>
        {list.map((t) => {
          const fav = favorites.includes(t.id);
          return (
            <CarouselItem key={t.id}>
              <button type="button" onClick={() => onToggle(t.id)} className="group block w-full text-left">
                <div className={cx('rounded-xl ring-2 transition', fav ? 'ring-amber-400' : 'ring-transparent group-hover:ring-zinc-200')}>
                  <TemplateThumb template={t} brand={brand}>
                    <span
                      className={cx(
                        'absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full shadow',
                        fav ? 'bg-amber-400 text-[#fff]' : 'bg-white/90 text-zinc-400 group-hover:text-amber-500',
                      )}
                    >
                      <Star size={14} fill={fav ? 'currentColor' : 'none'} />
                    </span>
                  </TemplateThumb>
                </div>
                <div className="mt-1.5 truncate text-xs text-zinc-600">{t.name}</div>
              </button>
            </CarouselItem>
          );
        })}
      </HorizontalCarousel>
    </div>
  );
}
