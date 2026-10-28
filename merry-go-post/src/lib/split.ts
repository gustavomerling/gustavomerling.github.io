import type { SlideContent, SlideRole } from '../types';
import { balanceHtml, blocksToHtml, htmlToBlocks, type Block } from './richtext';

export interface SlideDraft {
  role: SlideRole;
  content: SlideContent;
  /** Pediu imagem no marcador ("SLIDE 2 imagem" ou uma linha "imagem" logo abaixo). */
  image?: boolean;
}

const MARKER = /^\s*(?:slide|página|pagina|card|tela|lâmina)\s*\d+\s*[:.)\-–—]?\s*/i;
const MARKER_ANYWHERE = /(?:slide|página|pagina|card|tela|lâmina)\s*\d+\s*[:.)\-–—]?\s*/i;
const RULE = /^\s*(?:-{3,}|_{3,}|\*{3,}|—{2,})\s*$/;
/** "imagem", "com imagem", "[imagem]", "(imagem):" logo depois do marcador. */
const IMAGE_TAG = /^\s*[[(]?\s*(?:com\s+)?imagem\s*[\])]?\s*[:.\-–—]?\s*/i;
const IMAGE_TAG_ANYWHERE = /[[(]?\s*(?:com\s+)?imagem\s*[\])]?\s*[:.\-–—]?\s*/i;
/** A linha inteira é só a marcação de imagem. */
const IMAGE_LINE = /^\s*[[(]?\s*(?:com\s+)?imagem\s*[\])]?\s*[:.]?\s*$/i;

/** Até quantos caracteres uma linha ainda é "título". */
const TITLE_MAX = 140;
/** Linhas curtas que viram título do slide seguinte no modo automático. */
const HEADING_MAX = 90;
/** Acima disso, o parágrafo é quebrado por frases em mais de um slide. */
const BODY_MAX = 380;

const isMarker = (b: Block) => MARKER.test(b.text) || RULE.test(b.text);

/** Tira o marcador da linha; devolve o que sobrou (se sobrou) e se pediu imagem. */
function stripMarker(b: Block): { rest: Block | null; image: boolean } {
  if (RULE.test(b.text)) return { rest: null, image: false };
  let text = b.text.replace(MARKER, '');
  let html = b.html.replace(MARKER_ANYWHERE, '');
  const image = IMAGE_TAG.test(text);
  if (image) {
    text = text.replace(IMAGE_TAG, '');
    html = html.replace(IMAGE_TAG_ANYWHERE, '');
  }
  text = text.trim();
  html = html.replace(/<(strong|em|mark)>\s*<\/\1>/g, '').trim();
  return { rest: text ? { ...b, text, html } : null, image };
}

const len = (blocks: Block[]) => blocks.reduce((n, b) => n + b.text.length, 0);

function roleFor(blocks: Block[]): SlideRole {
  if (blocks.some((b) => b.type === 'li')) return 'list';
  const first = blocks[0]?.text ?? '';
  if (/^["“«]/.test(first)) return 'quote';
  return 'content';
}

/** Um grupo de blocos vira título (primeira linha curta) + corpo. */
function draftFrom(blocks: Block[], forcedTitle?: Block): SlideDraft {
  let title = forcedTitle;
  let rest = blocks;
  if (!title && blocks.length > 1 && blocks[0].type === 'p' && blocks[0].text.length <= TITLE_MAX) {
    title = blocks[0];
    rest = blocks.slice(1);
  } else if (!title && blocks.length === 1 && blocks[0].type === 'p' && blocks[0].text.length <= TITLE_MAX) {
    title = blocks[0];
    rest = [];
  }
  return {
    role: roleFor(rest.length ? rest : blocks),
    content: { title: title?.html ?? '', body: blocksToHtml(rest) },
  };
}

/** Quebra um parágrafo longo em pedaços de frases, sem passar de BODY_MAX. */
function splitLong(b: Block): Block[] {
  if (b.text.length <= BODY_MAX) return [b];
  const parts = b.html.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú0-9"“<])/);
  const chunks: string[] = [];
  let cur = '';
  for (const p of parts) {
    const plain = (cur + ' ' + p).replace(/<[^>]+>/g, '');
    if (cur && plain.length > BODY_MAX) {
      chunks.push(cur);
      cur = p;
    } else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks.map((c) => {
    const html = balanceHtml(c);
    return { type: 'p', html, text: html.replace(/<[^>]+>/g, '') };
  });
}

function autoDrafts(blocks: Block[]): SlideDraft[] {
  // Agrupa itens de lista consecutivos numa unidade.
  const units: Block[][] = [];
  for (const b of blocks) {
    const last = units[units.length - 1];
    if (b.type === 'li' && last?.[0].type === 'li') last.push(b);
    else units.push([b]);
  }
  const drafts: SlideDraft[] = [];
  let heading: Block | undefined;
  units.forEach((unit, i) => {
    const isLast = i === units.length - 1;
    const first = unit[0];
    if (i === 0 && first.type === 'p') {
      drafts.push({ role: 'cover', content: { title: first.html, body: '' } });
      return;
    }
    if (first.type === 'li') {
      drafts.push({ role: 'list', content: { title: heading?.html ?? '', body: blocksToHtml(unit) } });
      heading = undefined;
      return;
    }
    const next = units[i + 1];
    if (!heading && !isLast && first.text.length <= HEADING_MAX && next && (next[0].type === 'li' || next[0].text.length > HEADING_MAX)) {
      heading = first;
      return;
    }
    const pieces = splitLong(first);
    pieces.forEach((piece, k) => {
      if (k === 0 && heading) drafts.push(draftFrom([piece], heading));
      else drafts.push(draftFrom([piece]));
    });
    heading = undefined;
  });
  if (heading) drafts.push(draftFrom([heading]));
  return drafts;
}

interface Segment {
  blocks: Block[];
  image: boolean;
  /** Ainda dá para ler "imagem" na linha logo depois do marcador. */
  justOpened: boolean;
}

function explicitDrafts(blocks: Block[]): SlideDraft[] {
  const open = (): Segment => ({ blocks: [], image: false, justOpened: true });
  const segments: Segment[] = [open()];
  const current = () => segments[segments.length - 1];
  let empties = 0;
  for (const b of blocks) {
    if (!b.text) {
      empties++;
      if (empties === 2) segments.push(open());
      continue;
    }
    empties = 0;
    if (isMarker(b)) {
      segments.push(open());
      const { rest, image } = stripMarker(b);
      current().image = image;
      if (rest) {
        current().blocks.push(rest);
        current().justOpened = false;
      }
      continue;
    }
    const seg = current();
    if (seg.justOpened && IMAGE_LINE.test(b.text)) {
      seg.image = true;
      seg.justOpened = false;
      continue;
    }
    seg.justOpened = false;
    seg.blocks.push(b);
  }
  return segments.filter((s) => s.blocks.length).map((s) => ({ ...draftFrom(s.blocks), image: s.image || undefined }));
}

/**
 * Texto em blocos separados por uma linha em branco, com pelo menos um bloco de várias linhas:
 * cada bloco é um slide (primeira linha curta vira título). Sem esse padrão, devolve null.
 */
function groupDrafts(blocks: Block[]): SlideDraft[] | null {
  const groups: Block[][] = [[]];
  for (const b of blocks) {
    if (!b.text) {
      if (groups[groups.length - 1].length) groups.push([]);
    } else groups[groups.length - 1].push(b);
  }
  const filled = groups.filter((g) => g.length);
  if (filled.length < 2 || !filled.some((g) => g.length > 1)) return null;
  return filled.map((g) => draftFrom(g));
}

/**
 * Divide o texto em slides.
 * - Com marcadores ("SLIDE 1", "---" ou duas linhas em branco), cada trecho é um slide.
 *   "SLIDE 2 imagem" (ou uma linha "imagem" logo abaixo do marcador) pede um template com imagem.
 * - Sem marcadores, blocos separados por linha em branco viram um slide cada; sem blocos,
 *   cada parágrafo vira um slide e linhas curtas viram título do seguinte.
 * A primeira página é a capa e a última (curta) é o fechamento.
 */
export function splitText(html: string): SlideDraft[] {
  const blocks = htmlToBlocks(html);
  const filled = blocks.filter((b) => b.text);
  if (!filled.length) return [];

  let doubleBlank = false;
  for (let i = 1; i < blocks.length; i++) if (!blocks[i].text && !blocks[i - 1].text) doubleBlank = true;
  const explicit = filled.some(isMarker) || doubleBlank;

  const drafts = explicit ? explicitDrafts(blocks) : groupDrafts(blocks) ?? autoDrafts(filled);
  if (drafts.length >= 2) drafts[0].role = 'cover';
  if (drafts.length >= 3) {
    const last = drafts[drafts.length - 1];
    const size = len(htmlToBlocks(last.content.title + last.content.body));
    if (size <= 220 && last.role !== 'list') last.role = 'closing';
  }
  return drafts;
}
