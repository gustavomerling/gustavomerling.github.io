import { Bold, Highlighter, Italic, List, SeparatorHorizontal } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';
import { handleRichPaste, toggleMark } from '../lib/paste';
import { sanitizeRich } from '../lib/richtext';
import { Button } from './ui';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Texto rico simples: colar do Docs/Word mantém negrito, itálico e listas. */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  // Só reescreve o DOM quando o valor muda de fora (evita pular o cursor).
  useEffect(() => {
    const el = ref.current;
    if (el && value !== lastEmitted.current) {
      el.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = el.textContent?.trim() ?? '';
    const html = text ? sanitizeRich(el.innerHTML) : '';
    if (!text && el.innerHTML) el.innerHTML = '';
    lastEmitted.current = html;
    onChange(html);
  };

  const exec = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    ref.current?.focus();
    fn();
    emit();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-100 px-2 py-1.5">
        <Button size="sm" variant="ghost" title="Destaque (negrito)" icon={<Bold size={16} />} onMouseDown={exec(() => document.execCommand('bold'))} />
        <Button size="sm" variant="ghost" title="Itálico" icon={<Italic size={16} />} onMouseDown={exec(() => document.execCommand('italic'))} />
        <Button size="sm" variant="ghost" title="Ultradestaque" icon={<Highlighter size={16} />} onMouseDown={exec(toggleMark)} />
        <Button size="sm" variant="ghost" title="Lista" icon={<List size={16} />} onMouseDown={exec(() => document.execCommand('insertUnorderedList'))} />
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        <Button
          size="sm"
          variant="ghost"
          icon={<SeparatorHorizontal size={16} />}
          onMouseDown={exec(() => document.execCommand('insertHTML', false, '<p>---</p><p><br></p>'))}
        >
          Quebra de slide
        </Button>
      </div>
      <div
        ref={ref}
        className="rich-editor max-h-[52vh] min-h-64 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed outline-none"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          handleRichPaste(e);
          emit();
        }}
      />
    </div>
  );
}
