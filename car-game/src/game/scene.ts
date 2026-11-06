import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createKeyboardInput, type DriveInput } from './input'

/** Frequência da simulação física (passo fixo). */
export const PHYSICS_HZ = 120
const DT = 1 / PHYSICS_HZ
/** Quadro longo demais (aba em segundo plano, travamento): corta para não "pular" a simulação. */
const MAX_FRAME_TIME = 0.25
const STATS_INTERVAL_MS = 250

export type SimStats = {
  fps: number
  stepsLastFrame: number
  accumulatorMs: number
  simTime: number
  clamped: boolean
  input: DriveInput
}

// Placeholder de simulação: o carro anda em círculo. Só serve para provar o loop.
const CIRCLE_RADIUS = 6
const CIRCLE_SPEED = 3 // m/s

/**
 * Hello world + loop de física: cena com chão, carro-placeholder, sombras,
 * iluminação HDR e câmera orbital. A simulação roda em passo fixo; o render
 * interpola entre os dois últimos estados.
 * Devolve uma função de limpeza para o React.
 */
export function startScene(container: HTMLElement, onStats?: (s: SimStats) => void): () => void {
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

  // Estado da simulação: ângulo do carro no círculo, atual e do passo anterior
  let simAngle = 0
  let prevAngle = 0
  let simTime = 0
  let acc = 0

  const placeCar = (a: number) => {
    car.position.set(Math.cos(a) * CIRCLE_RADIUS, 0, Math.sin(a) * CIRCLE_RADIUS)
    car.rotation.y = -a
  }
  placeCar(0)

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

  // Loop: passo fixo de física, render a cada quadro com interpolação
  let last = performance.now()
  let statsStart = last
  let framesCount = 0
  let fps = 0
  let stepsThisFrame = 0
  let clamped = false
  let frame = 0

  // Entrada: lida a cada passo de física, para o que o veículo recebe ser o que foi lido na simulação
  const keyboard = createKeyboardInput()
  let input: DriveInput = keyboard.read()

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick)

    let elapsed = (now - last) / 1000
    last = now
    clamped = elapsed > MAX_FRAME_TIME
    if (clamped) elapsed = MAX_FRAME_TIME
    acc += elapsed

    stepsThisFrame = 0
    while (acc >= DT) {
      input = keyboard.read()
      prevAngle = simAngle
      simAngle += (CIRCLE_SPEED / CIRCLE_RADIUS) * DT
      simTime += DT
      acc -= DT
      stepsThisFrame++
    }

    const alpha = acc / DT
    placeCar(prevAngle + (simAngle - prevAngle) * alpha)

    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius + 1,
      Math.cos(yaw) * Math.cos(pitch) * radius,
    )
    camera.lookAt(0, 0.8, 0)
    renderer.render(scene, camera)

    framesCount++
    const elapsedStats = now - statsStart
    if (elapsedStats >= STATS_INTERVAL_MS) {
      fps = (framesCount * 1000) / elapsedStats
      framesCount = 0
      statsStart = now
      onStats?.({
        fps,
        stepsLastFrame: stepsThisFrame,
        accumulatorMs: acc * 1000,
        simTime,
        clamped,
        input,
      })
    }
  }
  frame = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(frame)
    keyboard.dispose()
    renderer.domElement.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', onResize)
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
