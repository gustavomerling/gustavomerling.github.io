import type { ClipboardEvent } from 'react';
import { plainToHtml, sanitizeRich } from './richtext';

/** Colagem em áreas editáveis: mantém negrito/itálico/listas e descarta o resto da formatação. */
export function handleRichPaste(e: ClipboardEvent) {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  const clean = sanitizeRich(html || plainToHtml(text));
  document.execCommand('insertHTML', false, clean);
}

/** Envolve a seleção em <mark> (ultradestaque), ou remove se já estiver marcada. */
export function toggleMark() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const anchor = range.commonAncestorContainer;
  const el = (anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement) as HTMLElement | null;
  const mark = el?.closest('mark');
  if (mark) {
    mark.replaceWith(...Array.from(mark.childNodes));
    return;
  }
  const holder = document.createElement('div');
  holder.appendChild(range.cloneContents());
  holder.querySelectorAll('mark').forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
  document.execCommand('insertHTML', false, `<mark>${holder.innerHTML}</mark>`);
}
