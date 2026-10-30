import { describe, expect, it } from 'vitest'
import { defaultModel } from './defaultModel'
import { footRefs, groundYFor, toggleFoot, toWorld } from './model'
import { parseModel } from './storage'

describe('salvar e carregar', () => {
  it('lê de volta uma criatura exportada', () => {
    const json = JSON.parse(JSON.stringify({ version: 1, ...defaultModel }))
    expect(parseModel(json)).toEqual(defaultModel)
  })

  it('recusa músculo apontando para junta inexistente', () => {
    const broken = { ...defaultModel, muscles: [{ id: 1, a: { limb: 1, i: 99 }, b: { limb: null, i: 1 }, strength: 0.3, contraction: 0.2 }] }
    expect(() => parseModel(broken)).toThrow('músculos')
  })

  it('recusa algo que não é criatura', () => {
    expect(() => parseModel({ hello: 'world' })).toThrow()
  })

  it('pés: padrão nas pontas, alternar marca/desmarca, viram partículas nos dois exemplares', () => {
    expect(footRefs(defaultModel)).toEqual([
      { limb: 1, i: 2 },
      { limb: 2, i: 2 },
    ])
    const withoutFront = toggleFoot(defaultModel, { limb: 1, i: 2 })
    expect(footRefs(withoutFront)).toEqual([{ limb: 2, i: 2 }])
    const withTorso = toggleFoot(withoutFront, { limb: null, i: 1 })
    // Um pé de torso vira 1 partícula; um de membro, 2 (frente e trás).
    expect(toWorld(withTorso, groundYFor(withTorso)).feet.size).toBe(3)
    expect(parseModel(JSON.parse(JSON.stringify(withTorso))).feet).toEqual(withTorso.feet)
  })
})
