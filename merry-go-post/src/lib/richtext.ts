/**
 * Texto rico restrito: parágrafos, listas, <strong> (destaque), <em> e <mark> (ultradestaque).
 * Tudo que é colado ou digitado passa por aqui antes de ser guardado ou renderizado.
 */

export interface Block {
  type: 'p' | 'li';
  ordered?: boolean;
  html: string;
  text: string;
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'PRE',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'svg', 'IMG', 'TEMPLATE']);

interface Fmt {
  bold: boolean;
  italic: boolean;
  mark: boolean;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Atalhos em markdown: **destaque** e ==ultradestaque==. */
const applyMarkdown = (escaped: string) =>
  escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/==(.+?)==/g, '<mark>$1</mark>');

function fmtOf(el: HTMLElement, parent: Fmt): Fmt {
  const tag = el.tagName;
  const style = el.style;
  let { bold, italic, mark } = parent;
  const weight = style?.fontWeight;
  if (tag === 'B' || tag === 'STRONG' || /^H[1-6]$/.test(tag)) bold = true;
  if (weight) {
    // O Google Docs embrulha tudo num <b style="font-weight:normal">.
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) bold = true;
    else if (weight === 'normal' || Number(weight) < 600) bold = tag === 'STRONG' ? bold : false;
  }
  if (tag === 'I' || tag === 'EM') italic = true;
  if (style?.fontStyle === 'italic') italic = true;
  else if (style?.fontStyle === 'normal') italic = false;
  if (tag === 'MARK') mark = true;
  return { bold, italic, mark };
}

function wrap(text: string, f: Fmt) {
  let out = applyMarkdown(escapeHtml(text));
  if (f.italic) out = `<em>${out}</em>`;
  if (f.bold) out = `<strong>${out}</strong>`;
  if (f.mark) out = `<mark>${out}</mark>`;
  return out;
}

const tidyInline = (html: string) =>
  html
    .replace(/<\/strong><strong>/g, '')
    .replace(/<\/em><em>/g, '')
    .replace(/<\/mark><mark>/g, '')
    .replace(/<(strong|em|mark)>(\s*)<\/\1>/g, '$2');

const textOf = (html: string) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent ?? '').replace(/ /g, ' ');
};

/** Lê HTML qualquer (colado do Docs, Word, sites) e devolve blocos limpos. */
export function htmlToBlocks(input: string): Block[] {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  const blocks: Block[] = [];
  let buf = '';
  let current: { type: 'p' | 'li'; ordered?: boolean } = { type: 'p' };

  const flush = () => {
    const html = tidyInline(buf.replace(/ /g, ' ').replace(/[ \t\r\n]+/g, ' ').trim());
    blocks.push({ ...current, html, text: textOf(html).trim() });
    buf = '';
  };

  const walk = (node: Node, f: Fmt, listOrdered: boolean | null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent ?? '';
      if (t) buf += wrap(t, f);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.tagName === 'BR') {
      flush();
      return;
    }
    const isBlock = BLOCK_TAGS.has(el.tagName);
    const nf = fmtOf(el, f);
    let ordered = listOrdered;
    if (el.tagName === 'UL') ordered = false;
    if (el.tagName === 'OL') ordered = true;
    if (isBlock && buf.trim()) flush();
    else if (isBlock) buf = '';
    const prev = current;
    const startLen = blocks.length;
    if (el.tagName === 'LI') current = { type: 'li', ordered: ordered ?? false };
    el.childNodes.forEach((c) => walk(c, nf, ordered));
    // Fecha o bloco; um bloco sem nada dentro conta como uma linha vazia.
    if (isBlock && el.tagName !== 'UL' && el.tagName !== 'OL' && (buf.trim() || blocks.length === startLen)) flush();
    current = prev;
  };

  // Texto puro (sem tags de bloco): cada linha vira um parágrafo.
  const body = doc.body;
  body.childNodes.forEach((c) => walk(c, { bold: false, italic: false, mark: false }, null));
  if (buf.trim()) flush();

  // Remove vazios do começo e do fim e colapsa sequências longas de linhas vazias em duas.
  const out: Block[] = [];
  let empties = 0;
  for (const b of blocks) {
    if (!b.text) {
      empties++;
      if (empties <= 2 && out.length) out.push(b);
    } else {
      empties = 0;
      out.push(b);
    }
  }
  while (out.length && !out[out.length - 1].text) out.pop();
  return out.map(bulletToItem);
}

const BULLET = /^\s*(?:[-•*–]|\d+[.)])\s+/;

/** "- item", "• item" ou "1. item" num parágrafo comum viram item de lista. */
function bulletToItem(b: Block): Block {
  if (b.type !== 'p' || !BULLET.test(b.text)) return b;
  const ordered = /^\s*\d/.test(b.text);
  return { type: 'li', ordered, text: b.text.replace(BULLET, ''), html: b.html.replace(/^((?:<[^>]+>)*)\s*(?:[-•*–]|\d+[.)])\s+/, '$1') };
}

export function blocksToHtml(blocks: Block[]): string {
  let html = '';
  let list: 'ul' | 'ol' | null = null;
  for (const b of blocks) {
    const want = b.type === 'li' ? (b.ordered ? 'ol' : 'ul') : null;
    if (list && want !== list) {
      html += `</${list}>`;
      list = null;
    }
    if (want && !list) {
      html += `<${want}>`;
      list = want;
    }
    html += b.type === 'li' ? `<li>${b.html}</li>` : `<p>${b.html || '<br>'}</p>`;
  }
  if (list) html += `</${list}>`;
  return html;
}

export const sanitizeRich = (html: string) => blocksToHtml(htmlToBlocks(html));

/** Texto puro colado: converte quebras em parágrafos antes de sanitizar. */
export const plainToHtml = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join('');

export const richToText = (html: string) =>
  htmlToBlocks(html)
    .map((b) => b.text)
    .filter(Boolean)
    .join(' ');

/** Fecha tags quebradas depois de cortar HTML no meio (ex.: divisão por frases). */
export function balanceHtml(html: string) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.innerHTML;
}
