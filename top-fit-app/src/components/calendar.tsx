import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { dayKey, MONTHS, WEEKDAYS_SHORT } from '@/lib/dates';

/**
 * Calendário do mês. `filled` = dias com treino (círculo cheio); `dotted` = dias com
 * outros registros (pontinho). Com `onSelect`, os dias viram botões.
 */
export function MonthCalendar({
  filled,
  dotted,
  selected,
  onSelect,
}: {
  filled: Set<string>;
  dotted?: Set<string>;
  selected?: string;
  onSelect?: (day: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => {
    const base = selected ? new Date(selected + 'T00:00') : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const todayKey = dayKey(today);
  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <span className="font-semibold">
            {MONTHS[m]} {y}
          </span>
          <Button variant="ghost" size="icon" disabled={isCurrentMonth} onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Próximo mês">
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="pb-1 text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(new Date(y, m, d));
            const has = filled.has(k);
            const dot = dotted?.has(k);
            const future = k > todayKey;
            const isSel = selected === k;
            const Comp = onSelect ? 'button' : 'div';
            return (
              <div key={i} className="flex justify-center">
                <Comp
                  {...(onSelect ? { type: 'button' as const, disabled: future, onClick: () => onSelect(k) } : {})}
                  className={cn(
                    'relative flex size-9 items-center justify-center rounded-full text-sm',
                    has && 'bg-primary font-bold text-primary-foreground',
                    !has && k === todayKey && 'ring-1 ring-primary',
                    !has && future && 'text-muted-foreground/50',
                    isSel && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                  )}
                >
                  {d}
                  {dot && (
                    <span className={cn('absolute bottom-1 size-1 rounded-full', has ? 'bg-primary-foreground' : 'bg-primary')} />
                  )}
                </Comp>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
