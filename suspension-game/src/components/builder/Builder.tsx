import { useEffect, useRef, useState } from 'react'
import {
  attachPoint,
  carStats,
  descendantsOf,
  duplicatePart,
  lowestPoint,
  mirrorPart,
  mountsFor,
  nearestMount,
  newId,
  positionForMount,
  removePart,
  rotatePart,
  setPartAngle,
  staticPoses,
} from '../../game/car'
import { getChassis } from '../../game/catalog/chassis'
import { closestOnOutline, dist, rad, signedArea, simplify } from '../../game/geometry'
import { designToHash } from '../../game/storage'
import type { CarDesign, Part, PartKind, Vec } from '../../game/types'
import { CarView } from '../parts/CarView'
import { PartShape } from '../parts/PartShape'
import { Inspector } from './Inspector'
import { Palette } from './Palette'
import { Hand, Pencil } from 'lucide-react'

const GRID = 0.1
const SNAP_DIST = 0.35
const VIEW = { x: -4.5, y: -2.6, w: 9, h: 5.8 }
const ROT_STEP = rad(15)

type Template = Pick<Part, 'kind' | 'typeId' | 'angle'>

type Drag =
  | { mode: 'new'; template: Template }
  | { mode: 'move'; part: Part; grab: Vec; group: Part[] }

interface Props {
  design: CarDesign
  onChange: (d: CarDesign) => void
  onUndo: () => void
  onRedo: () => void
}

const roundGrid = (v: number) => Math.round(v / GRID) * GRID
const isTyping = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, select, textarea')

export function Builder({ design, onChange, onUndo, onRedo }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pointer, setPointer] = useState<Vec | null>(null) // metros; null = fora da área
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const [stroke, setStroke] = useState<Vec[] | null>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  const selected = design.parts.find((p) => p.id === selectedId) ?? null

  /** Tela -> metros. Retorna null fora do SVG (a não ser que `clamp`). */
  const toWorld = (clientX: number, clientY: number, clamp = false): Vec | null => {
    const svg = svgRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    if (!clamp && (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom)) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }

  const movingIds = drag?.mode === 'move' ? drag.group.map((p) => p.id) : []
  const template: Template | null = drag ? (drag.mode === 'new' ? drag.template : drag.part) : null

  /** Encaixa o ponto de fixação da peça num mount (ou na grade) e devolve a posição final. */
  const place = (t: Template, raw: Vec) => {
    const others: CarDesign = { ...design, parts: design.parts.filter((p) => !movingIds.includes(p.id)) }
    const ap = attachPoint({ ...t, id: '', x: raw.x, y: raw.y })
    let m = t.kind === 'block' ? null : nearestMount(mountsFor(others, t.kind), ap, SNAP_DIST)
    if (!m && t.kind === 'flag') {
      // bandeira gruda na borda do chassi
      const edge = closestOnOutline(getChassis(design).outline, ap)
      if (edge.dist < SNAP_DIST) m = { pos: edge.point, attachment: { kind: 'chassis' } }
    }
    const target = m ? m.pos : { x: roundGrid(ap.x), y: roundGrid(ap.y) }
    return { pos: positionForMount(t, target), mount: m }
  }

  const rawFor = (d: Drag, w: Vec) => (d.mode === 'move' ? { x: w.x - d.grab.x, y: w.y - d.grab.y } : positionForMount(d.template, w))
  const target = drag && pointer ? place(template!, rawFor(drag, pointer)) : null
  const candidateMounts =
    template && template.kind !== 'block'
      ? mountsFor({ ...design, parts: design.parts.filter((p) => !movingIds.includes(p.id)) }, template.kind)
      : []

  const commit = (w: Vec | null) => {
    if (!drag) return
    if (drag.mode === 'new') {
      if (!w) return
      const { pos } = place(drag.template, rawFor(drag, w))
      const part: Part = { id: newId(), ...drag.template, x: pos.x, y: pos.y }
      onChange({ ...design, parts: [...design.parts, part] })
      setSelectedId(part.id)
      return
    }
    if (!w) {
      onChange(removePart(design, drag.part.id)) // soltou fora = remove
      setSelectedId(null)
      return
    }
    const { pos } = place(drag.part, rawFor(drag, w))
    const dx = pos.x - drag.part.x
    const dy = pos.y - drag.part.y
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return
    onChange(moveGroup(design, movingIds, dx, dy))
  }

  // listeners globais enquanto arrasta / desenha
  useEffect(() => {
    if (!drag && !stroke) return
    const move = (e: PointerEvent) => {
      if (stroke) {
        const w = toWorld(e.clientX, e.clientY, true)!
        setStroke((s) => (s && dist(s[s.length - 1], w) > 0.03 ? [...s, w] : s))
      } else setPointer(toWorld(e.clientX, e.clientY))
    }
    const up = (e: PointerEvent) => {
      if (stroke) finishStroke(stroke)
      else commit(toWorld(e.clientX, e.clientY))
      setDrag(null)
      setPointer(null)
      setStroke(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  })

  const finishStroke = (pts: Vec[]) => {
    const outline = simplify(pts, 0.04).map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }))
    if (outline.length >= 3 && Math.abs(signedArea(outline)) > 0.15) {
      onChange({ ...design, chassisId: 'custom', customChassis: outline })
      setDrawMode(false)
    }
  }

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) onRedo()
        else onUndo()
        return
      }
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        onRedo()
        return
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setDrawMode(false)
      }
      if (!selected) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onChange(removePart(design, selected.id))
        setSelectedId(null)
      } else if (ctrl && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicate()
      } else if (e.key === 'q' || e.key === 'Q') onChange(rotatePart(design, selected.id, -ROT_STEP))
      else if (e.key === 'e' || e.key === 'E') onChange(rotatePart(design, selected.id, ROT_STEP))
      else if (e.key === 'm' || e.key === 'M') onChange(mirrorPart(design, selected.id))
      else if ((e.key === 't' || e.key === 'T') && selected.kind === 'wheel') updatePart(selected.id, { driven: selected.driven === false ? undefined : false })
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        const d = { ArrowLeft: [-GRID, 0], ArrowRight: [GRID, 0], ArrowUp: [0, -GRID], ArrowDown: [0, GRID] }[e.key]
        if (d) onChange(moveGroup(design, [selected.id, ...descendantsOf(design, selected.id).map((p) => p.id)], d[0], d[1]))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const updatePart = (id: string, patch: Partial<Part>) =>
    onChange({ ...design, parts: design.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })

  const duplicate = () => {
    if (!selected) return
    const r = duplicatePart(design, selected.id)
    onChange(r.design)
    if (r.newId) setSelectedId(r.newId)
  }

  const startNew = (kind: PartKind, typeId: string, e: React.PointerEvent) => {
    e.preventDefault()
    setDrawMode(false)
    setDrag({ mode: 'new', template: { kind, typeId, angle: 0 } })
    setPointer(toWorld(e.clientX, e.clientY))
  }

  const startMove = (part: Part, e: React.PointerEvent) => {
    if (e.button !== 0 || drawMode) return
    e.stopPropagation()
    e.preventDefault()
    const w = toWorld(e.clientX, e.clientY)
    if (!w) return
    setSelectedId(part.id)
    setDrag({ mode: 'move', part, grab: { x: w.x - part.x, y: w.y - part.y }, group: [part, ...descendantsOf(design, part.id)] })
    setPointer(w)
  }

  const onBackgroundDown = (e: React.PointerEvent) => {
    setSelectedId(null)
    if (drawMode && e.button === 0) {
      const w = toWorld(e.clientX, e.clientY)
      if (w) setStroke([w])
    }
  }

  const share = async () => {
    const url = `${location.origin}${location.pathname}#${designToHash(design)}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copiado!')
    } catch {
      window.prompt('Copie o link:', url)
    }
    setTimeout(() => setShareMsg(null), 2500)
  }

  // fantasmas durante o arraste
  const ghosts: { t: Template; pos: Vec }[] = []
  if (drag && target) {
    if (drag.mode === 'new') ghosts.push({ t: drag.template, pos: target.pos })
    else {
      const dx = target.pos.x - drag.part.x
      const dy = target.pos.y - drag.part.y
      for (const p of drag.group) ghosts.push({ t: p, pos: { x: p.x + dx, y: p.y + dy } })
    }
  }

  const com = carStats(design).centerOfMass
  const floorY = lowestPoint(design) + 0.02

  return (
    <div className="g-builder">
      <Palette
        chassisId={design.chassisId}
        onChassis={(id) => {
          setDrawMode(false)
          onChange({ ...design, chassisId: id })
        }}
        onDrawChassis={() => {
          setSelectedId(null)
          setDrawMode(true)
        }}
        onStartDrag={startNew}
      />
      <div className="g-bench">
        <svg
          ref={svgRef}
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          className={drawMode ? 'drawing' : undefined}
          onPointerDown={onBackgroundDown}
          onContextMenu={(e) => {
            e.preventDefault()
            if (selected) {
              onChange(removePart(design, selected.id))
              setSelectedId(null)
            }
          }}
        >
          <defs>
            <pattern id="gridMinor" width={0.1} height={0.1} patternUnits="userSpaceOnUse">
              <path d="M0.1 0H0V0.1" fill="none" stroke="#ffffff07" strokeWidth={0.006} />
            </pattern>
            <pattern id="grid" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
              <rect width={0.5} height={0.5} fill="url(#gridMinor)" />
              <path d="M0.5 0H0V0.5" fill="none" stroke="#ffffff14" strokeWidth={0.01} />
            </pattern>
            <radialGradient id="spot" cx="0.5" cy="0.42" r="0.6">
              <stop offset="0" stopColor="#ffffff12" />
              <stop offset="1" stopColor="#ffffff00" />
            </radialGradient>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#00000066" />
              <stop offset="0.1" stopColor="#0000" />
            </linearGradient>
            <radialGradient id="shadow">
              <stop offset="0" stopColor="#000a" />
              <stop offset="1" stopColor="#0000" />
            </radialGradient>
          </defs>
          {/* grade bem maior que a vista: cobre a área toda em qualquer proporção de tela */}
          <rect x={-40} y={-30} width={80} height={60} fill="url(#grid)" />
          <rect x={-40} y={-30} width={80} height={60} fill="url(#spot)" />
          <line x1={-40} x2={40} y1={0} y2={0} stroke="#ffffff1c" strokeWidth={0.012} strokeDasharray="0.1 0.06" />
          <line y1={-30} y2={30} x1={0} x2={0} stroke="#ffffff1c" strokeWidth={0.012} strokeDasharray="0.1 0.06" />
          {/* chão da oficina, logo abaixo do ponto mais baixo do carro */}
          <rect x={-40} y={floorY} width={80} height={30} fill="url(#floor)" />
          <line x1={-40} x2={40} y1={floorY} y2={floorY} stroke="#ff6b3d66" strokeWidth={0.02} />
          <ellipse cx={com.x} cy={floorY} rx={2.4} ry={0.16} fill="url(#shadow)" />

          <g opacity={drawMode ? 0.35 : 1}>
            <CarView design={design} poses={staticPoses(design)} onPartPointerDown={startMove} selectedId={selectedId} hiddenIds={movingIds} />
          </g>

          {/* centro de massa */}
          <g transform={`translate(${com.x} ${com.y})`} pointerEvents="none" className="com">
            <circle r={0.09} fill="#fff" stroke="#000" strokeWidth={0.02} />
            <path d="M0 -0.09A0.09 0.09 0 0 1 0.09 0H0ZM0 0.09A0.09 0.09 0 0 1 -0.09 0H0Z" fill="#000" />
          </g>

          {/* pontos de encaixe disponíveis */}
          <g pointerEvents="none">
            {candidateMounts.map((m, i) => (
              <circle key={i} cx={m.pos.x} cy={m.pos.y} r={0.07} fill="#5f54" stroke="#5f5" strokeWidth={0.015} strokeDasharray="0.03 0.03" />
            ))}
          </g>

          <g opacity={0.6} pointerEvents="none">
            {ghosts.map((g, i) => (
              <g key={i} transform={`translate(${g.pos.x} ${g.pos.y})`}>
                <PartShape kind={g.t.kind} typeId={g.t.typeId} angle={g.t.angle} />
              </g>
            ))}
          </g>
          {target?.mount && <circle cx={target.mount.pos.x} cy={target.mount.pos.y} r={0.13} fill="none" stroke="#5f5" strokeWidth={0.035} pointerEvents="none" />}

          {stroke && (
            <polyline points={stroke.map((p) => `${p.x},${p.y}`).join(' ')} fill="#c45ad655" stroke="#e08af0" strokeWidth={0.03} pointerEvents="none" />
          )}
        </svg>
        {drawMode && (
          <div className="g-banner">
            <span className="g-banner-icon">
              <Pencil size={16} />
            </span>
            <span>
              <b>Desenhe o contorno do chassi</b>
              <small>Clique e arraste; o desenho fecha sozinho. Esc cancela.</small>
            </span>
          </div>
        )}
        <div className="g-legend">
          <span>
            <span className="com-dot" /> centro de massa
          </span>
          <span>
            <span className="mount-dot" /> encaixe
          </span>
        </div>
        <div className="g-hints">
          <span>
            <Hand size={13} /> arraste peças
          </span>
          <span>
            <kbd>Q</kbd>
            <kbd>E</kbd> girar
          </span>
          <span>
            <kbd>Del</kbd> remover
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>D</kbd> duplicar
          </span>
          <span>
            <kbd>M</kbd> espelhar
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>Z</kbd> desfazer
          </span>
        </div>
      </div>
      <Inspector
        design={design}
        selected={selected}
        onChange={onChange}
        onUpdatePart={updatePart}
        onAngle={(id, a) => onChange(setPartAngle(design, id, a))}
        onDuplicate={duplicate}
        onMirror={() => selected && onChange(mirrorPart(design, selected.id))}
        onRemove={() => {
          if (!selected) return
          onChange(removePart(design, selected.id))
          setSelectedId(null)
        }}
        onShare={share}
        shareMsg={shareMsg}
      />
    </div>
  )
}

function moveGroup(design: CarDesign, ids: string[], dx: number, dy: number): CarDesign {
  return { ...design, parts: design.parts.map((p) => (ids.includes(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p)) }
}
