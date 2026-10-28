import { Icon } from '@iconify/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Eraser,
  FlipHorizontal2,
  Highlighter,
  ImageOff,
  Italic,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  RotateCcw,
  Shapes,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Unlock,
  WandSparkles,
} from 'lucide-react';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { IconPicker } from '../components/IconPicker';
import { ImageDrop } from '../components/ImageDrop';
import { StoredImage } from '../components/StoredImage';
import { Button, Segmented, Slider, cx } from '../components/ui';
import { DEFAULT_FILTER, applyTemplate, regenerateSlide, unusedImages } from '../lib/generate';
import { uid } from '../lib/id';
import { toggleMark } from '../lib/paste';
import { removeImageBackground } from '../lib/removeBackground';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { ROLE_LABELS, TEMPLATES, getTemplate, templateStyle } from '../templates';
import type { Brand, Client, FontRole, ImageFilter, PaginationStyle, Post, Slide, SlideRole, TextKey } from '../types';
import { ColorSwatches } from './ColorSwatches';
import { LayersPanel } from './LayersPanel';
import type { Selection, SlideUpdater } from './types';

interface InspectorProps {
  post: Post;
  client: Client;
  brand: Brand;
  slide: Slide;
  index: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
  editingKey: TextKey | null;
  onEdit: (k: TextKey | null) => void;
  updateSlide: SlideUpdater;
  replaceSlide: (s: Slide) => void;
  updatePost: (fn: (p: Post) => void) => void;
}

export function Inspector(props: InspectorProps) {
  const { selection } = props;
  const [tab, setTab] = useState<'props' | 'layers'>('props');
  return (
    <aside className="flex min-h-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex shrink-0 border-b border-zinc-100 p-2">
        <Segmented
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'props', label: <><SlidersHorizontal size={13} /> Propriedades</> },
            { value: 'layers', label: <><Layers size={13} /> Camadas</> },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'layers' && <LayersPanel {...props} />}
        {selection?.kind === 'box' && <BoxPanel {...props} textKey={selection.key} />}
        {selection?.kind === 'image' && <ImagePanel {...props} imageIndex={selection.index} />}
        {selection?.kind === 'icon' && <IconPanel {...props} iconId={selection.id} />}
        {selection?.kind === 'pagination' && <PaginationPanel {...props} />}
        {tab === 'props' && <SlidePanel {...props} />}
      </div>
    </aside>
  );
}

function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-b border-zinc-100 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <div className="mb-1.5 text-xs font-medium text-zinc-600">{children}</div>;

// ——— Slide ———

function SlidePanel({ post, client, brand, slide, index, replaceSlide, updateSlide, onSelect }: InspectorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const t = getTemplate(slide.templateId);
  const spare = unusedImages(post.slides, post.imageIds);

  return (
    <Panel title={`Slide ${index + 1}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-900">{t.name}</div>
          <select
            value={slide.role}
            onChange={(e) => updateSlide((s) => void (s.role = e.target.value as SlideRole))}
            className="mt-0.5 rounded border-none bg-transparent p-0 text-xs text-zinc-500 outline-none"
            title="Papel do slide (define quais templates o Regerar sorteia)"
          >
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" icon={<RefreshCw size={14} />} onClick={() => replaceSlide(regenerateSlide(slide, post.style, client.favoriteTemplates))}>
          Regerar
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" icon={<LayoutGrid size={14} />} onClick={() => setShowTemplates((v) => !v)}>
          Templates
        </Button>
        <Button size="sm" icon={<Shapes size={14} />} onClick={() => setShowIcons((v) => !v)}>
          Ícone
        </Button>
      </div>
      {showIcons && (
        <IconPicker
          onPick={(icon) => {
            const id = uid();
            updateSlide((s) => {
              s.elements.push({ id, icon, x: 50, y: 50, size: 12, rotate: 0, color: 'accent' });
            });
            onSelect({ kind: 'icon', id });
            setShowIcons(false);
          }}
        />
      )}
      {showTemplates &&
        (['design', 'social'] as const).map((group) => (
          <div key={group}>
            <Label>{group === 'design' ? 'Design' : 'Formato de post'}</Label>
            <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.filter((tpl) => templateStyle(tpl) === group).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              title={tpl.name}
              onClick={() => replaceSlide(applyTemplate(slide, tpl, spare))}
              className={cx('overflow-hidden rounded-md ring-2', tpl.id === slide.templateId ? 'ring-brand-500' : 'ring-transparent hover:ring-zinc-300')}
            >
              <ScaledSlide format={post.format}>
                <SlideView
                  slide={applyTemplate(slide, tpl, spare)}
                  index={index}
                  total={post.slides.length}
                  format={post.format}
                  brand={brand}
                  pagination={post.pagination}
                />
              </ScaledSlide>
            </button>
          ))}
            </div>
          </div>
        ))}
      <div>
        <Label>Fundo do slide</Label>
        <ColorSwatches
          allowAuto
          autoLabel="Do template"
          value={slide.bg ?? 'auto'}
          palette={brand.colors}
          onChange={(c) => updateSlide((s) => void (c === 'auto' ? delete s.bg : (s.bg = c)))}
        />
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Clique para selecionar, arraste para mover, dois cliques num texto para editar. Arraste a imagem selecionada para enquadrar e use a rolagem para zoom.
      </p>
    </Panel>
  );
}

// ——— Texto ———

const keepFocus = (fn: () => void) => (e: MouseEvent) => {
  e.preventDefault();
  fn();
};

function BoxPanel({ slide, brand, textKey, editingKey, onEdit, updateSlide }: InspectorProps & { textKey: TextKey }) {
  const o = slide.boxes[textKey] ?? {};
  const t = getTemplate(slide.templateId);
  const def = t.boxes.find((b) => b.key === textKey);
  const editing = editingKey === textKey;
  const patch = (p: Partial<typeof o>) => updateSlide((s) => void (s.boxes[textKey] = { ...s.boxes[textKey], ...p }));

  return (
    <Panel
      title={textKey === 'title' ? 'Título' : 'Texto'}
      actions={
        <Button size="sm" variant="ghost" title="Restaurar posição e estilo" icon={<RotateCcw size={14} />} onClick={() => updateSlide((s) => void delete s.boxes[textKey])} />
      }
    >
      <div className="flex items-center gap-1">
        <Button size="sm" variant={editing ? 'primary' : 'secondary'} icon={<Pencil size={14} />} onClick={() => onEdit(editing ? null : textKey)}>
          {editing ? 'Editando' : 'Editar texto'}
        </Button>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <Button size="sm" variant="ghost" title="Destaque" disabled={!editing} icon={<Bold size={15} />} onMouseDown={keepFocus(() => document.execCommand('bold'))} />
        <Button size="sm" variant="ghost" title="Itálico" disabled={!editing} icon={<Italic size={15} />} onMouseDown={keepFocus(() => document.execCommand('italic'))} />
        <Button size="sm" variant="ghost" title="Ultradestaque" disabled={!editing} icon={<Highlighter size={15} />} onMouseDown={keepFocus(toggleMark)} />
      </div>
      <Slider label="Tamanho da fonte" value={Math.round((o.scale ?? 1) * 100)} min={40} max={250} unit="%" onChange={(v) => patch({ scale: v / 100 })} />
      <div>
        <Label>Alinhamento</Label>
        <Segmented
          size="sm"
          value={o.align ?? def?.align ?? 'left'}
          onChange={(align) => patch({ align })}
          options={[
            { value: 'left', label: <AlignLeft size={14} /> },
            { value: 'center', label: <AlignCenter size={14} /> },
            { value: 'right', label: <AlignRight size={14} /> },
          ]}
        />
      </div>
      <div>
        <Label>Cor</Label>
        <ColorSwatches allowAuto value={o.color ?? def?.color ?? 'auto'} palette={brand.colors} onChange={(c) => patch({ color: c === 'auto' ? undefined : c })} />
      </div>
      <div>
        <Label>Fonte</Label>
        <Segmented<FontRole>
          size="sm"
          value={o.font ?? def?.font ?? 'base'}
          onChange={(font) => patch({ font })}
          options={[
            { value: 'base', label: 'Base', title: brand.fonts.base },
            { value: 'highlight', label: 'Destaque', title: brand.fonts.highlight },
            { value: 'ultra', label: 'Ultra', title: brand.fonts.ultra },
          ]}
        />
      </div>
      <Slider label="Entrelinha" value={o.lineHeight ?? def?.lineHeight ?? 1.25} min={0.8} max={2.2} step={0.05} onChange={(v) => patch({ lineHeight: v })} />
      <Slider label="Espaço entre letras" value={o.letterSpacing ?? def?.letterSpacing ?? 0} min={-0.1} max={0.5} step={0.01} unit="em" onChange={(v) => patch({ letterSpacing: v })} />
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" checked={o.uppercase ?? def?.uppercase ?? false} onChange={(e) => patch({ uppercase: e.target.checked })} className="accent-brand-600" />
        Tudo em maiúsculas
      </label>
    </Panel>
  );
}

// ——— Imagem ———

const PRESETS: { label: string; filter: Partial<ImageFilter> }[] = [
  { label: 'Original', filter: {} },
  { label: 'P&B', filter: { grayscale: 100, contrast: 110 } },
  { label: 'Vívido', filter: { saturate: 140, contrast: 110 } },
  { label: 'Suave', filter: { brightness: 108, contrast: 90, saturate: 85 } },
  { label: 'Sépia', filter: { sepia: 70, contrast: 95 } },
  { label: 'Frio', filter: { hueRotate: 12, saturate: 90, brightness: 102 } },
  { label: 'Dramático', filter: { contrast: 135, brightness: 90, saturate: 110 } },
];

function ImagePanel({ post, slide, brand, imageIndex, updateSlide, updatePost }: InspectorProps & { imageIndex: number }) {
  const [bgState, setBgState] = useState<{ busy: boolean; progress?: number; error?: string }>({ busy: false });
  const img = slide.images[imageIndex];
  if (!img) return null;
  const f = img.filter;
  const setImg = (fn: (i: Slide['images'][number]) => void) => updateSlide((s) => fn(s.images[imageIndex]));
  const setFilter = (p: Partial<ImageFilter>) => setImg((i) => Object.assign(i.filter, p));

  const removeBg = async () => {
    if (!img.imageId) return;
    setBgState({ busy: true });
    try {
      const original = img.imageId;
      const id = await removeImageBackground(original, (progress) => setBgState({ busy: true, progress }));
      setImg((i) => {
        i.originalId = i.originalId ?? original;
        i.imageId = id;
        i.cutout = true;
      });
      setBgState({ busy: false });
    } catch (e) {
      setBgState({ busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Panel title="Imagem">
      <div>
        <Label>Escolher imagem</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {post.imageIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                setImg((i) => {
                  i.imageId = id;
                  i.cutout = false;
                  i.originalId = undefined;
                })
              }
              className={cx('aspect-square overflow-hidden rounded-md ring-2', id === img.imageId || id === img.originalId ? 'ring-brand-500' : 'ring-transparent hover:ring-zinc-300')}
            >
              <StoredImage id={id} className="h-full w-full object-cover" />
            </button>
          ))}
          <ImageDrop
            className="aspect-square rounded-md text-[10px]"
            label="Enviar"
            onImages={([id]) =>
              updatePost((p) => {
                p.imageIds.push(id);
                const im = p.slides.find((s) => s.id === slide.id)?.images[imageIndex];
                if (im) Object.assign(im, { imageId: id, cutout: false, originalId: undefined });
              })
            }
          />
        </div>
      </div>

      {img.imageId && (
        <>
          <div className="space-y-2 rounded-lg bg-zinc-50 p-3">
            {img.originalId ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600">Fundo removido</span>
                <Button
                  size="sm"
                  icon={<Undo2 size={14} />}
                  onClick={() =>
                    setImg((i) => {
                      i.imageId = i.originalId!;
                      i.originalId = undefined;
                      i.cutout = false;
                    })
                  }
                >
                  Restaurar original
                </Button>
              </div>
            ) : (
              <Button className="w-full" icon={bgState.busy ? <Loader2 size={15} className="animate-spin" /> : <WandSparkles size={15} />} disabled={bgState.busy} onClick={removeBg}>
                {bgState.busy ? (bgState.progress !== undefined && bgState.progress < 100 ? `Baixando modelo… ${bgState.progress}%` : 'Removendo fundo…') : 'Remover fundo'}
              </Button>
            )}
            {bgState.error && <p className="text-xs text-red-600">Não deu para remover o fundo: {bgState.error}</p>}
            {!img.originalId && !bgState.busy && <p className="text-[11px] text-zinc-500">Roda no navegador. No primeiro uso, baixa o modelo (~40 MB).</p>}
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <input type="checkbox" checked={!!img.cutout} onChange={(e) => setImg((i) => void (i.cutout = e.target.checked))} className="accent-brand-600" />
              Imagem inteira (sem cortar, fundo transparente)
            </label>
          </div>

          <div className="space-y-3">
            <Slider label="Zoom" value={img.zoom} min={1} max={4} step={0.01} onChange={(v) => setImg((i) => void (i.zoom = v))} />
            <Slider label="Horizontal" value={Math.round(img.x)} min={0} max={100} unit="%" onChange={(v) => setImg((i) => void (i.x = v))} />
            <Slider label="Vertical" value={Math.round(img.y)} min={0} max={100} unit="%" onChange={(v) => setImg((i) => void (i.y = v))} />
          </div>

          <div>
            <Label>Filtros prontos</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setFilter({ ...DEFAULT_FILTER, overlayColor: f.overlayColor, overlayOpacity: f.overlayOpacity, ...p.filter })}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Slider label="Brilho" value={f.brightness} min={0} max={200} unit="%" onChange={(v) => setFilter({ brightness: v })} />
            <Slider label="Contraste" value={f.contrast} min={0} max={200} unit="%" onChange={(v) => setFilter({ contrast: v })} />
            <Slider label="Saturação" value={f.saturate} min={0} max={200} unit="%" onChange={(v) => setFilter({ saturate: v })} />
            <Slider label="Preto e branco" value={f.grayscale} min={0} max={100} unit="%" onChange={(v) => setFilter({ grayscale: v })} />
            <Slider label="Sépia" value={f.sepia} min={0} max={100} unit="%" onChange={(v) => setFilter({ sepia: v })} />
            <Slider label="Matiz" value={f.hueRotate} min={-180} max={180} unit="°" onChange={(v) => setFilter({ hueRotate: v })} />
            <Slider label="Desfoque" value={f.blur} min={0} max={20} unit="px" onChange={(v) => setFilter({ blur: v })} />
          </div>

          <div>
            <Label>Camada de cor</Label>
            <ColorSwatches value={f.overlayColor} palette={brand.colors} onChange={(c) => c !== 'auto' && setFilter({ overlayColor: c, overlayOpacity: f.overlayOpacity || 40 })} />
            <div className="mt-2">
              <Slider label="Opacidade" value={f.overlayOpacity} min={0} max={90} unit="%" onChange={(v) => setFilter({ overlayOpacity: v })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={<FlipHorizontal2 size={14} />} onClick={() => setImg((i) => void (i.flipX = !i.flipX))}>
              Espelhar
            </Button>
            <Button size="sm" icon={<Eraser size={14} />} onClick={() => setImg((i) => Object.assign(i, { zoom: 1, x: 50, y: 50, flipX: false, filter: { ...DEFAULT_FILTER } }))}>
              Restaurar ajustes
            </Button>
            <Button size="sm" variant="danger" icon={<ImageOff size={14} />} onClick={() => setImg((i) => Object.assign(i, { imageId: null, originalId: undefined, cutout: false }))}>
              Esvaziar
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

// ——— Ícone ———

function IconPanel({ slide, brand, iconId, updateSlide, onSelect }: InspectorProps & { iconId: string }) {
  const [picking, setPicking] = useState(false);
  const el = slide.elements.find((e) => e.id === iconId);
  if (!el) return null;
  const set = (p: Partial<typeof el>) =>
    updateSlide((s) => {
      const it = s.elements.find((e) => e.id === iconId);
      if (it) Object.assign(it, p);
    });

  return (
    <Panel
      title="Ícone"
      actions={
        <div className="flex">
          <Button
            size="sm"
            variant="ghost"
            title="Duplicar"
            icon={<Copy size={14} />}
            onClick={() => {
              const id = uid();
              updateSlide((s) => void s.elements.push({ ...el, id, x: Math.min(95, el.x + 5), y: Math.min(95, el.y + 5), fromTemplate: false }));
              onSelect({ kind: 'icon', id });
            }}
          />
          <Button
            size="sm"
            variant="danger"
            title="Remover (Delete)"
            icon={<Trash2 size={14} />}
            onClick={() => {
              updateSlide((s) => void (s.elements = s.elements.filter((e) => e.id !== iconId)));
              onSelect(null);
            }}
          />
        </div>
      }
    >
      <button type="button" onClick={() => setPicking((v) => !v)} className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left hover:bg-zinc-50">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-zinc-100">
          <Icon icon={el.icon} width={24} height={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-zinc-800">{el.icon}</span>
          <span className="text-xs text-brand-700">Trocar ícone</span>
        </span>
      </button>
      {picking && (
        <IconPicker
          onPick={(icon) => {
            set({ icon });
            setPicking(false);
          }}
        />
      )}
      <Slider label="Tamanho" value={Math.round(el.size)} min={2} max={90} unit="%" onChange={(v) => set({ size: v })} />
      <Slider label="Rotação" value={el.rotate} min={-180} max={180} unit="°" onChange={(v) => set({ rotate: v })} />
      <div>
        <Label>Cor</Label>
        <ColorSwatches value={el.color} palette={brand.colors} onChange={(c) => c !== 'auto' && set({ color: c })} />
      </div>
    </Panel>
  );
}

// ——— Paginação ———

function PaginationPanel({ post, brand, slide, index, updatePost, updateSlide }: InspectorProps) {
  const p = post.pagination;
  const first = index === 0;
  const unlocked = !first && slide.paginationColor !== undefined;
  return (
    <Panel
      title="Paginação"
      actions={
        <Button size="sm" variant="ghost" title="Posição padrão" icon={<RotateCcw size={14} />} onClick={() => updatePost((d) => Object.assign(d.pagination, { x: 50, y: 95 }))} />
      }
    >
      <p className="text-xs text-zinc-500">Vale para todos os slides deste post. Arraste no slide para reposicionar.</p>
      <PaginationStylePicker value={p.style} onChange={(style) => updatePost((d) => void (d.pagination.style = style))} />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600">{first ? 'Cor (define a de todos os slides)' : unlocked ? 'Cor só deste slide' : 'Cor herdada do slide 1'}</span>
          {!first && (
            <Button
              size="sm"
              variant="ghost"
              icon={unlocked ? <Unlock size={14} /> : <Lock size={14} />}
              onClick={() => updateSlide((s) => void (unlocked ? delete s.paginationColor : (s.paginationColor = p.color)))}
            >
              {unlocked ? 'Travar' : 'Destravar'}
            </Button>
          )}
        </div>
        <div className={cx(!first && !unlocked && 'pointer-events-none opacity-40')}>
          <ColorSwatches
            allowAuto
            value={unlocked ? slide.paginationColor! : p.color}
            palette={brand.colors}
            onChange={(c) => (unlocked ? updateSlide((s) => void (s.paginationColor = c)) : updatePost((d) => void (d.pagination.color = c)))}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={slide.hidden?.includes('pagination') ?? false}
          onChange={(e) =>
            updateSlide((s) => {
              const h = (s.hidden ?? []).filter((x) => x !== 'pagination');
              s.hidden = e.target.checked ? [...h, 'pagination'] : h;
            })
          }
          className="accent-brand-600"
        />
        Ocultar neste slide
      </label>
    </Panel>
  );
}

export function PaginationStylePicker({ value, onChange }: { value: PaginationStyle; onChange: (v: PaginationStyle) => void }) {
  return (
    <Segmented
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: 'none', label: 'Nenhuma' },
        { value: 'dots', label: '• • •' },
        { value: 'number', label: '1/8' },
        { value: 'progress', label: '▬▭' },
      ]}
    />
  );
}
