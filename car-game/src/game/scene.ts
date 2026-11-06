import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Hello world: cena com chão, um carro-placeholder (caixas e cilindros),
 * sombras, iluminação com ambiente HDR e câmera orbital simples.
 * Devolve uma função de limpeza para o React.
 */
export function startScene(container: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1b1d22)
  scene.fog = new THREE.Fog(0x1b1d22, 30, 90)

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.6

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200)

  // Sol
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.2)
  sun.position.set(12, 18, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -15
  sun.shadow.camera.right = 15
  sun.shadow.camera.top = 15
  sun.shadow.camera.bottom = -15
  sun.shadow.bias = -0.0005
  scene.add(sun)

  // Chão (asfalto placeholder)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.9, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Carro-placeholder
  const car = new THREE.Group()
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xe8742c,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x14202a, roughness: 0.05, metalness: 0.2 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 })

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), paint)
  body.position.y = 0.6
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glass)
  cabin.position.set(0, 1.25, -0.2)
  car.add(body, cabin)

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 32)
  wheelGeo.rotateZ(Math.PI / 2)
  for (const [x, z] of [
    [-1.0, 1.35],
    [1.0, 1.35],
    [-1.0, -1.35],
    [1.0, -1.35],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, rubber)
    wheel.position.set(x, 0.36, z)
    car.add(wheel)
  }
  car.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  scene.add(car)

  // Órbita simples por arrasto
  let yaw = 0.6
  let pitch = 0.3
  const radius = 9
  let dragging = false
  let lastX = 0
  let lastY = 0

  const onDown = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onUp = () => {
    dragging = false
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    yaw -= (e.clientX - lastX) * 0.005
    pitch = THREE.MathUtils.clamp(pitch + (e.clientY - lastY) * 0.005, 0.05, 1.4)
    lastX = e.clientX
    lastY = e.clientY
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointermove', onMove)

  const onResize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  let frame = 0
  const tick = () => {
    frame = requestAnimationFrame(tick)
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius + 1,
      Math.cos(yaw) * Math.cos(pitch) * radius,
    )
    camera.lookAt(0, 0.8, 0)
    renderer.render(scene, camera)
  }
  tick()

  return () => {
    cancelAnimationFrame(frame)
    renderer.domElement.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', onResize)
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
