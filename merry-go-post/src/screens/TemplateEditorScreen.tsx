import { Icon } from '@iconify/react';
import {
  Check,
  ChevronLeft,
  Copy,
  Layers,
  Ruler,
  Save,
  Settings2,
  SlidersHorizontal,
  Dices,
  Grid3x3,
  Hash,
  Image as ImageIcon,
  ImageOff,
  Images,
  Plus,
  Quote,
  Shapes,
  Square,
  Stamp,
  Trash2,
  Type,
  UserRound,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { FontChoice } from '../components/FontChoice';
import { IconPickerModal } from '../components/IconPicker';
import { Button, Input, Label, NumberField, Segmented, Slider, cx } from '../components/ui';
import { ColorSwatches, RecentColorsContext, collectHexColors } from '../editor/ColorSwatches';
import { Frame, GridOverlay, GuidesOverlay } from '../editor/Stage';
import { clamp, moveRectSnapped, resizeRectSnapped, snapTargets, startDrag, type HandleDir } from '../editor/types';
import { ensureFonts } from '../lib/fonts';
import { FORMATS, FORMAT_LIST, SLIDE_WIDTH, slideHeight } from '../lib/formats';
import { previewSlide, randomBrand, randomContent } from '../lib/preview';
import { navigate } from '../lib/router';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView, iconBox } from '../slides/SlideView';
import { ROLE_LABELS, TEMPLATE_MAP, type DecorationDef, type Rect, type TemplateDef, type TextBoxDef } from '../templates';
import { brandOf, useDb, type CustomTemplate } from '../store/db';
import type { Brand, Client } from '../types';
import { toast, useUi } from '../store/ui';
import type { ColorRef, Format, FontRole, Palette, SlideContent, SlideRole, TextKey } from '../types';
import { NotFound } from './NotFound';

type Sel =
  | { kind: 'box'; key: TextKey }
  | { kind: 'image'; i: number }
  | { kind: 'decor'; i: number }
  | { kind: 'icon'; i: number }
  | { kind: 'logo' }
  | null;

const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Parte do template que a seleção aponta (tudo que tem x/y). */
function layerOf(t: TemplateDef, sel: Sel): { x: number; y: number } | undefined {
  if (!sel) return undefined;
  switch (sel.kind) {
    case 'box':
      return t.boxes.find((b) => b.key === sel.key);
    case 'image':
      return t.images[sel.i];
    case 'decor':
      return t.decorations?.[sel.i];
    case 'icon':
      return t.icons?.[sel.i];
    case 'logo':
      return t.logo;
  }
}

function removeLayer(t: TemplateDef, sel: Sel) {
  if (!sel) return;
  if (sel.kind === 'box') t.boxes = t.boxes.filter((b) => b.key !== sel.key);
  else if (sel.kind === 'image') t.images.splice(sel.i, 1);
  else if (sel.kind === 'decor') t.decorations?.splice(sel.i, 1);
  else if (sel.kind === 'icon') t.icons?.splice(sel.i, 1);
  else delete t.logo;
}

/** Cópia deslocada da camada; título, texto e logo são únicos (devolve null). */
function duplicateLayer(t: TemplateDef, sel: Sel): Sel {
  if (!sel) return null;
  const shift = <T extends { x: number; y: number }>(v: T): T => ({ ...structuredClone(v), x: v.x + 3, y: v.y + 3 });
  if (sel.kind === 'image' && t.images[sel.i]) {
    t.images.push(shift(t.images[sel.i]));
    return { kind: 'image', i: t.images.length - 1 };
  }
  if (sel.kind === 'decor' && t.decorations?.[sel.i]) {
    t.decorations.push(shift(t.decorations[sel.i]));
    return { kind: 'decor', i: t.decorations.length - 1 };
  }
  if (sel.kind === 'icon' && t.icons?.[sel.i]) {
    t.icons.push(shift(t.icons[sel.i]));
    return { kind: 'icon', i: t.icons.length - 1 };
  }
  return null;
}

const same = (a: Sel, b: Sel) => JSON.stringify(a) === JSON.stringify(b);

type Mutate = (fn: (t: CustomTemplate) => void) => void;

/** Coluna de controles: o template em si, a lista de camadas e os ajustes da camada escolhida. */
type SideTab = 'template' | 'layers' | 'layer';

const timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const DECOR_LABELS: Record<DecorationDef['kind'], string> = {
  rect: 'Forma',
  glyph: 'Símbolo',
  index: 'Número do slide',
  profile: 'Perfil',
  stats: 'Números do perfil',
};

const DECOR_ICONS: Record<DecorationDef['kind'], LucideIcon> = {
  rect: Square,
  glyph: Quote,
  index: Hash,
  profile: UserRound,
  stats: BarChart3,
};

export function TemplateEditorScreen({ templateId }: { templateId: string }) {
  const tpl = useDb((s) => s.templates.find((t) => t.id === templateId));
  const builtIn = TEMPLATE_MAP.get(templateId);
  const updateTemplate = useDb((s) => s.updateTemplate);
  const createTemplate = useDb((s) => s.createTemplate);
  const deleteTemplate = useDb((s) => s.deleteTemplate);
  const allClients = useDb((s) => s.clients);
  const userId = useDb((s) => s.currentUserId);
  const clients = useMemo(() => allClients.filter((c) => c.userId === userId), [allClients, userId]);
  const usage = useDb((s) => s.posts.reduce((n, p) => n + p.slides.filter((sl) => sl.templateId === templateId).length, 0));

  const [sel, setSel] = useState<Sel>(null);
  const [tab, setTab] = useState<SideTab>('layers');
  /** Camada sob o mouse na lista: destacada na prévia. */
  const [hovered, setHovered] = useState<Sel>(null);
  const [format, setFormat] = useState<Format>('4x5');
  const [brandSource, setBrandSource] = useState<string>('random');
  const [randomMain, setRandomMain] = useState(randomBrand);
  const [content, setContent] = useState<SlideContent>(() => randomContent(tpl?.roles[0] ?? 'content'));
  const [withImages, setWithImages] = useState(true);
  const [imageOffset, setImageOffset] = useState(0);

  const client = clients.find((c) => c.id === brandSource);
  const brand = useMemo(() => (client ? brandOf(client) : randomMain), [client, randomMain]);
  useEffect(() => ensureFonts(Object.values(brand.fonts)), [brand]);

  // Atalhos: setas movem, Delete remove, Ctrl+D duplica, Esc tira a seleção.
  useEffect(() => {
    if (!tpl) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || document.querySelector('[role=dialog]')) return;
      const mutate: Mutate = (fn) => updateTemplate(tpl.id, fn);
      if (e.key === 'Escape') {
        setSel(null);
        setTab((t) => (t === 'layer' ? 'layers' : t));
        return;
      }
      if (!sel) return;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        mutate((t) => {
          const p = layerOf(t, sel);
          if (p) Object.assign(p, { x: Math.round((p.x + dx) * 10) / 10, y: Math.round((p.y + dy) * 10) / 10 });
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        mutate((t) => removeLayer(t, sel));
        setSel(null);
        setTab('layers');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        let next: Sel = null;
        mutate((t) => void (next = duplicateLayer(t, sel)));
        if (next) setSel(next);
        else toast('Título, texto e logo existem uma vez só por template', 'info');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!tpl) {
    if (builtIn)
      return (
        <ReadOnly
          name={builtIn.name}
          onClone={() => {
            const id = createTemplate(builtIn);
            navigate(`/templates/${id}`);
          }}
        />
      );
    return <NotFound message="Esse template não existe mais." />;
  }

  const mutate: Mutate = (fn) => updateTemplate(tpl.id, fn);

  /** Selecionar uma camada (na lista ou na prévia) abre os ajustes dela; tirar a seleção volta para a lista. */
  const select = (s: Sel) => {
    setSel(s);
    setTab((t) => (s ? 'layer' : t === 'layer' ? 'layers' : t));
  };

  const shuffle = () => {
    setRandomMain(randomBrand());
    setContent(randomContent(tpl.roles[Math.floor(Math.random() * tpl.roles.length)] ?? 'content'));
    setImageOffset((n) => n + 1);
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        crumbs={[{ label: 'Templates', to: '/templates' }, { label: tpl.name || 'Sem nome' }]}
        actions={
          <>
            <span className="hidden items-center gap-1 text-xs text-zinc-400 xl:flex" title="Tudo é salvo automaticamente neste navegador">
              <Check size={13} /> Salvo às {timeFmt.format(tpl.updatedAt)}
            </span>
            <Button
              icon={<Copy size={15} />}
              onClick={() => {
                const id = createTemplate(tpl);
                navigate(`/templates/${id}`);
                toast('Cópia criada');
              }}
            >
              <span className="hidden sm:inline">Duplicar</span>
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={15} />}
              onClick={() => {
                const warn = usage ? `\n\n${usage} slide(s) usam este template e voltam para o template de origem.` : '';
                if (!confirm(`Apagar o template "${tpl.name}"?${warn}`)) return;
                deleteTemplate(tpl.id);
                navigate('/templates');
              }}
            >
              <span className="hidden sm:inline">Apagar</span>
            </Button>
            <Button
              variant="primary"
              icon={<Save size={15} />}
              onClick={() => {
                mutate(() => {});
                toast(usage ? `Template salvo — já vale nos ${usage} slide(s) que o usam` : 'Template salvo');
              }}
            >
              Salvar
            </Button>
          </>
        }
      />
      {/* Controles ~20% · prévia ~50% · variações ~30% */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,2fr)_5fr_minmax(240px,3fr)]">
        <RecentColorsContext.Provider value={collectHexColors(tpl)}>
        <section className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
          <div className="shrink-0 border-b border-zinc-100 p-2">
            <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-zinc-100 p-0.5">
              {(
                [
                  ['template', <Settings2 key="i" size={13} />, 'Template', 'Nome, tipos de slide, fundo'],
                  ['layers', <Layers key="i" size={13} />, 'Camadas', 'O que existe no template'],
                  ['layer', <SlidersHorizontal key="i" size={13} />, 'Ajustes', 'Da camada selecionada'],
                ] as const
              ).map(([key, icon, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  onClick={() => setTab(key)}
                  className={cx(
                    'flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition',
                    tab === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'template' && <GeneralPanel tpl={tpl} mutate={mutate} palette={brand.colors} usage={usage} />}
            {tab === 'layers' && <ElementsPanel tpl={tpl} content={content} mutate={mutate} sel={sel} onSelect={select} onHover={setHovered} />}
            {tab === 'layer' &&
              (sel ? (
                <>
                  <button
                    type="button"
                    onClick={() => setTab('layers')}
                    className="flex items-center gap-1 px-5 pt-4 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <ChevronLeft size={14} /> Todas as camadas
                  </button>
                  <SelectionPanel key={JSON.stringify(sel)} tpl={tpl} mutate={mutate} sel={sel} onSelect={select} brand={brand} previewText={content} />
                </>
              ) : (
                <div className="p-5 text-sm text-zinc-500">
                  Nenhuma camada selecionada. Clique num elemento da prévia ou escolha em{' '}
                  <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setTab('layers')}>
                    Camadas
                  </button>
                  .
                </div>
              ))}
          </div>
        </section>
        </RecentColorsContext.Provider>

        <section className="flex min-h-0 flex-col bg-zinc-100">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/80 px-4 py-2">
            <Segmented size="sm" value={format} onChange={setFormat} options={FORMAT_LIST.map((f) => ({ value: f, label: FORMATS[f].label, title: FORMATS[f].hint }))} />
            <select
              value={brandSource}
              onChange={(e) => setBrandSource(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none"
              title="Cores e fontes da prévia"
            >
              <option value="random">Marca sorteada</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Marca: {c.name}
                </option>
              ))}
            </select>
            <Button size="sm" icon={<Dices size={15} />} onClick={shuffle} title="Sorteia cores, texto e imagens da prévia">
              Sortear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title={withImages ? 'Mostrar espaços de imagem vazios' : 'Preencher com imagens de exemplo'}
              icon={withImages ? <Images size={15} /> : <ImageOff size={15} />}
              onClick={() => setWithImages((v) => !v)}
            />
            <GridToggle />
            <GuidesToggle />
            <span className="ml-auto hidden text-xs text-zinc-500 2xl:inline">Setas movem · Delete remove · Ctrl+D duplica · Alt solta o encaixe</span>
          </div>
          <Canvas
            tpl={tpl}
            mutate={mutate}
            sel={sel}
            onSelect={select}
            hovered={tab === 'layers' ? hovered : null}
            format={format}
            brand={brand}
            slide={previewSlide(tpl, content, withImages, imageOffset)}
          />
        </section>

        <Variations
          tpl={tpl}
          format={format}
          withImages={withImages}
          clients={clients}
          onUse={(v) => {
            setBrandSource(v.clientId ?? 'random');
            if (!v.clientId) setRandomMain(v.brand);
            setContent(v.content);
          }}
        />
      </div>
    </div>
  );
}

function GuidesToggle() {
  const ui = useUi();
  return (
    <Button
      size="sm"
      variant="ghost"
      title="Margens e área segura"
      className={cx(ui.showGuides && 'bg-brand-50! text-brand-700!')}
      icon={<Ruler size={15} />}
      onClick={() => ui.toggle('showGuides')}
    />
  );
}

function GridToggle() {
  const ui = useUi();
  return (
    <Button size="sm" variant="ghost" title="Grade" className={cx(ui.showGrid && 'bg-brand-50! text-brand-700!')} icon={<Grid3x3 size={15} />} onClick={() => ui.toggle('showGrid')} />
  );
}

function ReadOnly({ name, onClone }: { name: string; onClone: () => void }) {
  return (
    <div className="min-h-full">
      <AppHeader crumbs={[{ label: 'Templates', to: '/templates' }, { label: name }]} />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">“{name}” é um template padrão</h1>
        <p className="mt-2 text-sm text-zinc-500">Templates padrão não mudam. Clone para ter uma cópia sua e editar à vontade.</p>
        <Button variant="primary" className="mt-5" icon={<Copy size={15} />} onClick={onClone}>
          Clonar e editar
        </Button>
      </main>
    </div>
  );
}

// ——— Painéis da esquerda ———

function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="border-b border-zinc-100 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function GeneralPanel({ tpl, mutate, palette, usage }: { tpl: CustomTemplate; mutate: Mutate; palette: Palette; usage: number }) {
  const toggleRole = (r: SlideRole) =>
    mutate((t) => {
      const has = t.roles.includes(r);
      if (has && t.roles.length === 1) return;
      t.roles = has ? t.roles.filter((x) => x !== r) : [...t.roles, r];
    });
  return (
    <Panel title="Configurações do template">
      <Input value={tpl.name} onChange={(e) => mutate((t) => void (t.name = e.target.value))} placeholder="Nome do template" />
      {usage > 0 && <p className="text-xs text-zinc-500">Usado em {usage} slide(s): as mudanças aparecem neles também.</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <Label>Estilo</Label>
          <Segmented
            size="sm"
            value={tpl.style ?? 'design'}
            onChange={(v) => mutate((t) => void (t.style = v))}
            options={[
              { value: 'design', label: 'Design' },
              { value: 'social', label: 'Formato de post' },
            ]}
          />
        </div>
        <div>
          <Label>Tom do fundo</Label>
          <Segmented
            size="sm"
            value={tpl.tone ?? 'auto'}
            onChange={(v) => mutate((t) => void (v === 'auto' ? delete t.tone : (t.tone = v)))}
            options={[
              { value: 'auto', label: 'Pela cor', title: 'Calculado pela cor de fundo' },
              { value: 'dark', label: 'Escuro', title: 'Use com imagem de fundo escura' },
              { value: 'light', label: 'Claro' },
            ]}
          />
        </div>
      </div>
      <div>
        <Label>Serve para (o sorteio usa isso)</Label>
        <div className="flex flex-wrap gap-1">
          {(Object.entries(ROLE_LABELS) as [SlideRole, string][]).map(([r, l]) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleRole(r)}
              className={cx(
                'rounded-full px-2.5 py-1 text-xs font-medium transition',
                tpl.roles.includes(r) ? 'bg-brand-600 text-brand-fg' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Fundo</Label>
        <ColorSwatches value={tpl.bg} palette={palette} onChange={(c) => c !== 'auto' && mutate((t) => void (t.bg = c))} />
      </div>
      <Slider label="Capacidade (caracteres que cabem)" value={tpl.capacity} min={40} max={900} step={10} onChange={(v) => mutate((t) => void (t.capacity = v))} />
      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" checked={!!tpl.needsTitle} onChange={(e) => mutate((t) => void (t.needsTitle = e.target.checked || undefined))} className="accent-brand-600" />
        Só faz sentido com título (não é sorteado para slides só com texto)
      </label>
    </Panel>
  );
}

interface LayerRow {
  sel: Sel;
  label: string;
  detail?: string;
  icon: LucideIcon | string;
  remove: () => void;
}

function ElementsPanel({
  tpl,
  content,
  mutate,
  sel,
  onSelect,
  onHover,
}: {
  tpl: CustomTemplate;
  /** Texto da prévia, mostrado nas camadas de texto. */
  content: SlideContent;
  mutate: Mutate;
  sel: Sel;
  onSelect: (s: Sel) => void;
  onHover: (s: Sel) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [iconModal, setIconModal] = useState(false);

  const rows: LayerRow[] = [
    ...(tpl.icons ?? []).map((ic, i) => ({
      sel: { kind: 'icon', i } as Sel,
      label: 'Ícone',
      detail: ic.icon.split(':')[1],
      icon: ic.icon,
      remove: () => mutate((t) => void t.icons?.splice(i, 1)),
    })),
    ...(['title', 'body'] as const)
      .filter((k) => tpl.boxes.some((b) => b.key === k))
      .map((k) => ({
        sel: { kind: 'box', key: k } as Sel,
        label: k === 'title' ? 'Título' : 'Texto',
        detail: plainText(content[k]) || 'vazio',
        icon: Type,
        remove: () => mutate((t) => void (t.boxes = t.boxes.filter((b) => b.key !== k))),
      })),
    ...(tpl.logo ? [{ sel: { kind: 'logo' } as Sel, label: 'Logo', icon: Stamp, remove: () => mutate((t) => void delete t.logo) }] : []),
    ...(tpl.decorations ?? [])
      .map((d, i) => ({
        sel: { kind: 'decor', i } as Sel,
        label: DECOR_LABELS[d.kind],
        detail: d.kind === 'glyph' ? d.text : undefined,
        icon: DECOR_ICONS[d.kind],
        remove: () => mutate((t) => void t.decorations?.splice(i, 1)),
      }))
      .reverse(),
    ...tpl.images
      .map((_, i) => ({
        sel: { kind: 'image', i } as Sel,
        label: tpl.images.length > 1 ? `Imagem ${i + 1}` : 'Imagem',
        icon: ImageIcon,
        remove: () => mutate((t) => void t.images.splice(i, 1)),
      }))
      .reverse(),
  ];

  const add = (fn: (t: CustomTemplate) => Sel) => {
    let next: Sel = null;
    mutate((t) => void (next = fn(t)));
    onSelect(next);
    setAdding(false);
  };

  const addBox = (key: TextKey): TextBoxDef =>
    key === 'title'
      ? { key, x: 8, y: 10, w: 84, h: 20, size: 72, font: 'highlight', weight: 800, color: 'auto', emphasis: 'accent', lineHeight: 1.05 }
      : { key, x: 8, y: 40, w: 84, h: 40, size: 40, font: 'base', color: 'auto', emphasis: 'primary', lineHeight: 1.4 };

  const options: { label: string; icon: LucideIcon; disabled?: boolean; run: () => void }[] = [
    { label: 'Título', icon: Type, disabled: tpl.boxes.some((b) => b.key === 'title'), run: () => add((t) => (t.boxes.push(addBox('title')), { kind: 'box', key: 'title' })) },
    { label: 'Texto', icon: Type, disabled: tpl.boxes.some((b) => b.key === 'body'), run: () => add((t) => (t.boxes.push(addBox('body')), { kind: 'box', key: 'body' })) },
    { label: 'Imagem', icon: ImageIcon, run: () => add((t) => (t.images.push({ x: 8, y: 8, w: 84, h: 40, radius: 24 }), { kind: 'image', i: t.images.length - 1 })) },
    {
      label: 'Forma',
      icon: Square,
      run: () => add((t) => ((t.decorations ??= []).push({ kind: 'rect', x: 8, y: 8, w: 20, h: 1.2, color: 'accent', radius: 99 }), { kind: 'decor', i: t.decorations.length - 1 })),
    },
    {
      label: 'Símbolo',
      icon: Quote,
      run: () => add((t) => ((t.decorations ??= []).push({ kind: 'glyph', x: 6, y: 4, size: 300, text: '“', color: 'accent', font: 'highlight' }), { kind: 'decor', i: t.decorations.length - 1 })),
    },
    {
      label: 'Número do slide',
      icon: Hash,
      run: () => add((t) => ((t.decorations ??= []).push({ kind: 'index', x: 8, y: 6, size: 200, color: 'accent', font: 'ultra' }), { kind: 'decor', i: t.decorations.length - 1 })),
    },
    {
      label: 'Perfil',
      icon: UserRound,
      run: () => add((t) => ((t.decorations ??= []).push({ kind: 'profile', x: 8, y: 8, w: 84, size: 120, color: 'auto', layout: 'row' }), { kind: 'decor', i: t.decorations.length - 1 })),
    },
    {
      label: 'Números do perfil',
      icon: BarChart3,
      run: () => add((t) => ((t.decorations ??= []).push({ kind: 'stats', x: 8, y: 40, w: 84, size: 34, color: 'auto' }), { kind: 'decor', i: t.decorations.length - 1 })),
    },
    { label: 'Logo', icon: Stamp, disabled: !!tpl.logo, run: () => add((t) => ((t.logo = { x: 8, y: 88, w: 22, h: 7 }), { kind: 'logo' })) },
    {
      label: 'Ícone',
      icon: Shapes,
      run: () => {
        setAdding(false);
        setIconModal(true);
      },
    },
  ];

  return (
    <Panel
      title="Camadas do template"
      actions={
        <Button size="sm" variant={adding ? 'primary' : 'secondary'} icon={<Plus size={14} />} onClick={() => setAdding((v) => !v)}>
          Adicionar
        </Button>
      }
    >
      {adding && (
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-50 p-2">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              disabled={o.disabled}
              onClick={o.run}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-white hover:shadow-sm disabled:opacity-40"
            >
              <o.icon size={14} /> {o.label}
            </button>
          ))}
        </div>
      )}
      {iconModal && (
        <IconPickerModal
          title="Ícone do template"
          onClose={() => setIconModal(false)}
          onPick={(icon) => add((t) => ((t.icons ??= []).push({ icon, x: 50, y: 50, size: 12, rotate: 0, color: 'accent' }), { kind: 'icon', i: t.icons.length - 1 }))}
        />
      )}
      <ul className="space-y-0.5">
        {rows.map((r) => {
          const on = same(r.sel, sel);
          const IconC = typeof r.icon === 'string' ? null : r.icon;
          return (
            <li
              key={JSON.stringify(r.sel)}
              onMouseEnter={() => onHover(r.sel)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(r.sel)}
              className={cx('group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm', on ? 'bg-brand-50 text-brand-700' : 'text-zinc-700 hover:bg-zinc-50')}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-zinc-100">
                {IconC ? <IconC size={14} /> : <Icon icon={r.icon as string} width={14} height={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate leading-tight">{r.label}</span>
                {r.detail && <span className="block truncate text-[11px] leading-tight text-zinc-400">{r.detail}</span>}
              </span>
              <button
                type="button"
                title="Remover"
                onClick={(e) => {
                  e.stopPropagation();
                  r.remove();
                  onHover(null);
                  onSelect(null);
                }}
                className="grid h-6 w-6 place-items-center rounded text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-2 py-3 text-sm text-zinc-500">Template vazio. Use “Adicionar”.</li>}
      </ul>
    </Panel>
  );
}

// ——— Propriedades do elemento selecionado ———

function RectFields({ r, onChange, keys = ['x', 'y', 'w', 'h'] }: { r: Partial<Rect>; onChange: (p: Partial<Rect>) => void; keys?: (keyof Rect)[] }) {
  const labels: Record<keyof Rect, string> = { x: 'X %', y: 'Y %', w: 'Largura %', h: 'Altura %' };
  return (
    <div className="grid grid-cols-4 gap-2">
      {keys.map((k) => (
        <NumberField key={k} label={labels[k]} value={r[k] ?? 0} step={0.5} onChange={(v) => onChange({ [k]: v })} />
      ))}
    </div>
  );
}

function FontRoleSegmented({ value, onChange }: { value: FontRole; onChange: (f: FontRole) => void }) {
  return (
    <Segmented<FontRole>
      size="sm"
      value={value}
      onChange={onChange}
      options={[
        { value: 'base', label: 'Base' },
        { value: 'highlight', label: 'Destaque' },
        { value: 'ultra', label: 'Ultra' },
      ]}
    />
  );
}

interface SelectionProps {
  tpl: CustomTemplate;
  mutate: Mutate;
  sel: Sel;
  onSelect: (s: Sel) => void;
  brand: Brand;
  /** Texto da prévia (teste na janela de fontes). */
  previewText: SlideContent;
}

function SelectionPanel({ tpl, mutate, sel, brand, previewText }: SelectionProps) {
  const [iconModal, setIconModal] = useState(false);
  const palette = brand.colors;
  if (!sel) return <p className="p-5 text-sm text-zinc-500">Selecione um elemento na lista ou na prévia para ajustar.</p>;

  if (sel.kind === 'box') {
    const b = tpl.boxes.find((x) => x.key === sel.key);
    if (!b) return null;
    const set = (p: Partial<TextBoxDef>) =>
      mutate((t) => {
        const box = t.boxes.find((x) => x.key === sel.key);
        if (box) Object.assign(box, p);
      });
    return (
      <Panel title={sel.key === 'title' ? 'Título' : 'Texto'}>
        <RectFields r={b} onChange={set} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Tamanho da fonte (px)" value={b.size} min={8} max={400} onChange={(v) => set({ size: v })} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">Peso</span>
            <select value={b.weight ?? 400} onChange={(e) => set({ weight: Number(e.target.value) })} className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm outline-none">
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <Label>Fonte</Label>
          <FontChoice
            fonts={brand.fonts}
            role={b.font}
            family={b.family}
            onRole={(font) => set({ font, family: undefined })}
            onFamily={(family) => set({ family })}
            previewText={plainText(previewText[sel.key])}
            previewStyle={{ weight: b.weight, italic: b.italic, uppercase: b.uppercase }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          <div>
            <Label>Alinhamento</Label>
            <Segmented
              size="sm"
              value={b.align ?? 'left'}
              onChange={(align) => set({ align })}
              options={[
                { value: 'left', label: 'Esq.' },
                { value: 'center', label: 'Centro' },
                { value: 'right', label: 'Dir.' },
              ]}
            />
          </div>
          <div>
            <Label>Vertical</Label>
            <Segmented
              size="sm"
              value={b.valign ?? 'top'}
              onChange={(valign) => set({ valign })}
              options={[
                { value: 'top', label: 'Topo' },
                { value: 'center', label: 'Meio' },
                { value: 'bottom', label: 'Base' },
              ]}
            />
          </div>
        </div>
        <div>
          <Label>Cor</Label>
          <ColorSwatches allowAuto value={b.color ?? 'auto'} palette={palette} onChange={(c) => set({ color: c })} />
        </div>
        <div>
          <Label>Cor do destaque (negrito)</Label>
          <ColorSwatches allowAuto autoLabel="Mesma cor do texto" value={b.emphasis ?? 'auto'} palette={palette} onChange={(c) => set({ emphasis: c === 'auto' ? undefined : c })} />
        </div>
        <Slider label="Entrelinha" value={b.lineHeight ?? 1.25} min={0.8} max={2.2} step={0.05} onChange={(v) => set({ lineHeight: v })} />
        <Slider label="Espaço entre letras" value={b.letterSpacing ?? 0} min={-0.1} max={0.5} step={0.01} unit="em" onChange={(v) => set({ letterSpacing: v })} />
        <div className="flex gap-4 text-xs text-zinc-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!b.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} className="accent-brand-600" />
            Maiúsculas
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!b.italic} onChange={(e) => set({ italic: e.target.checked })} className="accent-brand-600" />
            Itálico
          </label>
        </div>
      </Panel>
    );
  }

  if (sel.kind === 'image') {
    const im = tpl.images[sel.i];
    if (!im) return null;
    const set = (fn: (x: (typeof tpl.images)[number]) => void) => mutate((t) => t.images[sel.i] && fn(t.images[sel.i]));
    const ov = im.overlay;
    return (
      <Panel title="Imagem">
        <RectFields r={im} onChange={(p) => set((x) => Object.assign(x, p))} />
        <Slider label="Cantos arredondados" value={im.radius ?? 0} min={0} max={200} unit="px" onChange={(v) => set((x) => void (x.radius = v))} />
        <div>
          <Label>Camada de cor por cima</Label>
          <Segmented
            size="sm"
            value={ov?.kind ?? 'none'}
            onChange={(k) => set((x) => void (k === 'none' ? delete x.overlay : (x.overlay = { color: ov?.color ?? 'dark', opacity: ov?.opacity ?? 0.6, kind: k })))}
            options={[
              { value: 'none', label: 'Nenhuma' },
              { value: 'gradient', label: 'Degradê' },
              { value: 'solid', label: 'Sólida' },
            ]}
          />
        </div>
        {ov && (
          <>
            <ColorSwatches value={ov.color} palette={palette} onChange={(c) => c !== 'auto' && set((x) => void (x.overlay!.color = c))} />
            <Slider label="Opacidade" value={Math.round(ov.opacity * 100)} min={0} max={100} unit="%" onChange={(v) => set((x) => void (x.overlay!.opacity = v / 100))} />
          </>
        )}
      </Panel>
    );
  }

  if (sel.kind === 'logo') {
    const l = tpl.logo;
    if (!l) return null;
    const set = (p: Partial<NonNullable<TemplateDef['logo']>>) => mutate((t) => t.logo && Object.assign(t.logo, p));
    return (
      <Panel title="Logo">
        <RectFields r={l} onChange={set} />
        <div>
          <Label>Alinhamento na caixa</Label>
          <Segmented
            size="sm"
            value={l.align ?? 'left'}
            onChange={(align) => set({ align })}
            options={[
              { value: 'left', label: 'Esq.' },
              { value: 'center', label: 'Centro' },
              { value: 'right', label: 'Dir.' },
            ]}
          />
        </div>
        <div>
          <Label>Versão do logo</Label>
          <Segmented
            size="sm"
            value={l.tone ?? 'auto'}
            onChange={(v) => mutate((t) => t.logo && (v === 'auto' ? delete t.logo.tone : (t.logo.tone = v)))}
            options={[
              { value: 'auto', label: 'Pelo fundo' },
              { value: 'dark', label: 'Negativo', title: 'Para fundo escuro' },
              { value: 'light', label: 'Positivo', title: 'Para fundo claro' },
            ]}
          />
        </div>
      </Panel>
    );
  }

  if (sel.kind === 'icon') {
    const ic = tpl.icons?.[sel.i];
    if (!ic) return null;
    const set = (p: Partial<typeof ic>) => mutate((t) => t.icons?.[sel.i] && Object.assign(t.icons[sel.i], p));
    return (
      <Panel title="Ícone">
        <button type="button" onClick={() => setIconModal(true)} className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left hover:bg-zinc-50">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-zinc-100">
            <Icon icon={ic.icon} width={24} height={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-zinc-800">{ic.icon}</span>
            <span className="text-xs text-brand-700">Trocar ícone</span>
          </span>
        </button>
        {iconModal && <IconPickerModal title="Trocar ícone" onPick={(icon) => set({ icon })} onClose={() => setIconModal(false)} />}
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Centro X %" value={ic.x} step={0.5} onChange={(x) => set({ x })} />
          <NumberField label="Centro Y %" value={ic.y} step={0.5} onChange={(y) => set({ y })} />
          <NumberField label="Tamanho %" value={ic.size} step={0.5} onChange={(size) => set({ size })} />
        </div>
        <Slider label="Rotação" value={ic.rotate} min={-180} max={180} unit="°" onChange={(rotate) => set({ rotate })} />
        <div>
          <Label>Cor</Label>
          <ColorSwatches value={ic.color} palette={palette} onChange={(c) => c !== 'auto' && set({ color: c })} />
        </div>
      </Panel>
    );
  }

  // Decorações
  const d = tpl.decorations?.[sel.i];
  if (!d) return null;
  const set = (p: Partial<DecorationDef>) => mutate((t) => t.decorations?.[sel.i] && Object.assign(t.decorations[sel.i], p));
  return (
    <Panel title={DECOR_LABELS[d.kind]}>
      {d.kind === 'rect' && (
        <>
          <RectFields r={d} onChange={set} />
          <div>
            <Label>Cor</Label>
            <ColorSwatches value={d.color} palette={palette} onChange={(c) => c !== 'auto' && set({ color: c })} />
          </div>
          <Slider label="Cantos arredondados" value={d.radius ?? 0} min={0} max={200} unit="px" onChange={(v) => set({ radius: v })} />
          <Slider label="Opacidade" value={Math.round((d.opacity ?? 1) * 100)} min={0} max={100} unit="%" onChange={(v) => set({ opacity: v / 100 })} />
        </>
      )}
      {(d.kind === 'glyph' || d.kind === 'index') && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="X %" value={d.x} step={0.5} onChange={(x) => set({ x })} />
            <NumberField label="Y %" value={d.y} step={0.5} onChange={(y) => set({ y })} />
            <NumberField label="Tamanho (px)" value={d.size} onChange={(size) => set({ size })} />
          </div>
          {d.kind === 'glyph' && (
            <div>
              <Label>Caractere(s)</Label>
              <Input value={d.text} onChange={(e) => set({ text: e.target.value } as Partial<DecorationDef>)} />
            </div>
          )}
          <div>
            <Label>Fonte</Label>
            <FontRoleSegmented value={d.font} onChange={(font) => set({ font })} />
          </div>
          <div>
            <Label>Cor</Label>
            <ColorSwatches value={d.color} palette={palette} onChange={(c) => c !== 'auto' && set({ color: c })} />
          </div>
        </>
      )}
      {(d.kind === 'profile' || d.kind === 'stats') && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <NumberField label="X %" value={d.x} step={0.5} onChange={(x) => set({ x })} />
            <NumberField label="Y %" value={d.y} step={0.5} onChange={(y) => set({ y })} />
            <NumberField label="Largura %" value={d.w} step={0.5} onChange={(w) => set({ w })} />
            <NumberField label="Tamanho" value={d.size} onChange={(size) => set({ size })} />
          </div>
          {d.kind === 'profile' && (
            <div>
              <Label>Disposição</Label>
              <Segmented
                size="sm"
                value={d.layout}
                onChange={(layout) => set({ layout } as Partial<DecorationDef>)}
                options={[
                  { value: 'row', label: 'Em linha (post)' },
                  { value: 'stacked', label: 'Empilhado (perfil)' },
                ]}
              />
            </div>
          )}
          <div>
            <Label>Cor</Label>
            <ColorSwatches allowAuto value={d.color} palette={palette} onChange={(c) => set({ color: c })} />
          </div>
          <div>
            <Label>Cor secundária (@, legendas)</Label>
            <ColorSwatches
              allowAuto
              autoLabel="A mesma cor, mais transparente"
              value={d.muted ?? 'auto'}
              palette={palette}
              onChange={(c) => set({ muted: c === 'auto' ? undefined : (c as ColorRef) } as Partial<DecorationDef>)}
            />
          </div>
        </>
      )}
    </Panel>
  );
}

// ——— Prévia interativa ———

interface CanvasProps {
  tpl: CustomTemplate;
  hovered: Sel;
  mutate: Mutate;
  sel: Sel;
  onSelect: (s: Sel) => void;
  format: Format;
  brand: Brand;
  slide: ReturnType<typeof previewSlide>;
}

interface Item {
  sel: Sel;
  label: string;
  rect: Rect;
  resizable: boolean;
  square?: boolean;
  apply: (t: CustomTemplate, r: Rect) => void;
}

/** Caixa aproximada (em %) das decorações que só têm ponto de origem. */
function decorRect(d: DecorationDef, height: number): Rect {
  const toW = (px: number) => (px / SLIDE_WIDTH) * 100;
  const toH = (px: number) => (px / height) * 100;
  switch (d.kind) {
    case 'rect':
      return d;
    case 'glyph':
      return { x: d.x, y: d.y, w: toW(d.size * 0.6 * Math.max(1, d.text.length)), h: toH(d.size) };
    case 'index':
      return { x: d.x, y: d.y, w: toW(d.size * 1.2), h: toH(d.size) };
    case 'profile':
      return { x: d.x, y: d.y, w: d.w, h: toH(d.layout === 'stacked' ? d.size * 1.65 : d.size) };
    case 'stats':
      return { x: d.x, y: d.y, w: d.w, h: toH(d.size * 2.4) };
  }
}

function Canvas({ tpl, mutate, sel, hovered, onSelect, format, brand, slide }: CanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [lines, setLines] = useState<{ x: number[]; y: number[] } | null>(null);
  const showGrid = useUi((s) => s.showGrid);
  const showGuides = useUi((s) => s.showGuides);
  const snapToGrid = useUi((s) => s.snapToGrid);
  const height = slideHeight(format);
  const width = Math.max(0, Math.min(size.w - 64, ((size.h - 64) * SLIDE_WIDTH) / height));
  const tx = snapTargets('x', height, snapToGrid);
  const ty = snapTargets('y', height, snapToGrid);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const items: Item[] = [
    ...tpl.images.map((im, i) => ({
      sel: { kind: 'image', i } as Sel,
      label: 'Imagem',
      rect: im,
      resizable: true,
      apply: (t: CustomTemplate, r: Rect) => Object.assign(t.images[i], r),
    })),
    ...(tpl.decorations ?? []).map((d, i) => ({
      sel: { kind: 'decor', i } as Sel,
      label: DECOR_LABELS[d.kind],
      rect: decorRect(d, height),
      resizable: d.kind === 'rect',
      apply: (t: CustomTemplate, r: Rect) => {
        const target = t.decorations![i];
        if (target.kind === 'rect') Object.assign(target, r);
        else Object.assign(target, { x: r.x, y: r.y });
      },
    })),
    ...(tpl.logo
      ? [{ sel: { kind: 'logo' } as Sel, label: 'Logo', rect: tpl.logo, resizable: true, apply: (t: CustomTemplate, r: Rect) => t.logo && Object.assign(t.logo, r) }]
      : []),
    ...tpl.boxes.map((b) => ({
      sel: { kind: 'box', key: b.key } as Sel,
      label: b.key === 'title' ? 'Título' : 'Texto',
      rect: b,
      resizable: true,
      apply: (t: CustomTemplate, r: Rect) => {
        const target = t.boxes.find((x) => x.key === b.key);
        if (target) Object.assign(target, r);
      },
    })),
    ...(tpl.icons ?? []).map((ic, i) => ({
      sel: { kind: 'icon', i } as Sel,
      label: 'Ícone',
      rect: iconBox({ ...ic, id: '' }, height),
      resizable: true,
      square: true,
      apply: (t: CustomTemplate, r: Rect) => {
        const target = t.icons![i];
        Object.assign(target, { x: r.x + r.w / 2, y: r.y + r.h / 2, size: clamp(r.w, 2, 100) });
      },
    })),
  ];

  const round = (r: Rect): Rect => ({ x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.w * 10) / 10, h: Math.round(r.h * 10) / 10 });

  const drag = (e: React.PointerEvent, it: Item, dir?: HandleDir) => {
    onSelect(it.sel);
    if (!frame.current) return;
    const start = it.rect;
    startDrag(
      e,
      frame.current,
      (dx, dy, ev) => {
        let r: Rect;
        let l: { x: number[]; y: number[] };
        if (dir && it.square) {
          // Ícone: quadrado, cresce a partir do centro.
          const ratio = height / SLIDE_WIDTH;
          const ex = dir.includes('e') ? dx : dir.includes('w') ? -dx : 0;
          const ey = (dir.includes('s') ? dy : dir.includes('n') ? -dy : 0) * ratio;
          const w = clamp(start.w + (ex + ey), 2, 100);
          const h = (w * SLIDE_WIDTH) / height;
          r = { x: start.x + start.w / 2 - w / 2, y: start.y + start.h / 2 - h / 2, w, h };
          l = { x: [], y: [] };
        } else if (dir) {
          const res = resizeRectSnapped(start, dir, dx, dy, ev.altKey, tx, ty);
          r = res.rect;
          l = res.lines;
        } else {
          const m = moveRectSnapped(start, dx, dy, ev.altKey, tx, ty);
          r = { ...start, x: m.x, y: m.y };
          l = m.lines;
        }
        mutate((t) => it.apply(t, round(r)));
        setLines(l);
      },
      () => setLines(null),
    );
  };

  return (
    <div
      ref={box}
      className="relative grid min-h-[420px] min-w-0 flex-1 place-items-center overflow-hidden"
      onPointerDown={(e) => !(e.target as HTMLElement).closest('[data-handle]') && onSelect(null)}
    >
      {width > 0 && (
        <div className="shadow-2xl shadow-black/20">
          <ScaledSlide
            format={format}
            width={width}
            overlay={
              <div ref={frame} className="absolute inset-0">
                {showGrid && <GridOverlay height={height} />}
                {showGuides && <GuidesOverlay format={format} />}
                {items.map((it) => (
                  <Frame
                    key={JSON.stringify(it.sel)}
                    rect={it.rect}
                    selected={same(it.sel, sel)}
                    highlighted={same(it.sel, hovered)}
                    label={it.label}
                    cursor="move"
                    square={it.square}
                    onPointerDown={(e) => drag(e, it)}
                    onResize={it.resizable ? (e, dir) => drag(e, it, dir) : undefined}
                  />
                ))}
                {lines?.x.map((x) => <div key={`gx${x}`} className="pointer-events-none absolute inset-y-0 w-px bg-pink-500" style={{ left: `${x}%` }} />)}
                {lines?.y.map((y) => <div key={`gy${y}`} className="pointer-events-none absolute inset-x-0 h-px bg-pink-500" style={{ top: `${y}%` }} />)}
              </div>
            }
          >
            <SlideView slide={slide} template={tpl} index={0} total={5} format={format} brand={brand} pagination={{ style: 'dots', x: 50, y: 95, color: 'auto' }} />
          </ScaledSlide>
        </div>
      )}
    </div>
  );
}

// ——— Variações ———

interface Variation {
  key: string;
  label: string;
  clientId?: string;
  brand: Brand;
  content: SlideContent;
  imageOffset: number;
}

const VARIATIONS = 6;

/** Clientes de verdade primeiro (até 6); o resto são marcas sorteadas. */
function makeVariations(tpl: TemplateDef, clients: Client[]): Variation[] {
  const roles = tpl.roles.length ? tpl.roles : (['content'] as SlideRole[]);
  const shuffled = [...clients].sort(() => Math.random() - 0.5).slice(0, VARIATIONS);
  return Array.from({ length: VARIATIONS }, (_, i) => {
    const c = shuffled[i];
    return {
      key: `${i}-${Math.random()}`,
      label: c ? c.name : 'Marca sorteada',
      clientId: c?.id,
      brand: c ? brandOf(c) : randomBrand(),
      content: randomContent(roles[i % roles.length]),
      imageOffset: i,
    };
  });
}

function Variations({
  tpl,
  format,
  withImages,
  clients,
  onUse,
}: {
  tpl: CustomTemplate;
  format: Format;
  withImages: boolean;
  clients: Client[];
  onUse: (v: Variation) => void;
}) {
  const [list, setList] = useState(() => makeVariations(tpl, clients));
  useEffect(() => list.forEach((v) => ensureFonts(Object.values(v.brand.fonts))), [list]);

  return (
    <aside className="hidden min-h-0 flex-col border-l border-zinc-200 bg-white lg:flex">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2">
        <div>
          <div className="text-sm font-medium text-zinc-900">Variações</div>
          <div className="text-[11px] text-zinc-500">Outras marcas, fontes e textos</div>
        </div>
        <Button size="sm" icon={<Dices size={14} />} title="Sortear outras variações" onClick={() => setList(makeVariations(tpl, clients))} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-3">
        {list.map((v) => (
          <button key={v.key} type="button" onClick={() => onUse(v)} title="Usar na prévia principal" className="group text-left">
            <div className="overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 transition group-hover:ring-2 group-hover:ring-brand-500">
              <ScaledSlide format={format}>
                <SlideView
                  slide={previewSlide(tpl, v.content, withImages, v.imageOffset)}
                  template={tpl}
                  index={0}
                  total={5}
                  format={format}
                  brand={v.brand}
                  pagination={{ style: 'dots', x: 50, y: 95, color: 'auto' }}
                />
              </ScaledSlide>
            </div>
            <div className="mt-1 truncate text-[11px] text-zinc-500">
              {v.label} · {v.brand.fonts.highlight}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
