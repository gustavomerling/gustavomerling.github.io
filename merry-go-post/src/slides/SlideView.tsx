import { Icon } from '@iconify/react';
import { ImageIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { resolveColor, textRoleOn } from '../lib/color';
import { ensureFont, fontStack, useFontsVersion } from '../lib/fonts';
import { SLIDE_WIDTH, slideHeight } from '../lib/formats';
import { handleRichPaste } from '../lib/paste';
import { sanitizeRich } from '../lib/richtext';
import { useImageUrl } from '../lib/useImageUrl';
import { getTemplate, type DecorationDef, type ImageSlotDef, type LogoDef, type TemplateDef, type TextBoxDef } from '../templates';
import type { Brand, ColorRef, Format, IconElement, Pagination, Palette, Slide, SlideImage, TextKey } from '../types';
import { autoTextColor, colorOf, isHidden, resolveBox, slideBg, slideTone, withAlpha, type Tone } from './layout';
import './slides.css';

export interface SlideEditorHooks {
  editingKey: TextKey | null;
  onCommitText: (key: TextKey, html: string) => void;
  onStopEditing: () => void;
}

interface SlideViewProps {
  slide: Slide;
  index: number;
  total: number;
  format: Format;
  brand: Brand;
  pagination: Pagination;
  editor?: SlideEditorHooks;
  /** Desenha com este template em vez do salvo (prévia do editor de templates). */
  template?: TemplateDef;
}

const pct = (n: number) => `${n}%`;

export function SlideView({ slide, index, total, format, brand, pagination, editor, template }: SlideViewProps) {
  const t = template ?? getTemplate(slide.templateId);
  const palette = brand.colors;
  const tone = slideTone(t, palette, slide);
  const height = slideHeight(format);
  const hidden = (layer: string) => isHidden(slide, layer);

  const rootStyle = {
    width: SLIDE_WIDTH,
    height,
    background: resolveColor(slideBg(t, slide), palette),
    fontFamily: fontStack(brand.fonts.base),
    '--wp-font-base': fontStack(brand.fonts.base),
    '--wp-font-highlight': fontStack(brand.fonts.highlight),
    '--wp-font-ultra': fontStack(brand.fonts.ultra),
  } as CSSProperties;

  return (
    <div className="wp-slide" style={rootStyle} data-slide-root>
      {t.images.map((def, i) => (hidden(`img:${i}`) ? null : <ImageSlot key={i} def={def} image={slide.images[i]} palette={palette} />))}
      {!hidden('decor') && t.decorations?.map((d, i) => <Decoration key={i} def={d} index={index} brand={brand} tone={tone} />)}
      {t.logo && !hidden('logo') && <Logo def={t.logo} tone={slide.bg ? tone : t.logo.tone ?? tone} logos={brand.logos} />}
      {(['title', 'body'] as const).map((key) => {
        const def = resolveBox(t, slide, key);
        if (!def || hidden(key)) return null;
        return (
          <TextBox
            key={key}
            def={def}
            html={slide.content[key]}
            tone={tone}
            brand={brand}
            editing={editor?.editingKey === key}
            showEmpty={!!editor}
            onCommit={(html) => editor?.onCommitText(key, html)}
            onStop={() => editor?.onStopEditing()}
          />
        );
      })}
      {slide.elements.map((el) => (hidden(`icon:${el.id}`) ? null : <IconView key={el.id} el={el} palette={palette} height={height} />))}
      {!hidden('pagination') && (
        <PaginationView
          p={{ ...pagination, color: slide.paginationColor ?? pagination.color }}
          index={index}
          total={total}
          tone={tone}
          palette={palette}
          fontFamily={brand.fonts.base}
        />
      )}
    </div>
  );
}

// ——— Imagens ———

export const filterCss = (f: SlideImage['filter']) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg) blur(${f.blur}px)`;

function ImageSlot({ def, image, palette }: { def: ImageSlotDef; image?: SlideImage; palette: Palette }) {
  const url = useImageUrl(image?.imageId);
  const box: CSSProperties = {
    position: 'absolute',
    left: pct(def.x),
    top: pct(def.y),
    width: pct(def.w),
    height: pct(def.h),
    borderRadius: def.radius ?? 0,
    overflow: 'hidden',
    background: url && image?.cutout ? 'transparent' : '#d4d4d8',
  };
  const ov = def.overlay;
  const ovColor = ov ? resolveColor(ov.color, palette) : '';
  return (
    <div style={box}>
      {url && image ? (
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: image.cutout ? 'contain' : 'cover',
            objectPosition: `${image.x}% ${image.y}%`,
            transform: `scale(${image.zoom})${image.flipX ? ' scaleX(-1)' : ''}`,
            transformOrigin: `${image.x}% ${image.y}%`,
            filter: filterCss(image.filter),
            display: 'block',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#a1a1aa' }}>
          <ImageIcon size={120} strokeWidth={1.25} />
        </div>
      )}
      {image && image.filter.overlayOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: withAlpha(resolveColor(image.filter.overlayColor, palette), image.filter.overlayOpacity / 100),
          }}
        />
      )}
      {ov && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              ov.kind === 'gradient'
                ? `linear-gradient(to top, ${withAlpha(ovColor, ov.opacity)} 0%, ${withAlpha(ovColor, ov.opacity * 0.6)} 35%, ${withAlpha(ovColor, 0)} 70%)`
                : withAlpha(ovColor, ov.opacity),
          }}
        />
      )}
    </div>
  );
}

// ——— Texto ———

interface TextBoxProps {
  def: TextBoxDef;
  html: string;
  tone: Tone;
  brand: Brand;
  editing: boolean;
  showEmpty: boolean;
  onCommit: (html: string) => void;
  onStop: () => void;
}

function TextBox({ def, html, tone, brand, editing, showEmpty, onCommit, onStop }: TextBoxProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const fontsVersion = useFontsVersion();
  const [size, setSize] = useState(def.size);
  const [overflow, setOverflow] = useState(false);
  const palette = brand.colors;
  const empty = !html.replace(/<[^>]+>/g, '').trim();

  useEffect(() => {
    if (def.family) ensureFont(def.family);
  }, [def.family]);

  // Reduz a fonte até o texto caber na caixa (sem mexer enquanto o usuário digita).
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || editing) return;
    let s = def.size;
    i.style.fontSize = `${s}px`;
    const min = def.size * 0.4;
    const over = () => i.scrollHeight > o.clientHeight + 1 || i.scrollWidth > o.clientWidth + 1;
    while (s > min && over()) {
      s *= 0.95;
      i.style.fontSize = `${s}px`;
    }
    setSize(s);
    setOverflow(over());
  }, [html, def.size, def.w, def.h, def.font, def.family, def.weight, def.lineHeight, def.letterSpacing, def.uppercase, fontsVersion, editing, brand.fonts.base, brand.fonts.highlight, brand.fonts.ultra]);

  // Ao entrar em edição: conteúdo atual + cursor no fim.
  useEffect(() => {
    const i = inner.current;
    if (!editing || !i) return;
    i.innerHTML = html;
    i.focus();
    const range = document.createRange();
    range.selectNodeContents(i);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  if (empty && !showEmpty && !editing) return null;

  const color = colorOf(def.color, tone, palette);
  const em = def.emphasis ? resolveColor(def.emphasis, palette) : color;
  const markBg = resolveColor(def.emphasis === 'accent' || !def.emphasis ? 'accent' : def.emphasis, palette);

  const outerStyle: CSSProperties = {
    position: 'absolute',
    left: pct(def.x),
    top: pct(def.y),
    width: pct(def.w),
    height: pct(def.h),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: def.valign === 'bottom' ? 'flex-end' : def.valign === 'center' ? 'center' : 'flex-start',
    textAlign: def.align ?? 'left',
    color,
    fontFamily: def.family ? fontStack(def.family) : `var(--wp-font-${def.font})`,
    fontWeight: def.weight ?? 400,
    fontStyle: def.italic ? 'italic' : undefined,
    lineHeight: def.lineHeight ?? 1.25,
    letterSpacing: def.letterSpacing ? `${def.letterSpacing}em` : undefined,
    textTransform: def.uppercase ? 'uppercase' : undefined,
  };
  // Só no editor: avisa quando nem a fonte mínima cabe na caixa.
  const warn = showEmpty && overflow && !editing;
  if (warn) Object.assign(outerStyle, { outline: '4px dashed #ef4444', outlineOffset: 6 });
  const innerStyle = {
    fontSize: editing ? def.size : size,
    '--wp-em': em,
    '--wp-mark-bg': markBg,
    '--wp-mark-fg': palette[textRoleOn(markBg, palette)],
  } as CSSProperties;

  if (editing) {
    return (
      <div ref={outer} style={outerStyle}>
        <div
          ref={inner}
          className="wp-text"
          style={innerStyle}
          contentEditable
          suppressContentEditableWarning
          onPaste={handleRichPaste}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLElement).blur();
          }}
          onInput={(e) => onCommit(sanitizeRich(e.currentTarget.innerHTML))}
          onBlur={(e) => {
            onCommit(sanitizeRich(e.currentTarget.innerHTML));
            onStop();
          }}
        />
      </div>
    );
  }

  return (
    <div ref={outer} style={outerStyle}>
      {warn && (
        <span style={{ position: 'absolute', top: -46, right: 0, background: '#ef4444', color: '#fff', font: '600 22px system-ui', padding: '4px 10px', borderRadius: 6, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0 }}>
          Texto não cabe
        </span>
      )}
      {empty ? (
        <div ref={inner} className="wp-text wp-placeholder" style={innerStyle}>
          {def.key === 'title' ? 'Título' : 'Texto'}
        </div>
      ) : (
        <div ref={inner} className="wp-text" style={innerStyle} dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

// ——— Decorações ———

function Decoration({ def, index, brand, tone }: { def: DecorationDef; index: number; brand: Brand; tone: Tone }) {
  const palette = brand.colors;
  switch (def.kind) {
    case 'rect':
      return (
        <div
          style={{
            position: 'absolute',
            left: pct(def.x),
            top: pct(def.y),
            width: pct(def.w),
            height: pct(def.h),
            background: resolveColor(def.color, palette),
            borderRadius: def.radius ?? 0,
            opacity: def.opacity ?? 1,
          }}
        />
      );
    case 'glyph':
    case 'index':
      return (
        <div
          style={{
            position: 'absolute',
            left: pct(def.x),
            top: pct(def.y),
            fontSize: def.size,
            lineHeight: 1,
            fontFamily: `var(--wp-font-${def.font})`,
            fontWeight: 800,
            color: resolveColor(def.color, palette),
          }}
        >
          {def.kind === 'glyph' ? def.text : String(index + 1).padStart(2, '0')}
        </div>
      );
    case 'profile':
      return <ProfileHeader def={def} brand={brand} tone={tone} />;
    case 'stats':
      return <ProfileStats def={def} brand={brand} tone={tone} />;
  }
}

function Avatar({ brand, size }: { brand: Brand; size: number }) {
  const url = useImageUrl(brand.profile.avatar);
  const name = brand.profile.displayName || brand.profile.handle || '?';
  return url ? (
    <img src={url} alt="" draggable={false} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: brand.colors.primary,
        color: brand.colors.light,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.42,
        fontWeight: 800,
      }}
    >
      {name.replace('@', '').charAt(0).toUpperCase()}
    </div>
  );
}

const handleOf = (h: string) => (h ? (h.startsWith('@') ? h : `@${h}`) : '@perfil');

/** Cor do texto do perfil; sem "muted", usa a mesma cor mais transparente. */
function profileColors(def: { color: ColorRef | 'auto'; muted?: ColorRef }, tone: Tone, brand: Brand) {
  const color = colorOf(def.color, tone, brand.colors);
  const muted = def.muted ? resolveColor(def.muted, brand.colors) : withAlpha(color, 0.65);
  return { color, muted };
}

function ProfileHeader({ def, brand, tone }: { def: Extract<DecorationDef, { kind: 'profile' }>; brand: Brand; tone: Tone }) {
  const p = brand.profile;
  const { color, muted } = profileColors(def, tone, brand);
  const stacked = def.layout === 'stacked';
  const nameSize = stacked ? def.size * 0.2 : def.size * 0.36;
  const name = (
    <div style={{ display: 'flex', alignItems: 'center', gap: nameSize * 0.25, justifyContent: stacked ? 'center' : 'flex-start' }}>
      <span style={{ fontWeight: 700, fontSize: nameSize, color, whiteSpace: 'nowrap' }}>{p.displayName || 'Nome do perfil'}</span>
      {p.verified && <Icon icon="ph:seal-check-fill" width={nameSize * 1.05} height={nameSize * 1.05} color="#1d9bf0" />}
    </div>
  );
  const handle = <div style={{ fontSize: nameSize * 0.85, color: muted }}>{handleOf(p.handle)}</div>;
  return (
    <div
      style={{
        position: 'absolute',
        left: pct(def.x),
        top: pct(def.y),
        width: pct(def.w),
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? def.size * 0.1 : def.size * 0.22,
        fontFamily: 'var(--wp-font-base)',
        lineHeight: 1.2,
        textAlign: stacked ? 'center' : 'left',
      }}
    >
      <Avatar brand={brand} size={def.size} />
      <div>
        {name}
        {handle}
      </div>
    </div>
  );
}

function ProfileStats({ def, brand, tone }: { def: Extract<DecorationDef, { kind: 'stats' }>; brand: Brand; tone: Tone }) {
  const p = brand.profile;
  const { color, muted } = profileColors(def, tone, brand);
  const items: [string, string][] = [
    [p.posts || '0', 'posts'],
    [p.followers || '0', 'seguidores'],
    [p.following || '0', 'seguindo'],
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: pct(def.x),
        top: pct(def.y),
        width: pct(def.w),
        display: 'flex',
        justifyContent: 'space-around',
        fontFamily: 'var(--wp-font-base)',
        textAlign: 'center',
        lineHeight: 1.15,
      }}
    >
      {items.map(([v, label]) => (
        <div key={label}>
          <div style={{ fontWeight: 800, fontSize: def.size * 1.15, color }}>{v}</div>
          <div style={{ fontSize: def.size * 0.8, color: muted }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ——— Logo, ícones, paginação ———

function Logo({ def, tone, logos }: { def: LogoDef; tone: Tone; logos: Brand['logos'] }) {
  // Logo negativo (claro) sobre fundo escuro; positivo sobre fundo claro.
  const id = tone === 'dark' ? logos.negative ?? logos.positive : logos.positive ?? logos.negative;
  const url = useImageUrl(id);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        left: pct(def.x),
        top: pct(def.y),
        width: pct(def.w),
        height: pct(def.h),
        objectFit: 'contain',
        objectPosition: def.align === 'right' ? 'right center' : def.align === 'center' ? 'center' : 'left center',
      }}
    />
  );
}

export function iconBox(el: IconElement, height: number) {
  const w = el.size;
  const h = (el.size * SLIDE_WIDTH) / height;
  return { x: el.x - w / 2, y: el.y - h / 2, w, h };
}

function IconView({ el, palette, height }: { el: IconElement; palette: Palette; height: number }) {
  const b = iconBox(el, height);
  const px = (el.size / 100) * SLIDE_WIDTH;
  return (
    <div
      style={{
        position: 'absolute',
        left: pct(b.x),
        top: pct(b.y),
        width: pct(b.w),
        height: pct(b.h),
        transform: `rotate(${el.rotate}deg)`,
        color: resolveColor(el.color, palette),
      }}
    >
      <Icon icon={el.icon} width={px} height={px} />
    </div>
  );
}

/** Caixa aproximada da paginação (em %), para o editor poder arrastá-la. */
export const PAGINATION_BOX = { w: 26, h: 4.5 };

function PaginationView({
  p,
  index,
  total,
  tone,
  palette,
  fontFamily,
}: {
  p: Pagination;
  index: number;
  total: number;
  tone: Tone;
  palette: Palette;
  fontFamily: string;
}) {
  if (p.style === 'none' || total < 2) return null;
  const color = p.color === 'auto' ? autoTextColor(tone, palette) : resolveColor(p.color, palette);
  const wrap: CSSProperties = {
    position: 'absolute',
    left: pct(p.x),
    top: pct(p.y),
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };
  if (p.style === 'dots') {
    return (
      <div style={wrap}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            style={{
              width: i === index ? 40 : 14,
              height: 14,
              borderRadius: 99,
              background: color,
              opacity: i === index ? 1 : 0.35,
            }}
          />
        ))}
      </div>
    );
  }
  if (p.style === 'number') {
    return (
      <div style={{ ...wrap, fontFamily: fontStack(fontFamily), fontWeight: 700, fontSize: 30, color, letterSpacing: 1 }}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    );
  }
  return (
    <div style={{ ...wrap, width: 260, height: 10, borderRadius: 99, background: withAlpha(color, 0.25), overflow: 'hidden', display: 'block' }}>
      <div style={{ width: `${((index + 1) / total) * 100}%`, height: '100%', background: color, borderRadius: 99 }} />
    </div>
  );
}
