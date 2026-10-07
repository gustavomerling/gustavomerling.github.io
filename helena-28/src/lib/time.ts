/** Quando o presente abre: 21/10/2026, meia-noite em Brasília (Joinville, UTC-3) */
export const ABERTURA = '2026-10-21T00:00:00-03:00'

/** URL pública da LP (usada no QR code) */
export const SITE_URL = 'https://gustavomerling.github.io/helena-28/dist'

/** Tempo que falta até `target` (ms), quebrado em dias/horas/min/seg */
export function remaining(target: number, now: number) {
  const ms = Math.max(0, target - now)
  return {
    done: ms === 0,
    units: [
      { label: 'dias', value: Math.floor(ms / 86_400_000) },
      { label: 'horas', value: Math.floor(ms / 3_600_000) % 24 },
      { label: 'min', value: Math.floor(ms / 60_000) % 60 },
      { label: 'seg', value: Math.floor(ms / 1000) % 60 },
    ],
  }
}
