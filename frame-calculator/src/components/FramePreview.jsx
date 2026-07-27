import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'
import { SIZES, WOOD_TYPES, GLASS_TYPES } from '../config/frameOptions'
import './FramePreview.css'

const LOUPE_ZOOM = 3

function FrameVisual({ width, height, thickness, image, glassOpacity, glassBlur, contentBackground, sizeLabel }) {
  return (
    <div
      className="frame-border"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        '--frame-image': `url('${image}')`,
        '--frame-thickness': `${thickness}px`,
        '--frame-width': `${width}px`,
        '--glass-opacity': glassOpacity,
        '--glass-blur': `${glassBlur}px`,
      }}
    >
      <div className="frame-edge frame-edge-top">
        <div className="frame-edge-fill-h"></div>
      </div>
      <div className="frame-edge frame-edge-bottom">
        <div className="frame-edge-fill-h"></div>
      </div>
      <div className="frame-edge frame-edge-left"></div>
      <div className="frame-edge frame-edge-right"></div>

      <div className="frame-inner">
        <div className="frame-glass"></div>
        <div className="frame-content" style={{ background: contentBackground }}>
          <div className="placeholder-content">{sizeLabel}</div>
        </div>
      </div>

      <div className="frame-light-overlay"></div>
    </div>
  )
}

function FramePreview({ frame }) {
  const captureRef = useRef(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const size = SIZES.find((s) => s.value === frame.size) || SIZES.find((s) => s.value === 'A4')
  const wood = WOOD_TYPES.find((w) => w.value === frame.woodType) || WOOD_TYPES[0]
  const glass = GLASS_TYPES.find((g) => g.value === frame.glassType) || GLASS_TYPES[0]
  const ratio = size.width / size.height

  const previewHeight = 400
  const previewWidth = previewHeight * ratio

  const handleDownload = async () => {
    if (!captureRef.current) return
    setIsDownloading(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
        ignoreElements: (el) => el.classList?.contains('corner-loupe'),
      })
      const link = document.createElement('a')
      link.download = `${frame.name || frame.size}-simulacao.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Falha ao gerar imagem da simulação', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const visualProps = {
    width: previewWidth,
    height: previewHeight,
    thickness: frame.frameThickness,
    image: wood.image,
    glassOpacity: glass.opacity,
    glassBlur: glass.blur,
    contentBackground: frame.frameBackground,
    sizeLabel: frame.size,
  }

  return (
    <div className="frame-preview-container">
      <div
        className="preview-canvas"
        ref={captureRef}
        style={{ background: frame.simulationBackground }}
      >
        <div className="frame-preview">
          <FrameVisual {...visualProps} />
          <div className="frame-shadow"></div>
        </div>

        <div
          className="corner-loupe"
          title="Detalhe do canto (45°)"
          style={{ background: frame.simulationBackground }}
        >
          <div className="corner-loupe-stage" style={{ transform: `scale(${LOUPE_ZOOM})` }}>
            <FrameVisual {...visualProps} />
          </div>
        </div>
      </div>

      <div className="preview-info">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{frame.size}</span>
          {' • '}
          <span>{frame.frameThickness}cm moldura</span>
          {' • '}
          <span>Qtd: {frame.quantity}</span>
        </p>
        <button
          type="button"
          className="btn-download-preview"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download size={16} /> {isDownloading ? 'Gerando...' : 'Baixar Simulação'}
        </button>
      </div>
    </div>
  )
}

export default FramePreview
