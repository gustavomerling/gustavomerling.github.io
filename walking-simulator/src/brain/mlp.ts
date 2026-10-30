import type { Rng } from '../utils/rng'

// Rede neural com uma camada oculta e `tanh`. Todos os pesos ficam num único Float32Array,
// o que facilita cruzar e mutar cérebros na neuroevolução (etapa 8).
// Layout: [W1 (hidden x inputs), b1 (hidden), W2 (outputs x hidden), b2 (outputs)].
export class Mlp {
  readonly inputs: number
  readonly hidden: number
  readonly outputs: number
  readonly weights: Float32Array
  private readonly hiddenValues: Float32Array

  constructor(inputs: number, hidden: number, outputs: number, weights?: Float32Array) {
    this.inputs = inputs
    this.hidden = hidden
    this.outputs = outputs
    this.weights = weights ?? new Float32Array(Mlp.weightCount(inputs, hidden, outputs))
    this.hiddenValues = new Float32Array(hidden)
  }

  static weightCount(inputs: number, hidden: number, outputs: number): number {
    return hidden * inputs + hidden + outputs * hidden + outputs
  }

  // Pesos iniciais gaussianos, escalados pelo tamanho da camada (Xavier simplificado).
  static random(inputs: number, hidden: number, outputs: number, rng: Rng): Mlp {
    const mlp = new Mlp(inputs, hidden, outputs)
    const w = mlp.weights
    const s1 = 1 / Math.sqrt(inputs)
    const s2 = 1 / Math.sqrt(hidden)
    const w1End = hidden * inputs
    const b1End = w1End + hidden
    const w2End = b1End + outputs * hidden
    for (let i = 0; i < w.length; i++) {
      if (i < w1End) w[i] = rng.gaussian() * s1
      else if (i < b1End) w[i] = 0
      else if (i < w2End) w[i] = rng.gaussian() * s2
      else w[i] = 0
    }
    return mlp
  }

  // Calcula as saídas em [-1, 1] para as entradas dadas.
  forward(input: ArrayLike<number>, out: Float32Array = new Float32Array(this.outputs)): Float32Array {
    const { inputs, hidden, outputs, weights: w } = this
    const b1 = hidden * inputs
    const w2 = b1 + hidden
    const b2 = w2 + outputs * hidden
    for (let h = 0; h < hidden; h++) {
      let sum = w[b1 + h]
      for (let i = 0; i < inputs; i++) sum += w[h * inputs + i] * input[i]
      this.hiddenValues[h] = Math.tanh(sum)
    }
    for (let o = 0; o < outputs; o++) {
      let sum = w[b2 + o]
      for (let h = 0; h < hidden; h++) sum += w[w2 + o * hidden + h] * this.hiddenValues[h]
      out[o] = Math.tanh(sum)
    }
    return out
  }
}
