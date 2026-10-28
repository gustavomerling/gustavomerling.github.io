import { AlertTriangle, ArrowRight, Copy, Images, Info, Sparkles, Wand2, X } from 'lucide-react';
import { useDeferredValue, useMemo } from 'react';
import { ImageDrop } from '../components/ImageDrop';
import { RichTextEditor } from '../components/RichTextEditor';
import { StoredImage } from '../components/StoredImage';
import { Button, Field, Input, Segmented } from '../components/ui';
import { FORMATS, FORMAT_LIST } from '../lib/formats';
import { captionFromSlides } from '../lib/caption';
import { buildSlides, contentLength } from '../lib/generate';
import { splitText } from '../lib/split';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { ROLE_LABELS } from '../templates';
import { runGarbageCollection, useDb } from '../store/db';
import { toast } from '../store/ui';
import type { Brand, Client, ImageMode, Post, PostStyle } from '../types';

/** Limite de slides de um carrossel no Instagram. */
const MAX_SLIDES = 20;

const PLACEHOLDER = `Cole ou escreva o texto do carrossel.

Cada parágrafo vira um slide; o primeiro é a capa.
Para controlar a divisão, use "SLIDE 1", "SLIDE 2"… ou uma linha com ---.
"SLIDE 2 imagem" pede um slide com imagem.
**negrito** = destaque · ==marcado== = ultradestaque`;

interface ComposeViewProps {
  post: Post;
  client: Client;
  brand: Brand;
  onDone: () => void;
}

export function ComposeView({ post, client, brand, onDone }: ComposeViewProps) {
  const updatePost = useDb((s) => s.updatePost);
  const addPostImages = useDb((s) => s.addPostImages);
  const update = (fn: (p: Post) => void) => updatePost(post.id, fn);

  // A prévia é recalculada com atraso para não travar a digitação.
  const source = useDeferredValue(post.sourceHtml);
  const options = useMemo(
    () => ({
      style: post.style,
      drafts: splitText(source),
      mode: post.imageMode,
      imageIds: post.imageIds,
      favorites: client.favoriteTemplates,
      seed: post.id,
    }),
    [source, post.style, post.imageMode, post.imageIds, client.favoriteTemplates, post.id],
  );
  const preview = useMemo(() => buildSlides(options), [options]);
  const chars = useMemo(() => preview.reduce((n, s) => n + contentLength(s.content), 0), [preview]);
  const captionSource = post.slides.length ? post.slides : preview;

  const commit = () => {
    if (post.slides.length && !confirm('Substituir os slides atuais (e os ajustes feitos neles) por este novo carrossel?')) return;
    // Mesma semente da prévia: o carrossel salvo é exatamente o que foi mostrado.
    const slides = buildSlides({ ...options, drafts: splitText(post.sourceHtml) });
    update((p) => {
      p.slides = slides;
    });
    onDone();
  };

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(380px,560px)_1fr]">
      <section className="space-y-5 overflow-y-auto border-r border-zinc-200 bg-white p-5">
        <Field label="Nome do post">
          <Input value={post.title} onChange={(e) => update((p) => void (p.title = e.target.value))} />
        </Field>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700">Estilo</div>
            <Segmented<PostStyle>
              value={post.style}
              onChange={(v) => update((p) => void (p.style = v))}
              options={[
                { value: 'design', label: 'Design', title: 'Templates gráficos' },
                { value: 'social', label: 'Post', title: 'Avatar, @ e texto, como um post' },
                { value: 'mixed', label: 'Misto', title: 'Mistura os dois estilos' },
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium text-zinc-700">Formato</div>
            <Segmented
              value={post.format}
              onChange={(v) => update((p) => void (p.format = v))}
              options={FORMAT_LIST.map((f) => ({ value: f, label: FORMATS[f].label, title: FORMATS[f].hint }))}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-zinc-700">Texto</div>
          <RichTextEditor value={post.sourceHtml} onChange={(html) => update((p) => void (p.sourceHtml = html))} placeholder={PLACEHOLDER} />
          <p className="mt-2 flex gap-1.5 text-xs text-zinc-500">
            <Info size={14} className="shrink-0" />
            Negrito vira destaque, o marca-texto vira ultradestaque. Listas viram slide de lista. Colar do Docs ou do Word mantém a formatação.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Imagens</span>
            <Segmented<ImageMode>
              size="sm"
              value={post.imageMode}
              onChange={(v) => update((p) => void (p.imageMode = v))}
              options={[
                { value: 'none', label: 'Sem imagens' },
                { value: 'some', label: 'Algumas' },
                { value: 'all', label: 'Todas' },
              ]}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {post.imageIds.map((id, i) => (
              <div key={id} className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                <StoredImage id={id} className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[11px] font-medium text-[#fff]">{i + 1}</span>
                <button
                  type="button"
                  title="Remover"
                  onClick={() => {
                    update((p) => {
                      p.imageIds = p.imageIds.filter((x) => x !== id);
                    });
                    runGarbageCollection();
                  }}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-zinc-600 opacity-0 shadow transition group-hover:opacity-100 hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <ImageDrop
              multiple
              className="aspect-square text-xs"
              label="Adicionar"
              onImages={(ids) => addPostImages(post.id, ids)}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">As imagens entram nos espaços cinza da prévia, na ordem.</p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-700">Legenda</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                icon={<Sparkles size={14} />}
                disabled={!captionSource.length}
                onClick={() => {
                  if (post.caption && !confirm('Substituir a legenda atual?')) return;
                  update((p) => void (p.caption = captionFromSlides(captionSource, client.hashtags ?? '')));
                }}
              >
                Gerar do texto
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Copy size={14} />}
                disabled={!post.caption}
                onClick={() => navigator.clipboard.writeText(post.caption).then(() => toast('Legenda copiada'))}
              >
                Copiar
              </Button>
            </div>
          </div>
          <textarea
            value={post.caption}
            onChange={(e) => update((p) => void (p.caption = e.target.value))}
            rows={6}
            placeholder="Texto que vai junto com o carrossel no feed."
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className={post.caption.length > 2200 ? 'text-right text-xs text-red-600' : 'text-right text-xs text-zinc-400'}>{post.caption.length}/2200</div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col bg-zinc-100">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/70 px-5 py-3">
          <div>
            <div className="font-semibold text-zinc-900">Prévia</div>
            <div className="text-xs text-zinc-500">
              {preview.length ? `${preview.length} slides · ${FORMATS[post.format].label} · ${chars} caracteres` : 'Comece a escrever para ver o carrossel'}
            </div>
            {preview.length > MAX_SLIDES && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle size={13} /> O Instagram aceita até {MAX_SLIDES} slides por carrossel.
              </div>
            )}
          </div>
          <Button variant="primary" icon={<Wand2 size={16} />} disabled={!preview.length} onClick={commit}>
            {post.slides.length ? 'Substituir slides' : 'Usar este carrossel'}
            <ArrowRight size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {preview.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
              {preview.map((s, i) => (
                <div key={i}>
                  <div className="overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5">
                    <ScaledSlide format={post.format}>
                      <SlideView slide={s} index={i} total={preview.length} format={post.format} brand={brand} pagination={post.pagination} />
                    </ScaledSlide>
                  </div>
                  <div className="mt-1.5 text-xs text-zinc-500">
                    {i + 1}. {ROLE_LABELS[s.role]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center text-zinc-400">
              <div>
                <Images size={40} className="mx-auto mb-2" strokeWidth={1.25} />
                <p className="text-sm">Os slides aparecem aqui enquanto você escreve.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
