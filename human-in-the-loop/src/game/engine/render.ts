import * as THREE from 'three'
import { palette } from '../palette'

export interface RenderContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  dispose: () => void
}

/** Cria renderer, cena e câmera, e mantém o tamanho sincronizado com o host. */
export function createRenderContext(host: HTMLElement): RenderContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
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
    dispose() {
      observer.disconnect()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
