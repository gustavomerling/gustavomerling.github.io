import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createKeyboardInput, type DriveInput } from './input'

/** Frequência da simulação física (passo fixo). */
export const PHYSICS_HZ = 120
const DT = 1 / PHYSICS_HZ
/** Quadro longo demais (aba em segundo plano, travamento): corta para não "pular" a simulação. */
const MAX_FRAME_TIME = 0.25
const STATS_INTERVAL_MS = 250

/** Massa do chassi em kg (densidade ajustada à caixa do colisor). */
const CHASSIS_MASS = 1200
const CHASSIS_HALF = { x: 1.0, y: 0.35, z: 2.1 }
const SPAWN_HEIGHT = 2

export type SimStats = {
  fps: number
  stepsLastFrame: number
  accumulatorMs: number
  simTime: number
  clamped: boolean
  input: DriveInput
  chassisY: number
  chassisSpeed: number
}

/**
 * Cena com chão, chassi do carro como corpo rígido (Rapier), sombras, iluminação HDR
 * e câmera que segue o carro. A física roda em passo fixo; o render interpola a pose.
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
  // Viés pequeno + normalBias: evita a sombra "descolar" do contato sem criar acne
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.01
  scene.add(sun)

  // Chão visual (asfalto placeholder); o colisor fica em y ∈ [-1, 0]
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.9, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Chassi visual: mesma caixa do colisor, com a cabine em cima
  const car = new THREE.Group()
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xe8742c,
    roughness: 0.35,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x14202a, roughness: 0.05, metalness: 0.2 })

  const body = new THREE.Mesh(new THREE.BoxGeometry(CHASSIS_HALF.x * 2, CHASSIS_HALF.y * 2, CHASSIS_HALF.z * 2), paint)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glass)
  cabin.position.set(0, 0.6, -0.2)
  // Saia escura na base, levemente mais larga que a carroceria: o carro "assenta" no asfalto sem faixa de luz
  const underbody = new THREE.Mesh(
    new THREE.BoxGeometry(CHASSIS_HALF.x * 2 + 0.04, 0.14, CHASSIS_HALF.z * 2 + 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 }),
  )
  underbody.position.y = -CHASSIS_HALF.y + 0.07
  car.add(body, cabin, underbody)
  car.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  scene.add(car)

  // Sombra de contato: mancha escura suave sob o chassi, para o apoio no chão ficar legível
  const contactCanvas = document.createElement('canvas')
  contactCanvas.width = contactCanvas.height = 128
  const cctx = contactCanvas.getContext('2d')!
  const grad = cctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.75)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.45)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  cctx.fillStyle = grad
  cctx.fillRect(0, 0, 128, 128)
  const contactTex = new THREE.CanvasTexture(contactCanvas)
  const contactGeo = new THREE.PlaneGeometry(CHASSIS_HALF.x * 2.6, CHASSIS_HALF.z * 2.6)
  contactGeo.rotateX(-Math.PI / 2)
  const contact = new THREE.Mesh(
    contactGeo,
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }),
  )
  contact.position.y = 0.01
  scene.add(contact)

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

  // Entrada: lida a cada passo de física
  const keyboard = createKeyboardInput()
  let input: DriveInput = keyboard.read()

  // Estado da simulação (preenchido quando o Rapier termina de carregar)
  let world: RAPIER.World | null = null
  let chassis: RAPIER.RigidBody | null = null
  // Pose após o último passo (cur) e antes dele (prev), para interpolar o render
  const curPos = new THREE.Vector3(0, SPAWN_HEIGHT, 0)
  const curQuat = new THREE.Quaternion()
  const prevPos = new THREE.Vector3()
  const prevQuat = new THREE.Quaternion()
  let chassisSpeed = 0

  const readChassis = () => {
    if (!chassis) return
    const t = chassis.translation()
    const r = chassis.rotation()
    const v = chassis.linvel()
    curPos.set(t.x, t.y, t.z)
    curQuat.set(r.x, r.y, r.z, r.w)
    chassisSpeed = Math.hypot(v.x, v.y, v.z)
  }

  const resetChassis = () => {
    if (!chassis) return
    chassis.setTranslation({ x: 0, y: SPAWN_HEIGHT, z: 0 }, true)
    chassis.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    chassis.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassis.setAngvel({ x: 0, y: 0, z: 0 }, true)
    readChassis()
    prevPos.copy(curPos)
    prevQuat.copy(curQuat)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() === 'r') resetChassis()
  }
  window.addEventListener('keydown', onKey)

  // Loop: passo fixo de física, render a cada quadro com interpolação
  let last = performance.now()
  let statsStart = last
  let framesCount = 0
  let fps = 0
  let stepsThisFrame = 0
  let clamped = false
  let acc = 0
  let simTime = 0
  let frame = 0
  let disposed = false

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick)

    let elapsed = (now - last) / 1000
    last = now
    clamped = elapsed > MAX_FRAME_TIME
    if (clamped) elapsed = MAX_FRAME_TIME
    acc += elapsed

    stepsThisFrame = 0
    while (acc >= DT && world && chassis) {
      input = keyboard.read()
      prevPos.copy(curPos)
      prevQuat.copy(curQuat)
      world.step()
      readChassis()
      simTime += DT
      acc -= DT
      stepsThisFrame++
    }

    // Pose interpolada entre o passo anterior e o atual
    const alpha = acc / DT
    const renderPos = prevPos.clone().lerp(curPos, alpha)
    const renderQuat = prevQuat.clone().slerp(curQuat, alpha)
    car.position.copy(renderPos)
    car.quaternion.copy(renderQuat)
    contact.position.set(renderPos.x, 0.01, renderPos.z)
    contact.rotation.y = new THREE.Euler().setFromQuaternion(renderQuat, 'YXZ').y

    const target = renderPos.clone().add(new THREE.Vector3(0, 0.8, 0))
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * radius,
      target.y + Math.sin(pitch) * radius + 1,
      target.z + Math.cos(yaw) * Math.cos(pitch) * radius,
    )
    camera.lookAt(target)
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
        chassisY: curPos.y,
        chassisSpeed,
      })
    }
  }

  // Carrega o Rapier (WASM) e monta o mundo antes de começar a simulação
  RAPIER.init().then(() => {
    if (disposed) return

    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    world.timestep = DT

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(200, 0.5, 200).setTranslation(0, -0.5, 0),
    )

    chassis = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, SPAWN_HEIGHT, 0),
    )
    // densidade = massa / volume da caixa
    const volume = CHASSIS_HALF.x * 2 * (CHASSIS_HALF.y * 2) * (CHASSIS_HALF.z * 2)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(CHASSIS_HALF.x, CHASSIS_HALF.y, CHASSIS_HALF.z).setDensity(CHASSIS_MASS / volume),
      chassis,
    )

    resetChassis()
    frame = requestAnimationFrame(tick)
  })

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    keyboard.dispose()
    window.removeEventListener('keydown', onKey)
    renderer.domElement.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('resize', onResize)
    world?.free()
    contactGeo.dispose()
    contactTex.dispose()
    pmrem.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
