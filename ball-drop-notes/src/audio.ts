import { NOTE_MIN_MIDI, NOTE_SUSTAIN_PER_PX } from './music'

// Áudio do jogo, todo sintetizado (sem samples).
// Cadeia: voz → filtro de brilho → panorâmica → barramento de instrumentos
//   → (seco + reverb + delay estéreo) → compressor → limitador → volume geral → saída.
// O analisador fica depois do volume geral, para as visualizações.

// Instrumentos disponíveis, escolhidos para a simulação inteira. value é um id livre.
export const TIMBRES: { value: string; label: string }[] = [
  { value: 'caixinha', label: 'Caixinha de música' },
  { value: 'marimba', label: 'Marimba' },
  { value: 'piano', label: 'Piano elétrico' },
  { value: 'sino', label: 'Sino' },
  { value: 'harpa', label: 'Harpa' },
  { value: 'kalimba', label: 'Kalimba' },
  { value: 'chiptune', label: 'Chiptune' },
  { value: 'pad', label: 'Pad suave' },
]
export const DEFAULT_TIMBRE = 'caixinha'

// Ids antigos (tipos de oscilador) continuam funcionando, apontando para um instrumento parecido.
const LEGACY_TIMBRES: Record<string, string> = {
  triangle: 'caixinha',
  sine: 'marimba',
  square: 'chiptune',
  sawtooth: 'pad',
}

const NOTE_SUSTAIN_MIN = 0.15 // segundos
const NOTE_SUSTAIN_MAX = 8 // segundos (notas seguradas podem soar por baixo de várias outras)
const NOTE_VOLUME = 0.3 // volume máximo de uma voz, para impactos fortes
export const IMPACT_MAX_SPEED = 1500 // px/s; impactos mais fortes que isso tocam no volume máximo
const MAX_VOICES = 24 // vozes simultâneas; acima disso a mais antiga some rapidinho
const PAN_DEPTH = 0.7 // panorâmica sutil: pan 1 vira 0,7

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Afinação A4 = 440 Hz (MIDI 69); índice 0 = dó3 (MIDI 48).
function noteFrequency(note: number) {
  return 440 * 2 ** ((NOTE_MIN_MIDI + note - 69) / 12)
}

// ---------------------------------------------------------------------------
// Contexto e cadeia principal

interface Graph {
  ctx: AudioContext
  bus: GainNode // instrumentos (com reverb e delay)
  dry: GainNode // cliques e sons de interface (quase secos)
  master: GainNode
  analyser: AnalyserNode
  noise: AudioBuffer // ruído branco reaproveitado (baquetas, cliques)
}

// O navegador só libera o áudio depois de um clique, então o contexto é criado sob demanda.
let audioContext: AudioContext | null = null
let graph: Graph | null = null
let masterVolume = 0.85

// Volume do controle (0..1) vira ganho com curva quadrática, que soa mais natural.
const volumeToGain = (v: number) => v * v

export function ensureAudio() {
  if (!audioContext) {
    audioContext = new AudioContext({ latencyHint: 'interactive' })
    graph = buildGraph(audioContext)
  }
  if (audioContext.state === 'suspended') void audioContext.resume()
}

// Só toca com o contexto rodando; antes disso tudo é silêncio.
function live(): Graph | null {
  if (!audioContext || audioContext.state !== 'running' || !graph) return null
  return graph
}

function buildGraph(ctx: AudioContext): Graph {
  const bus = ctx.createGain()
  const dry = ctx.createGain()

  // Compressor suave cola a mistura; o limitador segura picos de muitas notas juntas.
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.005
  comp.release.value = 0.2
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -2
  limiter.knee.value = 0
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.08

  const master = ctx.createGain()
  master.gain.value = volumeToGain(masterVolume)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.8

  comp.connect(limiter).connect(master)
  master.connect(ctx.destination)
  master.connect(analyser)

  // Sinal seco.
  bus.connect(comp)
  dry.connect(comp)

  // Reverb: sala pequena e macia, com resposta ao impulso gerada uma vez.
  const reverb = ctx.createConvolver()
  reverb.buffer = makeImpulseResponse(ctx, 2.2)
  const reverbReturn = ctx.createGain()
  reverbReturn.gain.value = 0.9
  reverb.connect(reverbReturn).connect(comp)
  const reverbSend = ctx.createGain()
  reverbSend.gain.value = 0.28
  bus.connect(reverbSend).connect(reverb)
  const dryReverbSend = ctx.createGain()
  dryReverbSend.gain.value = 0.06
  dry.connect(dryReverbSend).connect(reverb)

  // Delay estéreo pingue-pongue, bem discreto e escurecido a cada repetição.
  const delaySend = ctx.createGain()
  delaySend.gain.value = 0.1
  const delayL = ctx.createDelay(1)
  const delayR = ctx.createDelay(1)
  delayL.delayTime.value = 0.19
  delayR.delayTime.value = 0.19
  const toneL = ctx.createBiquadFilter()
  const toneR = ctx.createBiquadFilter()
  toneL.type = toneR.type = 'lowpass'
  toneL.frequency.value = toneR.frequency.value = 2600
  const feedL = ctx.createGain()
  const feedR = ctx.createGain()
  feedL.gain.value = feedR.gain.value = 0.32
  const panL = ctx.createStereoPanner()
  const panR = ctx.createStereoPanner()
  panL.pan.value = -0.75
  panR.pan.value = 0.75
  bus.connect(delaySend).connect(delayL)
  delayL.connect(toneL)
  toneL.connect(panL).connect(comp)
  toneL.connect(feedL).connect(delayR)
  delayR.connect(toneR)
  toneR.connect(panR).connect(comp)
  toneR.connect(feedR).connect(delayL)

  // Ruído branco de 1 s, reaproveitado por todas as vozes.
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  return { ctx, bus, dry, master, analyser, noise }
}

// Resposta ao impulso estéreo: ruído com decaimento exponencial, cauda cada vez mais escura.
function makeImpulseResponse(ctx: AudioContext, seconds: number) {
  const sr = ctx.sampleRate
  const length = Math.floor(sr * seconds)
  const preDelay = Math.floor(sr * 0.012)
  const ir = ctx.createBuffer(2, length, sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch)
    let lp = 0
    for (let i = preDelay; i < length; i++) {
      const t = (i - preDelay) / sr
      const fadeIn = Math.min(1, t / 0.006)
      const fadeOut = 1 - (i / length) ** 4 // termina em zero, sem corte seco
      const decay = Math.exp(-3.2 * t) // RT60 em torno de 2 s
      const damping = 0.08 + 0.82 * Math.exp(-2.2 * t) // filtro passa-baixa que fecha com o tempo
      lp += damping * (Math.random() * 2 - 1 - lp)
      data[i] = lp * decay * fadeIn * fadeOut
    }
  }
  return ir
}

// ---------------------------------------------------------------------------
// Vozes: cada nota é uma voz com seus nós; o limite rouba a mais antiga com um fade curto.

interface Voice {
  out: GainNode
  nodes: AudioNode[]
  sources: AudioScheduledSourceNode[]
  end: number
  done: boolean
}

const voices: Voice[] = []

function cleanupVoice(v: Voice) {
  if (v.done) return
  v.done = true
  const i = voices.indexOf(v)
  if (i >= 0) voices.splice(i, 1)
  for (const n of v.nodes) n.disconnect()
}

function stealVoice(v: Voice, now: number) {
  const g = v.out.gain
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.setTargetAtTime(0, now, 0.008)
  for (const s of v.sources) {
    try {
      s.stop(now + 0.05)
    } catch {
      // fonte já parada
    }
  }
  v.end = now + 0.05
  const i = voices.indexOf(v)
  if (i >= 0) voices.splice(i, 1)
}

function createVoice(gr: Graph, dest: AudioNode, pan: number): Voice {
  const now = gr.ctx.currentTime
  // Vozes que já terminaram saem da conta (o onended limpa, mas pode atrasar um pouco).
  for (const v of [...voices]) if (v.end <= now) cleanupVoice(v)
  while (voices.length >= MAX_VOICES) stealVoice(voices[0], now)

  const out = gr.ctx.createGain()
  const v: Voice = { out, nodes: [out], sources: [], end: 0, done: false }
  const p = clamp(Number.isFinite(pan) ? pan : 0, -1, 1) * PAN_DEPTH
  if (p !== 0) {
    const panner = gr.ctx.createStereoPanner()
    panner.pan.value = p
    out.connect(panner).connect(dest)
    v.nodes.push(panner)
  } else {
    out.connect(dest)
  }
  return v
}

// Agenda todas as fontes da voz e registra a limpeza quando acabarem.
function commitVoice(v: Voice, t0: number, end: number) {
  if (v.sources.length === 0) {
    cleanupVoice(v)
    return
  }
  v.end = end
  for (const s of v.sources) {
    s.start(t0)
    s.stop(end)
  }
  v.sources[0].onended = () => cleanupVoice(v)
  voices.push(v)
}

function gainNode(v: Voice, ctx: AudioContext, value = 0) {
  const g = ctx.createGain()
  g.gain.value = value
  v.nodes.push(g)
  return g
}

function oscillator(v: Voice, ctx: AudioContext, type: OscillatorType, freq: number, cents = 0) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  o.detune.value = cents
  v.nodes.push(o)
  v.sources.push(o)
  return o
}

function filter(v: Voice, ctx: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  v.nodes.push(f)
  return f
}

function noiseSource(v: Voice, gr: Graph) {
  const n = gr.ctx.createBufferSource()
  n.buffer = gr.noise
  n.loop = true
  v.nodes.push(n)
  v.sources.push(n)
  return n
}

// Envelope percussivo: ataque linear curto, decaimento exponencial (tau) e soltura suave em releaseAt.
function percEnv(g: AudioParam, t0: number, peak: number, attack: number, tau: number, releaseAt: number, releaseTau: number) {
  g.setValueAtTime(0, t0)
  g.linearRampToValueAtTime(peak, t0 + attack)
  g.setTargetAtTime(0, t0 + attack, tau)
  if (releaseAt > t0 + attack) g.setTargetAtTime(0, releaseAt, releaseTau)
}

// ADSR clássico: ataque, decaimento até sustain e soltura em releaseAt.
function adsr(g: AudioParam, t0: number, peak: number, attack: number, decayTau: number, sustain: number, releaseAt: number, releaseTau: number) {
  g.setValueAtTime(0, t0)
  g.linearRampToValueAtTime(peak, t0 + attack)
  g.setTargetAtTime(peak * sustain, t0 + attack, decayTau)
  g.setTargetAtTime(0, Math.max(releaseAt, t0 + attack), releaseTau)
}

// ---------------------------------------------------------------------------
// Instrumentos

interface NoteParams {
  f: number // frequência em Hz
  s: number // força do impacto, 0..1
  amp: number // pico já com velocidade e volume
  d: number // sustain em segundos (pela largura do bloco)
  t0: number // início
  cents: number // pequena desafinação humana
}

interface Instrument {
  gain: number // equaliza o volume entre instrumentos
  // Monta a voz ligando tudo em input e devolve o instante em que ela termina.
  play: (gr: Graph, v: Voice, input: AudioNode, p: NoteParams) => number
}

// Parcial senoidal com envelope percussivo (base de caixinha, marimba, kalimba, sino).
function partial(gr: Graph, v: Voice, input: AudioNode, p: NoteParams, ratio: number, amp: number, tau: number, releaseTau = 0.08) {
  const o = oscillator(v, gr.ctx, 'sine', p.f * ratio, p.cents)
  const g = gainNode(v, gr.ctx)
  percEnv(g.gain, p.t0, amp, 0.002, tau, p.t0 + p.d, releaseTau)
  o.connect(g).connect(input)
  return o
}

// Estalo de ruído filtrado (baqueta, unha no dente da kalimba).
function noiseHit(gr: Graph, v: Voice, input: AudioNode, t0: number, type: BiquadFilterType, freq: number, q: number, amp: number, tau: number) {
  const n = noiseSource(v, gr)
  const f = filter(v, gr.ctx, type, Math.min(freq, 16000), q)
  const g = gainNode(v, gr.ctx)
  percEnv(g.gain, t0, amp, 0.001, tau, t0 + tau * 8, 0.01)
  n.connect(f).connect(g).connect(input)
}

// Caixinha de música / celesta: fundamental limpa, harmônicos curtos e um "tim" agudo no ataque.
const caixinha: Instrument = {
  gain: 1,
  play(gr, v, input, p) {
    const { amp, d, s } = p
    partial(gr, v, input, p, 1, amp, 0.25 + d * 0.35)
    partial(gr, v, input, p, 2, amp * 0.22 * (0.4 + 0.6 * s), 0.12 + d * 0.15)
    partial(gr, v, input, p, 3, amp * 0.08 * s, 0.08 + d * 0.08)
    if (p.f * 6.8 < 15000) partial(gr, v, input, p, 6.8, amp * 0.1 * s, 0.025)
    return p.t0 + d + 0.6
  },
}

// Marimba: fundamental redonda, parcial afinado em 4x (como a lâmina real) e batida da baqueta.
const marimba: Instrument = {
  gain: 1.15,
  play(gr, v, input, p) {
    const { amp, d, s } = p
    partial(gr, v, input, p, 1, amp, 0.12 + d * 0.12)
    partial(gr, v, input, p, 4, amp * 0.22 * s, 0.04 + d * 0.03)
    if (p.f * 10 < 15000) partial(gr, v, input, p, 10, amp * 0.05 * s, 0.012)
    noiseHit(gr, v, input, p.t0, 'bandpass', p.f * 2.5, 1.5, amp * 0.25 * s, 0.006)
    return p.t0 + d + 0.6
  },
}

// Piano elétrico em FM: par 1:1 com índice que cai (corpo) e um par 1:14 bem curto (o "tine").
const piano: Instrument = {
  gain: 0.9,
  play(gr, v, input, p) {
    const { ctx } = gr
    const { f, amp, d, s, t0 } = p
    const carrier = oscillator(v, ctx, 'sine', f, p.cents)
    const mod = oscillator(v, ctx, 'sine', f, p.cents)
    const index = gainNode(v, ctx)
    index.gain.setValueAtTime(f * (0.5 + 2 * s), t0)
    index.gain.setTargetAtTime(f * 0.25, t0, 0.25 + d * 0.1)
    mod.connect(index).connect(carrier.frequency)
    const env = gainNode(v, ctx)
    adsr(env.gain, t0, amp, 0.003, 0.5 + d * 0.4, 0.45, t0 + d, 0.12)
    carrier.connect(env).connect(input)

    const tine = oscillator(v, ctx, 'sine', f, p.cents + 4)
    const tineMod = oscillator(v, ctx, 'sine', f * 14, p.cents)
    const tineIndex = gainNode(v, ctx)
    tineIndex.gain.setValueAtTime(f * 1.5 * s, t0)
    tineIndex.gain.setTargetAtTime(0, t0, 0.02)
    tineMod.connect(tineIndex).connect(tine.frequency)
    const tineEnv = gainNode(v, ctx)
    percEnv(tineEnv.gain, t0, amp * 0.3 * s, 0.002, 0.06, t0 + d, 0.05)
    tine.connect(tineEnv).connect(input)
    return t0 + d + 0.9
  },
}

// Sino em FM: razão inarmônica 1:1,4, índice que vai abrindo para um som puro, e parciais de sino.
const sino: Instrument = {
  gain: 0.85,
  play(gr, v, input, p) {
    const { ctx } = gr
    const { f, amp, d, s, t0 } = p
    const carrier = oscillator(v, ctx, 'sine', f, p.cents)
    const mod = oscillator(v, ctx, 'sine', f * 1.4, p.cents)
    const index = gainNode(v, ctx)
    index.gain.setValueAtTime(f * (0.8 + 1.8 * s), t0)
    index.gain.setTargetAtTime(f * 0.1, t0, 0.3 + d * 0.3)
    mod.connect(index).connect(carrier.frequency)
    const env = gainNode(v, ctx)
    percEnv(env.gain, t0, amp * 0.85, 0.002, 0.4 + d * 0.45, t0 + d, 0.3)
    carrier.connect(env).connect(input)
    partial(gr, v, input, p, 2.76, amp * 0.14, 0.2 + d * 0.15, 0.2)
    if (f * 5.4 < 15000) partial(gr, v, input, p, 5.4, amp * 0.07 * s, 0.06)
    return t0 + d + 2.2
  },
}

// Harpa: Karplus-Strong calculado num buffer (um laço com DelayNode não alcança notas agudas,
// porque o atraso mínimo de um ciclo no Web Audio é de 128 amostras).
function pluckBuffer(ctx: AudioContext, f: number, s: number, seconds: number) {
  const sr = ctx.sampleRate
  const n = Math.max(1, Math.ceil(seconds * sr))
  const buf = ctx.createBuffer(1, n, sr)
  const y = buf.getChannelData(0)
  const period = sr / f - 0.5 // o filtro de média soma meia amostra ao laço
  const loss = 0.001 ** (1 / (seconds * f)) // chega a -60 dB no fim do buffer
  // Excitação: um período de ruído, mais escuro quando o impacto é fraco.
  const exLen = Math.min(n, Math.ceil(period) + 2)
  const alpha = 0.2 + 0.75 * s
  let lp = 0
  let mean = 0
  for (let i = 0; i < exLen; i++) {
    lp += alpha * (Math.random() * 2 - 1 - lp)
    y[i] = lp
    mean += lp
  }
  mean /= exLen
  let peak = 1e-6
  for (let i = 0; i < exLen; i++) {
    y[i] -= mean
    peak = Math.max(peak, Math.abs(y[i]))
  }
  for (let i = 0; i < exLen; i++) y[i] /= peak
  // Laço: média de duas amostras atrasadas (com atraso fracionário por interpolação linear).
  for (let i = exLen; i < n; i++) {
    const pos = i - period
    const i0 = Math.floor(pos)
    const frac = pos - i0
    const a0 = y[i0] + (y[i0 + 1] - y[i0]) * frac
    const a1 = y[i0 - 1] + (y[i0] - y[i0 - 1]) * frac
    y[i] = loss * 0.5 * (a0 + a1)
  }
  return buf
}

const harpa: Instrument = {
  gain: 1.4,
  play(gr, v, input, p) {
    const { ctx } = gr
    const { f, amp, d, s, t0 } = p
    const ring = Math.min(4.6, 0.8 + d * 0.9)
    const src = ctx.createBufferSource()
    src.buffer = pluckBuffer(ctx, f, s, ring)
    src.detune.value = p.cents
    v.nodes.push(src)
    v.sources.push(src)
    const env = gainNode(v, ctx)
    env.gain.setValueAtTime(amp, t0)
    env.gain.setTargetAtTime(0, t0 + d, 0.12)
    src.connect(env).connect(input)
    return t0 + Math.min(ring, d + 0.85)
  },
}

// Kalimba: fundamental com leve queda de afinação no ataque, sobretom inarmônico e o estalo do dente.
const kalimba: Instrument = {
  gain: 1.05,
  play(gr, v, input, p) {
    const { f, amp, d, s, t0 } = p
    const fund = partial(gr, v, input, p, 1, amp, 0.18 + d * 0.3)
    fund.frequency.setValueAtTime(f * 1.012, t0)
    fund.frequency.setTargetAtTime(f, t0, 0.012)
    if (f * 5.6 < 15000) partial(gr, v, input, p, 5.6, amp * 0.18 * s, 0.03)
    partial(gr, v, input, p, 3, amp * 0.05, 0.05)
    noiseHit(gr, v, input, t0, 'lowpass', 1400, 0.7, amp * 0.18 * s, 0.005)
    return t0 + d + 0.6
  },
}

// Chiptune: onda quadrada com um "blip" de oitava no ataque e vibrato que entra devagar.
const chiptune: Instrument = {
  gain: 0.45,
  play(gr, v, input, p) {
    const { ctx } = gr
    const { f, amp, d, t0 } = p
    const o = oscillator(v, ctx, 'square', f * 2, p.cents)
    o.frequency.setValueAtTime(f * 2, t0)
    o.frequency.setValueAtTime(f, t0 + 0.035)
    const lfo = oscillator(v, ctx, 'sine', 5.5)
    const depth = gainNode(v, ctx)
    depth.gain.setValueAtTime(0, t0)
    depth.gain.setValueAtTime(0, t0 + 0.2)
    depth.gain.linearRampToValueAtTime(f * 0.007, t0 + 0.5)
    lfo.connect(depth).connect(o.frequency)
    const env = gainNode(v, ctx)
    adsr(env.gain, t0, amp, 0.003, 0.08, 0.6, t0 + d, 0.03)
    o.connect(env).connect(input)
    return t0 + d + 0.3
  },
}

// Pad suave: três serras desafinadas e um sub, num filtro que abre devagar.
const pad: Instrument = {
  gain: 0.55,
  play(gr, v, input, p) {
    const { ctx } = gr
    const { f, amp, d, s, t0 } = p
    const hold = Math.max(d, 0.25)
    const lp = filter(v, ctx, 'lowpass', f * 1.2, 0.8)
    lp.frequency.setValueAtTime(f * 1.2, t0)
    lp.frequency.setTargetAtTime(Math.min(f * (2.5 + 5 * s), 12000), t0, 0.15)
    lp.frequency.setTargetAtTime(f * 1.2, t0 + hold, 0.3)
    const env = gainNode(v, ctx)
    adsr(env.gain, t0, amp, 0.06, 0.3, 0.75, t0 + hold, 0.35)
    lp.connect(env).connect(input)
    for (const c of [-9, 0, 9]) {
      const o = oscillator(v, ctx, 'sawtooth', f, p.cents + c)
      const g = gainNode(v, ctx, 0.33)
      o.connect(g).connect(lp)
    }
    const sub = oscillator(v, ctx, 'sine', f * 0.5, p.cents)
    const subGain = gainNode(v, ctx, 0.25)
    sub.connect(subGain).connect(lp)
    return t0 + hold + 2.5
  },
}

const INSTRUMENTS: Record<string, Instrument> = { caixinha, marimba, piano, sino, harpa, kalimba, chiptune, pad }

function resolveInstrument(timbre: string): Instrument {
  return INSTRUMENTS[LEGACY_TIMBRES[timbre] ?? timbre] ?? INSTRUMENTS[DEFAULT_TIMBRE]
}

// Monta e agenda uma nota. s é a força (0..1), d o sustain em segundos, level um ajuste extra de volume.
function startNote(gr: Graph, inst: Instrument, note: number, s: number, d: number, pan: number, t0: number, level = 1): Voice {
  // Humanização sutil: força ±4% e desafinação de até ±2,5 cents.
  const sh = clamp(s * (1 + (Math.random() - 0.5) * 0.08), 0.03, 1)
  const cents = (Math.random() - 0.5) * 5
  const f = noteFrequency(note)
  const vel = 0.15 + 0.85 * sh ** 0.85
  const tilt = 1 - clamp(note / 36, 0, 1) * 0.3 // agudas um pouco mais baixas, que soam mais fortes
  const amp = NOTE_VOLUME * vel * tilt * level * inst.gain
  const v = createVoice(gr, gr.bus, pan)
  // Brilho pela força do impacto: batida fraca soa abafada, forte soa brilhante.
  const bright = filter(v, gr.ctx, 'lowpass', clamp(f * (2 + 14 * sh ** 1.3), 500, 16000), 0.5)
  bright.connect(v.out)
  const end = inst.play(gr, v, bright, { f, s: sh, amp, d, t0, cents })
  commitVoice(v, t0, end)
  return v
}

// Solta uma voz antes da hora, com um fade curto (como tirar o dedo da tecla).
function releaseVoice(v: Voice, now: number, tau = 0.08) {
  if (v.done || v.end <= now) return
  const g = v.out.gain
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.setTargetAtTime(0, now, tau)
  const end = now + tau * 6
  for (const src of v.sources) {
    try {
      src.stop(end)
    } catch {
      // fonte já parada
    }
  }
  v.end = end
}

// ---------------------------------------------------------------------------
// API pública

// Toca a nota (índice de nota) com a força do impacto (px/s), o sustain pela largura do bloco (px)
// e a panorâmica opcional (-1 esquerda .. 1 direita, aplicada de forma sutil).
export function playNote(note: number, impact: number, width: number, timbre: string, pan = 0) {
  const gr = live()
  if (!gr || !Number.isFinite(note)) return
  const d = clamp((Number.isFinite(width) ? width : 0) * NOTE_SUSTAIN_PER_PX, NOTE_SUSTAIN_MIN, NOTE_SUSTAIN_MAX)
  // Impacto fraco toca baixo, forte toca alto, com um piso para ainda ouvir.
  const s = clamp((Number.isFinite(impact) ? impact : 0) / IMPACT_MAX_SPEED, 0.05, 1)
  startNote(gr, resolveInstrument(timbre), note, s, d, pan, gr.ctx.currentTime)
}

// Nota segurada (piano): soa enquanto a tecla estiver pressionada, até o sustain máximo.
// Devolve a função que solta a nota.
export function holdNote(note: number, timbre: string, pan = 0): () => void {
  const gr = live()
  if (!gr || !Number.isFinite(note)) return () => {}
  const v = startNote(gr, resolveInstrument(timbre), note, 0.75, NOTE_SUSTAIN_MAX, pan, gr.ctx.currentTime)
  return () => releaseVoice(v, gr.ctx.currentTime)
}

// Nota curta para pré-escuta (seletor de nota, teclado de piano, sugestões).
export function previewNote(note: number, timbre: string) {
  playNote(note, 900, 40, timbre)
}

// Clique do metrônomo: bloco de madeira (tom com queda rápida + ruído filtrado). accent marca o primeiro tempo.
export function playClick(accent = false) {
  const gr = live()
  if (!gr) return
  const { ctx } = gr
  const t0 = ctx.currentTime
  const f = accent ? 1650 : 1250
  const peak = accent ? 0.2 : 0.12
  const v = createVoice(gr, gr.dry, 0)
  const o = oscillator(v, ctx, 'sine', f)
  o.frequency.setValueAtTime(f * 1.5, t0)
  o.frequency.exponentialRampToValueAtTime(f, t0 + 0.006)
  const g = gainNode(v, ctx)
  percEnv(g.gain, t0, peak, 0.0008, 0.016, t0 + 0.08, 0.01)
  o.connect(g).connect(v.out)
  const o2 = oscillator(v, ctx, 'sine', f * 2.68)
  const g2 = gainNode(v, ctx)
  percEnv(g2.gain, t0, peak * 0.3, 0.0008, 0.007, t0 + 0.05, 0.005)
  o2.connect(g2).connect(v.out)
  noiseHit(gr, v, v.out, t0, 'bandpass', f * 1.8, 3, peak * 0.5, 0.004)
  commitVoice(v, t0, t0 + 0.15)
}

// Recompensa: arpejo rápido e brilhante uma oitava acima, baixinho. root é índice de nota.
export function playReward(root: number, timbre: string) {
  const gr = live()
  if (!gr) return
  const inst = resolveInstrument(timbre) === chiptune ? chiptune : caixinha
  let base = root + 12
  while (base + 12 > 40) base -= 12
  const t0 = gr.ctx.currentTime
  const steps = [0, 4, 7, 12]
  steps.forEach((step, i) => {
    startNote(gr, inst, base + step, 0.45, 0.45, (i - 1.5) * 0.25, t0 + i * 0.06, 0.45)
  })
}

// Chegada: pequena cadência feliz (arpejo de I, acorde de V, acorde de I) no instrumento atual.
export function playFinish(timbre: string) {
  const gr = live()
  if (!gr) return
  const inst = resolveInstrument(timbre)
  const t0 = gr.ctx.currentTime
  const events: [number, number[], number, number][] = [
    // [atraso, notas, sustain, força]
    [0, [12], 0.3, 0.55],
    [0.09, [16], 0.3, 0.55],
    [0.18, [19], 0.3, 0.55],
    [0.34, [7, 11, 14], 0.3, 0.5],
    [0.6, [12, 16, 19, 24], 1.4, 0.65],
  ]
  for (const [delay, notes, d, s] of events) {
    notes.forEach((n, i) => {
      const pan = notes.length > 1 ? (i / (notes.length - 1) - 0.5) * 0.6 : 0
      startNote(gr, inst, n, s, d, pan, t0 + delay, 0.5)
    })
  }
}

// Sons da interface (botões, alternâncias, sucesso, erro): bipes curtinhos e bem baixos.
export type UiSound = 'click' | 'toggle' | 'success' | 'error' | 'create' | 'delete'

function blip(gr: Graph, t0: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number) {
  const { ctx } = gr
  const v = createVoice(gr, gr.dry, 0)
  const o = oscillator(v, ctx, type, f0)
  if (f1 !== f0) {
    o.frequency.setValueAtTime(f0, t0)
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.6)
  }
  const lp = filter(v, ctx, 'lowpass', 5000)
  const g = gainNode(v, ctx)
  percEnv(g.gain, t0, peak, 0.003, dur * 0.35, t0 + dur, 0.015)
  o.connect(lp).connect(g).connect(v.out)
  commitVoice(v, t0, t0 + dur + 0.12)
}

export function playUi(kind: UiSound) {
  const gr = live()
  if (!gr) return
  const t0 = gr.ctx.currentTime
  switch (kind) {
    case 'click':
      blip(gr, t0, 'sine', 1320, 1320, 0.03, 0.03)
      break
    case 'toggle':
      blip(gr, t0, 'sine', 880, 880, 0.035, 0.028)
      blip(gr, t0 + 0.045, 'sine', 1175, 1175, 0.035, 0.028)
      break
    case 'success':
      blip(gr, t0, 'sine', 1046.5, 1046.5, 0.08, 0.032)
      blip(gr, t0 + 0.07, 'sine', 1568, 1568, 0.12, 0.032)
      break
    case 'error':
      blip(gr, t0, 'triangle', 330, 311, 0.09, 0.045)
      blip(gr, t0 + 0.1, 'triangle', 262, 247, 0.12, 0.045)
      break
    case 'create':
      blip(gr, t0, 'sine', 620, 990, 0.06, 0.035)
      break
    case 'delete':
      blip(gr, t0, 'sine', 760, 380, 0.07, 0.032)
      break
  }
}

// Volume geral, de 0 a 1 (curva quadrática). Vale também antes do áudio ser liberado.
export function setMasterVolume(volume: number) {
  masterVolume = clamp(Number.isFinite(volume) ? volume : 0, 0, 1)
  if (graph) graph.master.gain.setTargetAtTime(volumeToGain(masterVolume), graph.ctx.currentTime, 0.02)
}

// Analisador do som final, para visualizações. null antes do áudio ser liberado.
export function getAnalyser(): AnalyserNode | null {
  return graph ? graph.analyser : null
}
