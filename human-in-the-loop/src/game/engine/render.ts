import * as THREE from 'three'
import { palette } from '../palette'

export interface RenderContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Pixels renderizados por pixel CSS (1 = nítido em tela comum). */
  setPixelRatio: (ratio: number) => void
  dispose: () => void
}

/** Cria renderer, cena e câmera, e mantém o tamanho sincronizado com o host. */
export function createRenderContext(host: HTMLElement): RenderContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  // Começa em 1: em telas com zoom do Windows (125%/150%) o padrão do
  // navegador renderizaria 1,5–2,25× mais pixels. Ajustável no menu.
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(palette.sky)

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200)

  const resize = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  return {
    renderer,
    scene,
    camera,
    setPixelRatio(ratio) {
      renderer.setPixelRatio(ratio)
      resize()
    },
    dispose() {
      observer.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
