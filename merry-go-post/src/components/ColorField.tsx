import { useEffect, useState } from 'react';
import { isHex } from '../lib/color';

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2">
      <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-200" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0">
        <div className="text-xs font-medium text-zinc-500">{label}</div>
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value.trim();
            setText(v);
            const hex = v.startsWith('#') ? v : `#${v}`;
            if (isHex(hex)) onChange(hex.toLowerCase());
          }}
          className="w-24 bg-transparent font-mono text-sm uppercase outline-none"
        />
      </div>
    </div>
  );
}
