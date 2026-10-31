import { BADGE_HEIGHT_MM, BADGE_WIDTH_MM } from './badge'

const encoder = new TextEncoder()

function ascii(value: string): Uint8Array {
  return encoder.encode(value)
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.byteLength
  }
  return output
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível gerar a imagem.'))
      },
      type,
      quality,
    )
  })
}

/* ------------------------------------------------------------------ */
/* PNG + pHYs (300 DPI)                                                */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index++) {
    let value = index
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makePngPhysChunk(dpi: number): Uint8Array {
  const pixelsPerMeter = Math.round(dpi / 0.0254)
  const data = new Uint8Array(9)
  const view = new DataView(data.buffer)
  view.setUint32(0, pixelsPerMeter)
  view.setUint32(4, pixelsPerMeter)
  data[8] = 1

  const type = ascii('pHYs')
  const crcInput = concat([type, data])
  const chunk = new Uint8Array(12 + data.byteLength)
  const chunkView = new DataView(chunk.buffer)
  chunkView.setUint32(0, data.byteLength)
  chunk.set(type, 4)
  chunk.set(data, 8)
  chunkView.setUint32(8 + data.byteLength, crc32(crcInput))
  return chunk
}

async function withPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const signature = bytes.slice(0, 8)
  const output: Uint8Array[] = [signature]
  let offset = 8
  let inserted = false

  while (offset < bytes.byteLength) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset)
    const length = view.getUint32(0)
    const type = new TextDecoder('ascii').decode(bytes.slice(offset + 4, offset + 8))
    const total = length + 12
    const chunk = bytes.slice(offset, offset + total)

    if (type === 'pHYs') {
      if (!inserted) {
        output.push(makePngPhysChunk(dpi))
        inserted = true
      }
    } else {
      output.push(chunk)
      if (type === 'IHDR' && !inserted) {
        output.push(makePngPhysChunk(dpi))
        inserted = true
      }
    }
    offset += total
  }

  if (!inserted) output.push(makePngPhysChunk(dpi))
  return new Blob(output.map(toBlobPart), { type: 'image/png' })
}

export async function canvasToPng(canvas: HTMLCanvasElement, dpi = 300): Promise<Blob> {
  const blob = await canvasToBlob(canvas, 'image/png')
  return withPngDpi(blob, dpi)
}

/* ------------------------------------------------------------------ */
/* PDF CMYK (DeviceCMYK)                                               */
/* ------------------------------------------------------------------ */

function rgbaToCmyk(rgba: Uint8ClampedArray): Uint8Array {
  const output = new Uint8Array((rgba.length / 4) * 4)
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 4) {
    const alpha = rgba[source + 3]! / 255
    const red = (rgba[source]! * alpha + 255 * (1 - alpha)) / 255
    const green = (rgba[source + 1]! * alpha + 255 * (1 - alpha)) / 255
    const blue = (rgba[source + 2]! * alpha + 255 * (1 - alpha)) / 255

    const black = 1 - Math.max(red, green, blue)
    if (black >= 0.9999) {
      output[target] = 0
      output[target + 1] = 0
      output[target + 2] = 0
      output[target + 3] = 255
      continue
    }

    const scale = 1 - black
    output[target] = Math.round(((1 - red - black) / scale) * 255)
    output[target + 1] = Math.round(((1 - green - black) / scale) * 255)
    output[target + 2] = Math.round(((1 - blue - black) / scale) * 255)
    output[target + 3] = Math.round(black * 255)
  }
  return output
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const stream = new Blob([toBlobPart(bytes)])
      .stream()
      .pipeThrough(new CompressionStream('deflate'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

function pdfHexText(value: string): string {
  let hex = 'FEFF'
  for (let index = 0; index < value.length; index++) {
    hex += value.charCodeAt(index).toString(16).padStart(4, '0').toUpperCase()
  }
  return `<${hex}>`
}

function pdfDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

export interface PdfMetadata {
  title: string
  author?: string
}

export async function canvasToCmykPdf(
  canvas: HTMLCanvasElement,
  metadata: PdfMetadata,
): Promise<Blob> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas indisponível.')
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const cmyk = rgbaToCmyk(pixels.data)
  const compressed = await deflate(cmyk)
  const imageBytes = compressed ?? cmyk

  const pageWidth = (BADGE_WIDTH_MM / 25.4) * 72
  const pageHeight = (BADGE_HEIGHT_MM / 25.4) * 72
  const content = ascii(
    `q\n${pageWidth.toFixed(5)} 0 0 ${pageHeight.toFixed(5)} 0 0 cm\n/Im0 Do\nQ\n`,
  )

  const header = concat([
    ascii('%PDF-1.4\n'),
    new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]),
  ])
  const parts: Uint8Array[] = [header]
  let offset = header.byteLength
  const offsets: number[] = []

  const push = (bytes: Uint8Array) => {
    parts.push(bytes)
    offset += bytes.byteLength
  }

  const startObject = (number: number) => {
    offsets[number] = offset
    push(ascii(`${number} 0 obj\n`))
  }
  const endObject = () => push(ascii('\nendobj\n'))

  startObject(1)
  push(ascii('<< /Type /Catalog /Pages 2 0 R >>'))
  endObject()

  startObject(2)
  push(ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'))
  endObject()

  startObject(3)
  push(
    ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(5)} ${pageHeight.toFixed(5)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,
    ),
  )
  endObject()

  startObject(4)
  push(ascii(`<< /Length ${content.byteLength} >>\nstream\n`))
  push(content)
  push(ascii('\nendstream'))
  endObject()

  const filter = compressed ? ' /Filter /FlateDecode' : ''
  startObject(5)
  push(
    ascii(
      `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceCMYK /BitsPerComponent 8${filter} /Interpolate true /Length ${imageBytes.byteLength} >>\nstream\n`,
    ),
  )
  push(imageBytes)
  push(ascii('\nendstream'))
  endObject()

  const info = [
    `<< /Title ${pdfHexText(metadata.title)}`,
    metadata.author ? ` /Author ${pdfHexText(metadata.author)}` : '',
    ' /Creator (cracha-paramore)',
    ' /Producer (Paramore Brasil - gerador de cracha)',
    ` /CreationDate (${pdfDate(new Date())})`,
    ' >>',
  ].join('')
  startObject(6)
  push(ascii(info))
  endObject()

  const xrefOffset = offset
  const xref = ['xref\n0 7\n', '0000000000 65535 f \n']
  for (let index = 1; index <= 6; index++) {
    xref.push(`${String(offsets[index] ?? 0).padStart(10, '0')} 00000 n \n`)
  }
  xref.push(
    `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  )
  push(ascii(xref.join('')))

  return new Blob(parts.map(toBlobPart), { type: 'application/pdf' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'cracha'
  )
}
