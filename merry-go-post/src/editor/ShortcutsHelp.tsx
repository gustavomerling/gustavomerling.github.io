import { Keyboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui';

const SHORTCUTS: [string, string][] = [
  ['Ctrl + Z', 'Desfazer'],
  ['Ctrl + Shift + Z / Ctrl + Y', 'Refazer'],
  ['Ctrl + D', 'Duplicar slide'],
  ['← →', 'Slide anterior / próximo (sem seleção)'],
  ['Setas', 'Mover o item selecionado'],
  ['Shift + setas', 'Mover 5× mais'],
  ['Alt ao arrastar', 'Sem encaixe (snap)'],
  ['Delete', 'Apagar ícone selecionado'],
  ['Duplo clique', 'Editar texto'],
  ['Rolagem na imagem', 'Zoom'],
  ['G', 'Mostrar grade'],
  ['Esc', 'Tirar seleção'],
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div ref={root} className="relative">
      <Button size="sm" variant="ghost" title="Atalhos de teclado" icon={<Keyboard size={16} />} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Atalhos</div>
          <dl className="space-y-1.5 text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="text-zinc-600">{v}</dt>
                <dd>
                  <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
