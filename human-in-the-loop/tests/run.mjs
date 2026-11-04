#!/usr/bin/env node
// Uso: node tests/run.mjs [filtro] [--json]
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(here, '.build')
mkdirSync(outDir, { recursive: true })

// Stub de DOM: só o que as texturas de canvas do boneco pedem.
const ctx2d = new Proxy(function () {}, { get: () => ctx2d, apply: () => ctx2d, set: () => true })
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {} }) }

const win = process.platform === 'win32'
const rolldown = join(root, 'node_modules', '.bin', win ? 'rolldown.cmd' : 'rolldown')
execFileSync(rolldown, [join(here, 'harness.ts'), '--file', join(outDir, 'harness.mjs'), '--format', 'esm', '--platform', 'node'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: win,
})

const args = process.argv.slice(2)
const json = args.includes('--json')
const filter = args.find((a) => !a.startsWith('--'))
const { runAll } = await import(pathToFileURL(join(outDir, 'harness.mjs')).href)

const t0 = Date.now()
const res = await runAll(filter)
const f = (x, d = 2) => (Number.isNaN(x) ? '-' : x === Infinity ? 'NUNCA' : x.toFixed(d))
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length
const rows = res.map(({ sc, ms }) => {
  const n = ms.length
  const falls = ms.filter((m) => m.fell).length
  const gu = ms.filter((m) => m.fell).map((m) => m.getUp)
  const ok = gu.filter((x) => x !== Infinity)
  const ex = {}
  for (const m of ms) for (const [k, v] of Object.entries(m.extra ?? {})) (ex[k] ??= []).push(v)
  return {
    cenario: `${sc.group}: ${sc.name}`,
    n,
    quedas: `${falls}/${n}`,
    taxaQueda: falls / n,
    levantaOk: gu.length ? `${ok.length}/${gu.length}` : '-',
    levantaMedio: ok.length ? mean(ok) : NaN,
    levantaMax: ok.length ? Math.max(...ok) : NaN,
    drift: mean(ms.map((m) => m.drift)),
    driftMax: Math.max(...ms.map((m) => m.drift)),
    jointW: Math.max(...ms.map((m) => m.maxJointW)),
    bodyV: Math.max(...ms.map((m) => m.maxBodyV)),
    ke: Math.max(...ms.map((m) => m.maxKE)),
    extra: Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, mean(v)])),
  }
})
if (json) console.log(JSON.stringify(rows, null, 1))
else {
  const cols = [
    ['cenario', (r) => r.cenario, 34],
    ['quedas', (r) => r.quedas, 7],
    ['taxa', (r) => f(r.taxaQueda * 100, 0) + '%', 5],
    ['levanta', (r) => r.levantaOk, 8],
    ['t.lev med(s)', (r) => f(r.levantaMedio, 1), 12],
    ['t.lev max(s)', (r) => f(r.levantaMax, 1), 12],
    ['drift med(m)', (r) => f(r.drift), 12],
    ['drift max(m)', (r) => f(r.driftMax), 12],
    ['juntaW max(rad/s)', (r) => f(r.jointW, 1), 17],
    ['v max(m/s)', (r) => f(r.bodyV, 1), 10],
    ['KE max(J)', (r) => f(r.ke, 0), 9],
    ['extra', (r) => Object.entries(r.extra).map(([k, v]) => `${k}=${f(v, 2)}`).join(' '), 10],
  ]
  console.log(cols.map((c) => c[0].padEnd(c[2])).join(' | '))
  console.log(cols.map((c) => '-'.repeat(c[2])).join('-+-'))
  for (const r of rows) console.log(cols.map((c) => String(c[1](r)).padEnd(c[2])).join(' | '))
  console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s)`)
}
process.exit(0)
