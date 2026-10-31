export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    image.src = src
  })
}

export async function getCroppedImage(
  imageSrc: string,
  crop: CropArea,
  rotationDegrees = 0,
): Promise<string> {
  const image = await loadImage(imageSrc)
  const rotation = (rotationDegrees * Math.PI) / 180
  const sin = Math.abs(Math.sin(rotation))
  const cos = Math.abs(Math.cos(rotation))
  const boundsWidth = image.width * cos + image.height * sin
  const boundsHeight = image.width * sin + image.height * cos

  const rotated = document.createElement('canvas')
  rotated.width = Math.max(1, Math.round(boundsWidth))
  rotated.height = Math.max(1, Math.round(boundsHeight))
  const rotatedCtx = rotated.getContext('2d')
  if (!rotatedCtx) throw new Error('Canvas indisponível.')

  rotatedCtx.fillStyle = '#0b0b0e'
  rotatedCtx.fillRect(0, 0, rotated.width, rotated.height)
  rotatedCtx.translate(rotated.width / 2, rotated.height / 2)
  rotatedCtx.rotate(rotation)
  rotatedCtx.translate(-image.width / 2, -image.height / 2)
  rotatedCtx.drawImage(image, 0, 0)

  const sourceX = Math.max(0, Math.round(crop.x))
  const sourceY = Math.max(0, Math.round(crop.y))
  const sourceWidth = Math.min(rotated.width - sourceX, Math.round(crop.width))
  const sourceHeight = Math.min(rotated.height - sourceY, Math.round(crop.height))

  const scale = Math.min(1, 1200 / Math.max(sourceWidth, sourceHeight, 1))
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(sourceWidth * scale))
  output.height = Math.max(1, Math.round(sourceHeight * scale))
  const outputCtx = output.getContext('2d')
  if (!outputCtx) throw new Error('Canvas indisponível.')
  outputCtx.imageSmoothingEnabled = true
  outputCtx.imageSmoothingQuality = 'high'
  outputCtx.drawImage(
    rotated,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    output.width,
    output.height,
  )

  return output.toDataURL('image/jpeg', 0.94)
}
