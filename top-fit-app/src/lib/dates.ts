export const dayKey = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Domingo da semana de `d`, à meia-noite. */
export function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/** Semanas seguidas (até a atual ou a anterior) com pelo menos um checkin. */
export function weekStreak(dates: string[], now = new Date()) {
  const weeks = new Set(dates.map((d) => weekStart(new Date(d)).getTime()));
  const w = weekStart(now);
  if (!weeks.has(w.getTime())) w.setDate(w.getDate() - 7); // semana atual ainda pode acontecer
  let n = 0;
  while (weeks.has(w.getTime())) {
    n++;
    w.setDate(w.getDate() - 7);
  }
  return n;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

export function relativeDay(iso: string, now = new Date()) {
  const a = new Date(dayKey(iso) + 'T00:00');
  const b = new Date(dayKey(now) + 'T00:00');
  const diff = Math.round((b.getTime() - a.getTime()) / 864e5);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return `há ${diff} dias`;
}
