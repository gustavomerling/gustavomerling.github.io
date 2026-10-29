import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { applyTemplate } from '../lib/generate';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { ROLE_LABELS, TEMPLATES, templateStyle, type TemplateDef } from '../templates';
import { useMyTemplates } from '../store/db';
import type { Brand, Format, Pagination, Slide } from '../types';
import { Modal, Segmented, cx } from './ui';

type Group = 'all' | 'design' | 'social' | 'mine';

interface TemplatePickerProps {
  /** Slide de base: a prévia de cada template usa o texto e as imagens dele. */
  slide: Slide;
  index: number;
  total: number;
  format: Format;
  brand: Brand;
  pagination: Pagination;
  /** Imagens do post ainda sem slide, para preencher espaços novos. */
  spare?: string[];
  onPick: (t: TemplateDef) => void;
  onClose: () => void;
}

/** Janela com todos os templates desenhados com o conteúdo do slide. */
export function TemplatePickerModal({ slide, index, total, format, brand, pagination, spare = [], onPick, onClose }: TemplatePickerProps) {
  const mine = useMyTemplates();
  const [group, setGroup] = useState<Group>('all');
  const [sameRole, setSameRole] = useState(false);

  const sections = useMemo(() => {
    const byRole = (list: TemplateDef[]) => (sameRole ? list.filter((t) => t.roles.includes(slide.role)) : list);
    const all: { key: Group; title: string; list: TemplateDef[] }[] = [
      { key: 'mine', title: 'Meus templates', list: byRole(mine) },
      { key: 'design', title: 'Design', list: byRole(TEMPLATES.filter((t) => templateStyle(t) === 'design')) },
      { key: 'social', title: 'Formato de post', list: byRole(TEMPLATES.filter((t) => templateStyle(t) === 'social')) },
    ];
    return all.filter((s) => (group === 'all' || s.key === group) && s.list.length);
  }, [group, sameRole, mine, slide.role]);

  return (
    <Modal
      size="xl"
      title="Trocar template"
      subtitle={`Slide ${index + 1} · o texto e as imagens continuam; ajustes de posição voltam ao padrão.`}
      onClose={onClose}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented<Group>
          size="sm"
          value={group}
          onChange={setGroup}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'design', label: 'Design' },
            { value: 'social', label: 'Formato de post' },
            ...(mine.length ? [{ value: 'mine' as const, label: 'Meus templates' }] : []),
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={sameRole} onChange={(e) => setSameRole(e.target.checked)} className="accent-brand-600" />
          Só os feitos para {ROLE_LABELS[slide.role].toLowerCase()}
        </label>
      </div>
      {sections.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhum template nesse filtro.</p>}
      {sections.map((sec) => (
        <div key={sec.key} className="mb-6 last:mb-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{sec.title}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
            {sec.list.map((tpl) => {
              const current = tpl.id === slide.templateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onPick(tpl);
                    onClose();
                  }}
                  className="group text-left"
                >
                  <div className={cx('relative overflow-hidden rounded-lg ring-2 transition', current ? 'ring-brand-500' : 'ring-transparent group-hover:ring-zinc-300')}>
                    <ScaledSlide format={format}>
                      <SlideView slide={applyTemplate(slide, tpl, spare)} index={index} total={total} format={format} brand={brand} pagination={pagination} />
                    </ScaledSlide>
                    {current && (
                      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-brand-fg shadow">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 truncate text-xs text-zinc-600">{tpl.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Modal>
  );
}
