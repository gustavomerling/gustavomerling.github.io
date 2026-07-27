import { SIZES } from '../config/frameOptions'

const SIZE_LOOKUP = Object.fromEntries(SIZES.map((s) => [s.value, s]))
const BASE_SIZE = SIZE_LOOKUP.A4
const BASE_AREA = BASE_SIZE.width * BASE_SIZE.height

const priceConfig = {
  base: 50,
  // Preço adicional por área equivalente a 1x o tamanho base (A4) a mais.
  areaPricePerBaseArea: 60,
  woodType: { carvalho: 0, cerejeira: 40, branca: 20, preta: 20, nogueira: 60, mogno: 80 },
  glassType: { 'vidro-comum': 0, 'vidro-uv': 60, 'acrilico': 40, 'sem-vidro': -20 },
  frameThickness: 8,
}

export function formatBRL(value) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function calculatePrice(frame) {
  const base = priceConfig.base
  const size = SIZE_LOOKUP[frame.size] || BASE_SIZE
  const area = size.width * size.height
  const sizeAdditional = Math.round((area / BASE_AREA - 1) * priceConfig.areaPricePerBaseArea)
  const woodAdditional = priceConfig.woodType[frame.woodType] || 0
  const glassAdditional = priceConfig.glassType[frame.glassType] || 0
  const thicknessAdditional = (frame.frameThickness - 2) * priceConfig.frameThickness

  const unitPrice = base + sizeAdditional + woodAdditional + glassAdditional + thicknessAdditional
  return {
    unitPrice: Math.max(unitPrice, 30),
    totalPrice: Math.max(unitPrice, 30) * frame.quantity,
  }
}
