// Imagens da pasta public/mock vêm por caminho relativo; uploads do usuário
// chegam como data URL e são usados como estão.
export function resolveImage(src) {
  if (!src) return null
  if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) return src
  return `${import.meta.env.BASE_URL}${src}`
}

// Upload de peça sem servidor: a imagem é redimensionada no canvas e guardada
// como data URL. O localStorage tem cerca de 5 MB, então vale reduzir bem —
// 1080px de lado maior em JPEG 0.8 dá algo entre 100 e 250 kB por peça.
const MAX_EDGE = 1080
const QUALITY = 0.8
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function readImageFile(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo selecionado.'))
      return
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo precisa ser uma imagem.'))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('A imagem passa de 12 MB. Escolha uma versão menor.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // PNG com transparência perderia o fundo ao virar JPEG, então mantemos
        // PNG nesse caso e aceitamos o arquivo maior.
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve({
          dataUrl: canvas.toDataURL(type, quality),
          width,
          height,
          name: file.name,
        })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function approxDataUrlBytes(dataUrl) {
  if (!dataUrl?.startsWith('data:')) return 0
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.round((base64.length * 3) / 4)
}

export function formatBytes(bytes) {
  if (!bytes) return '0 kB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
