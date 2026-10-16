/** Local-time YYYY-MM-DD (toISOString would shift to UTC and change the day at night in Brazil). */
export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(s: string) {
  return parseDate(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
