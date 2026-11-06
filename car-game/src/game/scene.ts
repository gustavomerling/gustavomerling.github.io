import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { createDrivetrain, type Drivetrain } from './drivetrain'
import { createEffects, type Effects, type WheelFx } from './effects'
import { buildRoad, type Road } from './road'
import { buildTrack, type Track } from './track'
import { visual } from './visual'
import { createKeyboardInput, type DriveInput } from './input'
import { createVehicle, type Vehicle } from './vehicle'
import { VEHICLE } from './vehicle-config'

/** Frequência da simulação física (passo fixo). */
export const PHYSICS_HZ = 120
const DT = 1 / PHYSICS_HZ
/** Quadro longo demais (aba em segundo plano, travamento): corta para não "pular" a simulação. */
const MAX_FRAME_TIME = 0.25
const STATS_INTERVAL_MS = 250

const CH = VEHICLE.chassisHalf

export type WheelStats = {
  suspensionLength: number
  inContact: boolean
  /** Escorregamento longitudinal (adimensional). */
  slipRatio: number
  /** Ângulo de escorregamento (graus). */
  slipAngleDeg: number
  /** Carga da mola na roda (N): sobe na roda que recebe o peso. */
  load: number
}

export type SimStats = {
  fps: number
  stepsLastFrame: number
  accumulatorMs: number
  simTime: number
  clamped: boolean
  input: DriveInput
  chassisY: number
  chassisSpeed: number
  wheels: WheelStats[]
  engine: { rpm: number; gear: string; torque: number }
  abs: boolean
  /** Direção: ângulo médio das rodas dianteiras (graus, positivo = direita). */
  steerDeg: number
  /** Modo da câmera (C alterna). */
  camera: 'perseguição' | 'livre'
  /** Arfagem (graus): positivo = nariz para cima. */
  pitchDeg: number
  /** Rolagem (graus): positivo = lado esquerdo para cima. */
  rollDeg: number
}

/**
 * Cena com chão, carro com chassi rígido e quatro rodas com suspensão (Rapier),
 * sombras, iluminação HDR e câmera que segue o carro. A física roda em passo fixo;
 * o render interpola a pose. Devolve uma função de limpeza para o React.
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

  // Pós-processamento: render da cena, bloom (brilho suave) e saída com tone mapping
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    visual.bloomStrength,
    0.4,
    0.85,
  )
  composer.addPass(bloomPass)
  composer.addPass(new OutputPass())
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  composer.setSize(container.clientWidth, container.clientHeight)

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

  // Chão, grade, faixas, cones e rampa: ver track.ts (montado quando o Rapier carrega)
  let track: Track | null = null
  let road: Road | null = null
  const effects: Effects | null = createEffects(scene)

  // Carro visual: carroceria, cabine, saia escura e rodas (posições vêm da suspensão)
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

  const body = new THREE.Mesh(new THREE.BoxGeometry(CH.x * 2, CH.y * 2, CH.z * 2), paint)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glass)
  cabin.position.set(0, 0.6, -0.2)
  // Saia escura na base, levemente mais larga que a carroceria: o carro "assenta" no asfalto sem faixa de luz
  const underbody = new THREE.Mesh(
    new THREE.BoxGeometry(CH.x * 2 + 0.04, 0.14, CH.z * 2 + 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 }),
  )
  underbody.position.y = -CH.y + 0.07
  car.add(body, cabin, underbody)

  const wheelRadius = VEHICLE.wheels.radius
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, VEHICLE.wheels.width, 32)
  wheelGeo.rotateZ(Math.PI / 2) // eixo ao longo de x
  // Aro metálico: disco prateado um pouco mais largo que o pneu, filho da roda (gira junto)
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, VEHICLE.wheels.width + 0.02, 24)
  rimGeo.rotateZ(Math.PI / 2)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.28 })

  const wheelMeshes: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Mesh(wheelGeo, rubber)
    // Ordem YXZ: o giro (x) acontece no eixo da roda, depois o esterçamento (y) a gira
    wheel.rotation.order = 'YXZ'
    wheel.add(new THREE.Mesh(rimGeo, rimMat))
    car.add(wheel)
    wheelMeshes.push(wheel)
  }

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
  const contactGeo = new THREE.PlaneGeometry(CH.x * 2.6, CH.z * 2.6)
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
    composer.setSize(w, h)
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
  let vehicle: Vehicle | null = null
  // Pose após o último passo (cur) e antes dele (prev), para interpolar o render
  const curPos = new THREE.Vector3(0, VEHICLE.spawnHeight, 0)
  const curQuat = new THREE.Quaternion()
  const prevPos = new THREE.Vector3()
  const prevQuat = new THREE.Quaternion()
  let chassisSpeed = 0
  const wheelStats: WheelStats[] = Array.from({ length: 4 }, () => ({
    suspensionLength: VEHICLE.wheels.restLength,
    inContact: false,
    slipRatio: 0,
    slipAngleDeg: 0,
    load: 0,
  }))
  // Ângulo de giro acumulado de cada roda (só visual)
  const wheelAngle = [0, 0, 0, 0]
  // Inclinação do chassi (rad), para o painel
  let pitchRad = 0
  let rollRad = 0
  // Aceleração longitudinal (m/s²) e velocidade com sinal no passo anterior
  let longAccel = 0
  let prevSignedSpeed = 0

  // ABS: alternado com B
  let absOn: boolean = VEHICLE.brakes.absDefault

  // Trem de força: motor, caixa e rotação ligada às rodas traseiras
  const drivetrain: Drivetrain = createDrivetrain(VEHICLE.engine)
  let engineTorque = 0 // torque do motor na roda, para o painel

  const readChassis = () => {
    if (!chassis || !vehicle) return
    const t = chassis.translation()
    const r = chassis.rotation()
    const v = chassis.linvel()
    curPos.set(t.x, t.y, t.z)
    curQuat.set(r.x, r.y, r.z, r.w)
    chassisSpeed = Math.hypot(v.x, v.y, v.z)
    // Nariz (+z) e lado +x (esquerda do carro) no mundo: arfagem e rolagem
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(curQuat)
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(curQuat)
    // Aceleração longitudinal (suavizada), para a câmera ficar para trás ao acelerar
    const signedSpeed = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z
    longAccel += ((signedSpeed - prevSignedSpeed) / DT - longAccel) * 0.2
    prevSignedSpeed = signedSpeed
    pitchRad = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1))
    rollRad = Math.asin(THREE.MathUtils.clamp(side.y, -1, 1))
    for (let i = 0; i < vehicle.wheelCount; i++) {
      const tire = vehicle.tire(i)
      wheelStats[i].suspensionLength = vehicle.suspensionLength(i)
      wheelStats[i].inContact = vehicle.inContact(i)
      wheelStats[i].slipRatio = tire.slipRatio
      wheelStats[i].slipAngleDeg = THREE.MathUtils.radToDeg(tire.slipAngle)
      wheelStats[i].load = vehicle.suspensionForce(i)
      wheelAngle[i] += vehicle.spin(i) * DT
    }
  }

  const resetChassis = () => {
    if (!chassis) return
    chassis.setTranslation({ x: 0, y: VEHICLE.spawnHeight, z: 0 }, true)
    chassis.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    chassis.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassis.setAngvel({ x: 0, y: 0, z: 0 }, true)
    readChassis()
    prevPos.copy(curPos)
    prevQuat.copy(curQuat)
  }

  // Câmera: "perseguição" (atrás do carro, suave) ou "livre" (órbita com arrasto). C alterna.
  let cameraMode: 'perseguição' | 'livre' = 'perseguição'
  const camPos = new THREE.Vector3()
  const camLook = new THREE.Vector3()
  let camReady = false
  const fwdFlat = new THREE.Vector3()

  const updateCamera = (carPos: THREE.Vector3, carQuat: THREE.Quaternion, dt: number) => {
    const target = carPos.clone().add(new THREE.Vector3(0, 0.8, 0))

    if (cameraMode === 'livre') {
      camera.position.set(
        target.x + Math.sin(yaw) * Math.cos(pitch) * radius,
        target.y + Math.sin(pitch) * radius + 1,
        target.z + Math.cos(yaw) * Math.cos(pitch) * radius,
      )
      camera.lookAt(target)
      camReady = false // ao voltar à perseguição, a câmera começa de onde o carro está
      return
    }

    // Direção de frente do carro, só no plano do chão
    fwdFlat.set(0, 0, 1).applyQuaternion(carQuat)
    fwdFlat.y = 0
    fwdFlat.normalize()

    // Mais longe em alta velocidade; ao acelerar, a câmera fica para trás (atraso inercial)
    const dist = 6 + Math.min(Math.abs(chassisSpeed), 30) * 0.15
    const desired = target
      .clone()
      .addScaledVector(fwdFlat, -dist - longAccel * 0.04)
      .add(new THREE.Vector3(0, 2.4, 0))

    if (!camReady) {
      camPos.copy(desired)
      camLook.copy(target)
      camReady = true
    }
    // Suavização exponencial: independe do FPS
    camPos.lerp(desired, 1 - Math.exp(-4 * dt))
    camLook.lerp(target, 1 - Math.exp(-8 * dt))
    camera.position.copy(camPos)
    camera.lookAt(camLook)
  }

  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === 'r') resetChassis()
    if (k === 'c') cameraMode = cameraMode === 'perseguição' ? 'livre' : 'perseguição'
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
    while (acc >= DT && world && chassis && vehicle) {
      input = keyboard.read()
      if (input.shiftUp) drivetrain.shift(1, chassisSpeed)
      if (input.shiftDown) drivetrain.shift(-1, chassisSpeed)
      if (input.absToggle) absOn = !absOn
      prevPos.copy(curPos)
      prevQuat.copy(curQuat)
      vehicle.update(DT)
      const rearOmega = (vehicle.spin(2) + vehicle.spin(3)) / 2
      engineTorque = drivetrain.update(DT, input.throttle, rearOmega)
      vehicle.applyTires(DT, {
        brake: input.brake,
        handbrake: input.handbrake,
        driveTorque: engineTorque,
        abs: absOn,
        // Direita do carro = +1 para o usuário; o modelo gira para +x (esquerda), então o sinal é invertido em vehicle.ts
        steer: input.steer,
      })
      // Marcas de pneu e poeira, com o contato e o escorregamento deste passo
      if (effects) {
        const wheelFx: WheelFx[] = []
        for (let i = 0; i < 4; i++) {
          const t = vehicle.tire(i)
          wheelFx.push({
            inContact: vehicle.inContact(i),
            point: vehicle.contactPoint(i),
            mu: vehicle.surfaceMu(i),
            slipRatio: t.slipRatio,
            slipAngle: t.slipAngle,
          })
        }
        effects.update(DT, wheelFx, chassisSpeed)
      }
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

    // Rodas: posição dada pela suspensão, no referencial do carro
    if (vehicle) {
      for (let i = 0; i < wheelMeshes.length; i++) {
        const p = vehicle.wheelLocal(i)
        wheelMeshes[i].position.set(p.x, p.y, p.z)
        wheelMeshes[i].rotation.x = wheelAngle[i]
        wheelMeshes[i].rotation.y = vehicle.steerAngle(i)
      }
    }

    updateCamera(renderPos, renderQuat, elapsed)
    // Ajustes visuais (painel F4): sol, exposição e bloom
    sun.intensity = visual.sunIntensity
    const el = THREE.MathUtils.degToRad(visual.sunElevationDeg)
    sun.position.set(Math.cos(el) * 0.83 * 24, Math.sin(el) * 24, Math.cos(el) * 0.55 * 24)
    renderer.toneMappingExposure = visual.exposure
    bloomPass.strength = visual.bloomStrength
    if (visual.bloom) composer.render()
    else renderer.render(scene, camera)

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
        wheels: wheelStats.map((w) => ({ ...w })),
        engine: { rpm: drivetrain.rpm, gear: drivetrain.gearLabel(), torque: engineTorque },
        abs: absOn,
        // Positivo = direita do carro (oposto ao eixo +x do modelo)
        steerDeg: -THREE.MathUtils.radToDeg(vehicle?.steerCenter() ?? 0),
        camera: cameraMode,
        pitchDeg: THREE.MathUtils.radToDeg(pitchRad),
        rollDeg: THREE.MathUtils.radToDeg(rollRad),
      })
    }
  }

  // Carrega o Rapier (WASM) e monta o mundo antes de começar a simulação
  RAPIER.init().then(() => {
    if (disposed) return

    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    world.timestep = DT

    track = buildTrack(scene, world)
    road = buildRoad(scene, world)

    chassis = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, VEHICLE.spawnHeight, 0),
    )
    // densidade = massa / volume da caixa
    const volume = CH.x * 2 * (CH.y * 2) * (CH.z * 2)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(CH.x, CH.y, CH.z).setDensity(VEHICLE.mass / volume),
      chassis,
    )

    vehicle = createVehicle(world, chassis, (h) => track?.muOf(h) ?? 1)
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
    vehicle?.dispose()
    world?.free()
    wheelGeo.dispose()
    track?.dispose()
    road?.dispose()
    effects?.dispose()
    contactGeo.dispose()
    contactTex.dispose()
    pmrem.dispose()
    rimGeo.dispose()
    rimMat.dispose()
    composer.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
