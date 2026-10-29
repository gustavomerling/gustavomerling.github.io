import { ChevronDown, Download, Eye, Grid3x3, Loader2, Magnet, Redo2, Ruler, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Segmented, cx } from '../components/ui';
import { FORMATS, FORMAT_LIST } from '../lib/formats';
import { applyTemplate } from '../lib/generate';
import { uid } from '../lib/id';
import { isHidden, resolveBox } from '../slides/layout';
import { getTemplate } from '../templates';
import { useDb } from '../store/db';
import { toast, useUi } from '../store/ui';
import type { Brand, Client, Post, Slide, TextKey } from '../types';
import { ExportStage } from './ExportStage';
import { RecentColorsContext, collectHexColors } from './ColorSwatches';
import { Inspector, PaginationStylePicker } from './Inspector';
import { InstagramPreview } from './InstagramPreview';
import { ShortcutsHelp } from './ShortcutsHelp';
import { SlideStrip } from './SlideStrip';
import { Stage } from './Stage';
import { clamp, type Selection } from './types';
import { usePostHistory } from './useHistory';

interface DesignViewProps {
  post: Post;
  client: Client;
  brand: Brand;
}

type ExportJob = { only?: number; done: number };

/** Espaços de imagem vazios (cinza) em camadas visíveis. */
const emptySlots = (post: Post) =>
  post.slides.reduce((n, s) => n + getTemplate(s.templateId).images.filter((_, i) => !s.images[i]?.imageId && !isHidden(s, `img:${i}`)).length, 0);

export function DesignView({ post, client, brand }: DesignViewProps) {
  const updatePostStore = useDb((s) => s.updatePost);
  const ui = useUi();
  const [currentId, setCurrentId] = useState(post.slides[0]?.id ?? '');
  const [selection, setSelection] = useState<Selection>(null);
  const [editingKey, setEditingKey] = useState<TextKey | null>(null);
  /** Camada sob o mouse no painel de camadas. */
  const [hovered, setHovered] = useState<Selection>(null);
  const [exporting, setExporting] = useState<ExportJob | null>(null);
  const [preview, setPreview] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const exportRoot = useRef<HTMLDivElement>(null);
  const history = usePostHistory(post);
  const recentColors = useMemo(() => collectHexColors([post.slides, post.pagination]), [post.slides, post.pagination]);

  const index = Math.max(0, post.slides.findIndex((s) => s.id === currentId));
  const slide = post.slides[index];

  const updatePost = (fn: (p: Post) => void) => updatePostStore(post.id, fn);
  const updateSlide = (fn: (s: Slide) => void) =>
    updatePost((p) => {
      const s = p.slides.find((x) => x.id === slide.id);
      if (s) fn(s);
    });
  const replaceSlide = (next: Slide) =>
    updatePost((p) => {
      const i = p.slides.findIndex((x) => x.id === next.id);
      if (i >= 0) p.slides[i] = next;
    });

  const goTo = (id: string) => {
    setCurrentId(id);
    setSelection(null);
    setEditingKey(null);
    setHovered(null);
  };

  const duplicate = (id: string) => {
    const src = post.slides.find((s) => s.id === id);
    if (!src) return;
    const copy: Slide = { ...structuredClone(src), id: uid() };
    updatePost((p) => void p.slides.splice(p.slides.findIndex((s) => s.id === id) + 1, 0, copy));
    goTo(copy.id);
  };

  /** Setas movem o item selecionado (em % do slide). */
  const nudge = (dx: number, dy: number) => {
    const t = getTemplate(slide.templateId);
    if (selection?.kind === 'box') {
      const box = resolveBox(t, slide, selection.key);
      if (box) updateSlide((s) => void (s.boxes[selection.key] = { ...s.boxes[selection.key], x: box.x + dx, y: box.y + dy }));
    } else if (selection?.kind === 'icon') {
      updateSlide((s) => {
        const el = s.elements.find((e) => e.id === selection.id);
        if (el) Object.assign(el, { x: clamp(el.x + dx, 0, 100), y: clamp(el.y + dy, 0, 100) });
      });
    } else if (selection?.kind === 'pagination') {
      updatePost((p) => Object.assign(p.pagination, { x: clamp(p.pagination.x + dx, 3, 97), y: clamp(p.pagination.y + dy, 2, 98) }));
    } else if (selection?.kind === 'image') {
      updateSlide((s) => {
        const im = s.images[selection.index];
        if (im) Object.assign(im, { x: clamp(im.x - dx * 4, 0, 100), y: clamp(im.y - dy * 4, 0, 100) });
      });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        history.redo();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate(slide.id);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection?.kind === 'icon') {
        updateSlide((s) => void (s.elements = s.elements.filter((el) => el.id !== selection.id)));
        setSelection(null);
      } else if (e.key === 'Escape') {
        setSelection(null);
      } else if (e.key.toLowerCase() === 'g' && !mod) {
        ui.toggle('showGrid');
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        if (selection) nudge(dx, dy);
        else if (dx) {
          const next = post.slides[index + Math.sign(dx)];
          if (next) goTo(next.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Editando texto: qualquer clique fora do texto (e fora da barra de formatação) encerra a edição,
  // mesmo quando o foco já tinha saído do texto e o blur não dispara.
  useEffect(() => {
    if (!editingKey) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.('[contenteditable="true"],[data-keep-editing]')) return;
      setEditingKey(null);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [editingKey]);

  useEffect(() => {
    if (!exportMenu) return;
    const close = (e: PointerEvent) => !exportRoot.current?.contains(e.target as Node) && setExportMenu(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [exportMenu]);

  if (!slide) return null;

  const startExport = (only?: number) => {
    setExportMenu(false);
    const empty = only === undefined ? emptySlots(post) : emptySlots({ ...post, slides: [slide] });
    if (empty && !confirm(`${empty} espaço(s) de imagem estão vazios e vão sair cinza. Exportar mesmo assim?`)) return;
    setExporting({ only, done: 0 });
  };

  const toggleBtn = (on: boolean) => cx(on && 'bg-brand-50! text-brand-700!');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-white px-4 py-2">
        <input
          value={post.title}
          onChange={(e) => updatePost((p) => void (p.title = e.target.value))}
          className="w-40 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium text-zinc-900 outline-none hover:bg-zinc-100 focus:bg-zinc-100"
          title="Nome do post"
        />
        <Segmented
          size="sm"
          value={post.format}
          onChange={(v) => updatePost((p) => void (p.format = v))}
          options={FORMAT_LIST.map((f) => ({ value: f, label: FORMATS[f].label, title: FORMATS[f].hint }))}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Paginação</span>
          <PaginationStylePicker
            value={post.pagination.style}
            onChange={(style) => {
              updatePost((p) => void (p.pagination.style = style));
              if (style !== 'none') setSelection({ kind: 'pagination' });
            }}
          />
        </div>
        <div className="flex items-center gap-0.5 border-l border-zinc-200 pl-2">
          <Button size="sm" variant="ghost" title="Desfazer (Ctrl+Z)" icon={<Undo2 size={16} />} disabled={!history.canUndo} onClick={history.undo} />
          <Button size="sm" variant="ghost" title="Refazer (Ctrl+Shift+Z)" icon={<Redo2 size={16} />} disabled={!history.canRedo} onClick={history.redo} />
        </div>
        <div className="flex items-center gap-0.5 border-l border-zinc-200 pl-2">
          <Button size="sm" variant="ghost" title="Grade (G)" className={toggleBtn(ui.showGrid)} icon={<Grid3x3 size={16} />} onClick={() => ui.toggle('showGrid')} />
          <Button size="sm" variant="ghost" title="Encaixar na grade" className={toggleBtn(ui.snapToGrid)} icon={<Magnet size={16} />} onClick={() => ui.toggle('snapToGrid')} />
          <Button size="sm" variant="ghost" title="Margens e área segura" className={toggleBtn(ui.showGuides)} icon={<Ruler size={16} />} onClick={() => ui.toggle('showGuides')} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ShortcutsHelp />
          <Button size="sm" icon={<Eye size={15} />} onClick={() => setPreview(true)}>
            Visualizar
          </Button>
          <div ref={exportRoot} className="relative">
            <Button
              variant="primary"
              size="sm"
              icon={exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              disabled={!!exporting}
              onClick={() => setExportMenu((o) => !o)}
            >
              {exporting ? (exporting.only !== undefined ? 'Exportando…' : `Exportando ${exporting.done}/${post.slides.length}`) : 'Exportar'}
              <ChevronDown size={14} />
            </Button>
            {exportMenu && (
              <div className="absolute right-0 z-40 mt-1 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
                <button type="button" onClick={() => startExport()} className="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100">
                  Todos os slides <span className="text-zinc-400">(.zip)</span>
                </button>
                <button type="button" onClick={() => startExport(index)} className="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100">
                  Só o slide {index + 1} <span className="text-zinc-400">(.png)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr_320px]">
        <SlideStrip
          post={post}
          brand={brand}
          currentId={slide.id}
          onSelect={goTo}
          onReorder={(slides) => updatePost((p) => void (p.slides = slides))}
          onDuplicate={duplicate}
          onDelete={(id) => {
            const i = post.slides.findIndex((s) => s.id === id);
            updatePost((p) => void (p.slides = p.slides.filter((s) => s.id !== id)));
            if (id === slide.id) goTo(post.slides[i + 1]?.id ?? post.slides[i - 1]?.id);
            toast('Slide apagado — Ctrl+Z desfaz', 'info');
          }}
          onAdd={() => {
            const blank: Slide = {
              id: uid(),
              role: 'content',
              templateId: 'text-classic',
              content: { title: '', body: '' },
              boxes: {},
              images: [],
              elements: [],
            };
            const next = post.style === 'social' ? applyTemplate(blank, getTemplate('social-text')) : blank;
            updatePost((p) => void p.slides.splice(index + 1, 0, next));
            goTo(next.id);
          }}
        />
        <Stage
          post={post}
          slide={slide}
          index={index}
          brand={brand}
          selection={selection}
          hovered={hovered}
          onSelect={setSelection}
          editingKey={editingKey}
          onEdit={(k) => {
            setEditingKey(k);
            if (k) setSelection({ kind: 'box', key: k });
          }}
          updateSlide={updateSlide}
          updatePost={updatePost}
        />
        <RecentColorsContext.Provider value={recentColors}>
        <Inspector
          post={post}
          client={client}
          brand={brand}
          slide={slide}
          index={index}
          selection={selection}
          onSelect={setSelection}
          onHover={setHovered}
          editingKey={editingKey}
          onEdit={setEditingKey}
          updateSlide={updateSlide}
          replaceSlide={(s) => {
            replaceSlide(s);
            setSelection(null);
            setEditingKey(null);
          }}
          updatePost={updatePost}
        />
        </RecentColorsContext.Provider>
      </div>

      {preview && <InstagramPreview post={post} brand={brand} start={index} onClose={() => setPreview(false)} />}

      {exporting && (
        <ExportStage
          post={post}
          brand={brand}
          only={exporting.only}
          fileName={`${client.name} ${post.title}`}
          onProgress={(done) => setExporting((j) => (j ? { ...j, done } : j))}
          onDone={(err) => {
            setExporting(null);
            if (err) toast(`Não foi possível exportar: ${err instanceof Error ? err.message : String(err)}`, 'error');
            else toast('Exportação concluída');
          }}
        />
      )}
    </div>
  );
}
