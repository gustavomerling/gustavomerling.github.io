/**
 * Áudio do carro (Web Audio, sem arquivos): motor sintetizado pelo rpm e pelo acelerador,
 * e chiado de pneu quando as rodas escorregam. O navegador só toca depois de um gesto
 * do usuário, então o contexto é retomado no primeiro clique ou tecla.
 */

export type AudioState = {
  rpm: number
  throttle: number
  /** Intensidade do escorregamento dos pneus, 0 a 1. */
  squeal: number
}

export type CarAudio = {
  update: (s: AudioState) => void
  /** Liga ou desliga o som. Retorna se ficou mudo. */
  toggleMute: () => boolean
  dispose: () => void
}

export function createCarAudio(): CarAudio {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let engineOsc: OscillatorNode | null = null
  let engineFilter: BiquadFilterNode | null = null
  let engineGain: GainNode | null = null
  let squealSrc: AudioBufferSourceNode | null = null
  let squealFilter: BiquadFilterNode | null = null
  let squealGain: GainNode | null = null
  let muted = false

  const build = () => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.6
    master.connect(ctx.destination)

    // Motor: onda dente de serra filtrada; a frequência segue o rpm (2 pulsos por volta)
    engineOsc = ctx.createOscillator()
    engineOsc.type = 'sawtooth'
    engineOsc.frequency.value = 40
    engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 500
    engineGain = ctx.createGain()
    engineGain.gain.value = 0.05
    engineOsc.connect(engineFilter).connect(engineGain).connect(master)
    engineOsc.start()

    // Pneus: ruído branco num filtro passa-faixa, sem som quando não escorrega
    const len = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    squealSrc = ctx.createBufferSource()
    squealSrc.buffer = buf
    squealSrc.loop = true
    squealFilter = ctx.createBiquadFilter()
    squealFilter.type = 'bandpass'
    squealFilter.frequency.value = 1800
    squealFilter.Q.value = 4
    squealGain = ctx.createGain()
    squealGain.gain.value = 0
    squealSrc.connect(squealFilter).connect(squealGain).connect(master)
    squealSrc.start()
  }

  // Retoma o áudio no primeiro gesto (política de autoplay do navegador)
  const unlock = () => {
    if (!ctx) build()
    if (ctx?.state === 'suspended') void ctx.resume()
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  return {
    update: (s) => {
      if (!ctx || !engineOsc || !engineFilter || !engineGain || !squealGain) return
      const t = ctx.currentTime
      // Frequência do motor: rpm / 60 × 2 (dois pulsos por volta), com suavização
      engineOsc.frequency.setTargetAtTime(Math.max(30, (s.rpm / 60) * 2), t, 0.05)
      engineFilter.frequency.setTargetAtTime(400 + s.throttle * 1400, t, 0.05)
      engineGain.gain.setTargetAtTime(0.05 + s.throttle * 0.08, t, 0.05)
      squealGain.gain.setTargetAtTime(Math.min(0.12, s.squeal * 0.12), t, 0.03)
    },
    toggleMute: () => {
      muted = !muted
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05)
      return muted
    },
    dispose: () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      engineOsc?.stop()
      squealSrc?.stop()
      void ctx?.close()
    },
  }
}
