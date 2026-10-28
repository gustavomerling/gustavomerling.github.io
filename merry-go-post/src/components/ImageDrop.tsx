import { ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { saveImage } from '../lib/images';
import { cx } from './ui';

interface ImageDropProps {
  multiple?: boolean;
  onImages: (ids: string[]) => void;
  className?: string;
  children?: ReactNode;
  label?: string;
}

/** Área de upload (clique ou arrastar). Salva no IndexedDB e devolve os ids. */
export function ImageDrop({ multiple, onImages, className, children, label = 'Arraste imagens ou clique' }: ImageDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setBusy(true);
    try {
      const ids = await Promise.all((multiple ? list : list.slice(0, 1)).map((f) => saveImage(f)));
      onImages(ids);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={cx(
        'relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center text-sm transition',
        over ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50',
        className,
      )}
    >
      {children ?? (
        <>
          {busy ? <Loader2 className="animate-spin" size={22} /> : <ImagePlus size={22} />}
          <span>{busy ? 'Processando…' : label}</span>
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
