import { useEffect, useReducer, useRef, useState, type PointerEvent } from 'react'
import { brainController, createBrainFor } from '../brain/controller'
import {
  Activity,
  ArrowLeft,
  Check,
  Brain,
  CircleHelp,
  Download,
  Footprints,
  PawPrint,
  Play,
  RotateCcw,
  RotateCw,
  Scissors,
  Shapes,
  Spline,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Canvas, drawMuscle, type Look } from '../render/Canvas'
import { LookToggle } from '../render/LookToggle'
import { drawBody } from '../render/skin'
import { TerrainSelect } from '../render/TerrainSelect'
import type { TerrainKind } from '../physics/ground'
import { Trainer } from '../train/Trainer'
import { createRng } from '../utils/rng'
import { defaultModel } from './defaultModel'
import { ExamplePicker } from './ExamplePicker'
import type { Example } from './examples'
import { Help } from './Help'
import { downloadModel, loadBrain, loadSavedModel, readModelFile, saveModel } from './storage'
import { Mlp } from '../brain/mlp'
import type { World } from '../physics/world'
import type { Vec2 } from '../utils/vec2'
import {
  addJoint,
  addLimb,
  extendLimb,
  addMuscle,
  findRefAt,
  groundYFor,
  refPos,
  type JRef,
  connect,
  emptyModel,
  findJointAt,
  findLimbPointAt,
  findLimbSegmentAt,
  footRefs,
  toggleFoot,
  rotateLimb,
  type LimbPointHit,
  MIN_SEGMENT,
  splitLimb,
  toWorld,
  type Body,
  type Model,
} from './model'

type Mode = 'torso' | 'limb' | 'split' | 'rotate' | 'muscle' | 'foot'
// Membro em desenho: a junta de origem no torso e os pontos já colocados.
// Com `extendLimb`, os pontos continuam a partir da ponta desse membro, em vez de criar um novo.
type Draft = { anchor: number; points: Vec2[]; extendLimb?: number }

// Estado do editor. Fica numa ref para que vários eventos de ponteiro seguidos leiam sempre o valor mais novo.
type Store = {
  model: Model
  history: Model[]
  selected: number | null
  draft: Draft | null
  // Torso: ponto final provisório do arrasto, desenhado a partir da junta inicial.
  preview: { from: number; to: Vec2 } | null
  // Músculo: primeira junta escolhida (a segunda cria o músculo).
  muscleFrom: JRef | null
}

// Gesto em andamento: do pressionar ao soltar o ponteiro.
type Gesture = {
  x0: number
  y0: number
  moved: boolean
  // Torso: última junta criada no arrasto (a próxima se liga a ela).
  chainId: number | null
  // Torso: junta existente em que o gesto começou (clique liga com a selecionada).
  hitId: number | null
  // Membro: o arrasto começou na junta de origem (o membro é um único osso até o ponteiro).
  dragging: boolean
  // Rotacionar: junta de membro agarrada, modelo de antes do gesto e ângulo inicial do ponteiro.
  rotate: { hit: LimbPointHit; base: Model; startAngle: number } | null
}

// Teclas 1–6: ferramentas na ordem da barra.
const MODE_KEYS: Record<string, Mode> = { '1': 'torso', '2': 'limb', '3': 'split', '4': 'rotate', '5': 'muscle', '6': 'foot' }

// Altura típica do chão nas coordenadas do modelo (os exemplos ficam em pé por volta daqui).
const EDITOR_GROUND = 320

// Distância mínima para considerar que o ponteiro arrastou (e não só clicou).
const DRAG_THRESHOLD = 4

// Editor da criatura. Modo Torso: juntas e ossos. Modo Membro: membros presos ao torso. Modo Subdividir: divide segmentos.
export function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Abre a última criatura salva neste navegador, ou o exemplo.
  const store = useRef<Store>({ model: loadSavedModel() ?? defaultModel, history: [], selected: null, draft: null, preview: null, muscleFrom: null })
  const fileInput = useRef<HTMLInputElement>(null)
  // Deslocamento vertical da vista do editor (tela = modelo + viewY), recalculado a cada desenho.
  const viewY = useRef(0)
  const gesture = useRef<Gesture | null>(null)
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [mode, setMode] = useState<Mode>('torso')
  // Simulação aberta; `trained` é a geração do cérebro treinado em uso (null = cérebro aleatório).
  const [sim, setSim] = useState<{ world: World; body: Body; trained: number | null } | null>(null)
  const [look, setLook] = useState<Look>('skin')
  const [terrain, setTerrain] = useState<TerrainKind>('flat')
  // Muda quando o canvas do editor muda de tamanho, para redesenhar na resolução certa.
  const [canvasSize, setCanvasSize] = useState(0)
  const [training, setTraining] = useState<{ model: Model; groundY: number } | null>(null)
  // Valores aplicados aos próximos músculos criados.
  const [strength, setStrength] = useState(0.5)
  const [contraction, setContraction] = useState(0.3)
  const [showHelp, setShowHelp] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const { model, history, selected, draft, preview, muscleFrom } = store.current

  const set = (patch: Partial<Store>) => {
    Object.assign(store.current, patch)
    rerender()
  }

  // Troca o modelo guardando o anterior para desfazer.
  const apply = (next: Model, patch: Partial<Store> = {}) => {
    const s = store.current
    if (next === s.model) return set(patch)
    set({ ...patch, model: next, history: [...s.history, s.model] })
  }

  const undo = () => {
    const s = store.current
    if (s.history.length === 0) return
    set({ model: s.history[s.history.length - 1], history: s.history.slice(0, -1), selected: null, draft: null, preview: null, muscleFrom: null })
  }

  const clear = () => apply(emptyModel, { selected: null, draft: null, muscleFrom: null })
  const [showExamples, setShowExamples] = useState(false)
  const loadExample = (example: Example) => {
    apply(example.model, { selected: null, draft: null, muscleFrom: null })
    setShowExamples(false)
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      apply(await readModelFile(file), { selected: null, draft: null, muscleFrom: null })
      setImportError(null)
    } catch (err) {
      setImportError(`Não foi possível importar: ${err instanceof Error ? err.message : 'arquivo inválido'}`)
    }
  }

  // Salva a criatura a cada mudança, para reabrir a página onde parou.
  useEffect(() => saveModel(model), [model])

  const switchMode = (next: Mode) => {
    setMode(next)
    set({ selected: null, draft: null, muscleFrom: null })
  }

  const cancelDraft = () => set({ draft: null, muscleFrom: null })

  const finishLimb = () => {
    const s = store.current
    if (!s.draft || s.draft.points.length === 0) return
    const { anchor, points, extendLimb: limbId } = s.draft
    apply(limbId === undefined ? addLimb(s.model, anchor, points) : extendLimb(s.model, limbId, points), { draft: null })
  }

  // Atalhos: Esc cancela o membro em desenho, Ctrl+Z desfaz, 1–5 trocam a ferramenta, S simula, T treina.
  // Ficam numa ref para o listener (registrado uma vez) sempre chamar as versões atuais das funções.
  const shortcuts = useRef<(e: KeyboardEvent) => void>(() => {})
  shortcuts.current = (e) => {
    const target = e.target as HTMLElement
    if (target.closest('input, select, textarea')) return
    if (e.key === 'Escape') return cancelDraft()
    if (sim || training) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      return undo()
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const tool = MODE_KEYS[e.key]
    if (tool) {
      // Mesmas regras dos botões: Subdividir/Rotacionar pedem membros; Músculo pede 2 juntas.
      const enabled =
        tool === 'muscle' ? model.joints.length >= 2 : tool === 'foot' ? model.joints.length > 0 : tool === 'torso' || tool === 'limb' || model.limbs.length > 0
      if (enabled) switchMode(tool)
    } else if (e.key.toLowerCase() === 's' && model.joints.length > 0) simulate()
    else if (e.key.toLowerCase() === 't' && model.muscles.length > 0) setTraining({ model, groundY: groundYFor(model) })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => shortcuts.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pointerPos = (e: PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top - viewY.current }
  }

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointerPos(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = store.current
    const g: Gesture = { x0: p.x, y0: p.y, moved: false, chainId: null, hitId: null, dragging: false, rotate: null }
    gesture.current = g

    if (mode === 'torso') {
      const hit = findJointAt(s.model, p.x, p.y)
      if (hit) {
        g.hitId = hit.id
        g.chainId = hit.id
        return
      }
      // Nova junta já sai ligada à selecionada, para facilitar desenhar uma cadeia.
      const added = addJoint(s.model, p.x, p.y)
      apply(s.selected !== null ? connect(added.model, s.selected, added.id) : added.model, { selected: added.id })
      g.chainId = added.id
      return
    }

    if (mode === 'foot') {
      const ref = findRefAt(s.model, p.x, p.y)
      if (ref) apply(toggleFoot(s.model, ref))
      return
    }

    if (mode === 'muscle') {
      const ref = findRefAt(s.model, p.x, p.y)
      if (!ref) return
      if (!s.muscleFrom) set({ muscleFrom: ref })
      else apply(addMuscle(s.model, s.muscleFrom, ref, strength, contraction), { muscleFrom: null })
      return
    }

    if (mode === 'rotate') {
      const hit = findLimbPointAt(s.model, p.x, p.y)
      if (hit) g.rotate = { hit, base: s.model, startAngle: Math.atan2(p.y - hit.pivot.y, p.x - hit.pivot.x) }
      return
    }

    if (mode === 'limb') {
      // Sem membro em desenho: a junta do torso sob o ponteiro vira a origem do arrasto.
      if (!s.draft) {
        // Pressionar na ponta de um membro continua o desenho a partir dela.
        const tip = findLimbPointAt(s.model, p.x, p.y)
        const limb = tip && s.model.limbs.find((l) => l.id === tip.limbId)
        if (tip && limb && tip.index === limb.points.length - 1) {
          set({ draft: { anchor: limb.anchor, points: [], extendLimb: limb.id } })
          g.dragging = true
          return
        }
        const anchor = findJointAt(s.model, p.x, p.y)
        if (anchor) {
          set({ draft: { anchor: anchor.id, points: [] } })
          g.dragging = true
        }
        return
      }
      // Com membro em desenho: cada pressionar adiciona um ponto.
      set({ draft: { ...s.draft, points: [...s.draft.points, p] } })
    }
  }

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current
    if (!g) return
    const p = pointerPos(e)
    if (!g.moved && Math.hypot(p.x - g.x0, p.y - g.y0) > DRAG_THRESHOLD) g.moved = true
    if (!g.moved) return

    // Arrastar desenha um único osso do ponto inicial ao ponteiro (só mostra a prévia; cria ao soltar).
    const s = store.current
    if (mode === 'rotate' && g.rotate) {
      // Rotação ao vivo; o histórico só recebe uma entrada ao soltar.
      const { hit, base, startAngle } = g.rotate
      set({ model: rotateLimb(base, hit, Math.atan2(p.y - hit.pivot.y, p.x - hit.pivot.x) - startAngle) })
      return
    }
    if (mode === 'torso' && g.chainId !== null) {
      set({ preview: { from: g.chainId, to: p } })
    } else if (mode === 'limb' && s.draft && g.dragging) {
      set({ draft: { ...s.draft, points: [p] } })
    }
  }

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    const s = store.current

    if (mode === 'rotate') {
      if (g.rotate && s.model !== g.rotate.base) set({ history: [...s.history, g.rotate.base] })
      return
    }

    if (mode === 'torso') {
      // Arrastou: cria a junta final e liga ao ponto inicial com um único osso.
      if (g.moved && g.chainId !== null) {
        const p = pointerPos(e)
        const end = findJointAt(s.model, p.x, p.y)
        if (end) {
          apply(connect(s.model, g.chainId, end.id), { selected: end.id, preview: null })
        } else {
          const added = addJoint(s.model, p.x, p.y)
          apply(connect(added.model, g.chainId, added.id), { selected: added.id, preview: null })
        }
        return
      }
      // Clique numa junta existente liga com a selecionada e a seleciona.
      if (!g.moved && g.hitId !== null) {
        apply(s.selected !== null ? connect(s.model, s.selected, g.hitId) : s.model, { selected: g.hitId })
      }
      if (s.preview) set({ preview: null })
    } else if (mode === 'split') {
      if (!g.moved) {
        const p = pointerPos(e)
        const segment = findLimbSegmentAt(s.model, p.x, p.y)
        if (segment) apply(splitLimb(s.model, segment))
      }
    } else if (g.moved && g.dragging) {
      // Arrastar para desenhar: soltar o ponteiro conclui o membro.
      finishLimb()
    }
  }

  const simulate = () => {
    const { world, body } = toWorld(model, groundYFor(model), terrain)
    // Usa o cérebro treinado desta criatura neste terreno, se houver; senão, um aleatório.
    const saved = loadBrain(model, terrain)
    const random = createBrainFor(world, createRng(Date.now()))
    const trained = saved && saved.weights.length === random.weights.length ? saved : null
    world.controller = brainController(trained ? new Mlp(random.inputs, random.hidden, random.outputs, trained.weights) : random)
    setSim({ world, body, trained: trained?.generation ?? null })
  }

  useEffect(() => {
    if (sim || training) return
    const observer = new ResizeObserver(() => setCanvasSize((n) => n + 1))
    observer.observe(canvasRef.current!)
    return () => observer.disconnect()
  }, [sim, training])

  // Desenha torso, membros (atrás e na frente) e o membro em desenho.
  useEffect(() => {
    if (sim || training) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * dpr
    canvas.height = canvas.clientHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    // A vista põe a altura típica do chão (y = EDITOR_GROUND) a 80% da altura, para a criatura caber em telas baixas.
    viewY.current = Math.round(canvas.clientHeight * 0.8 - EDITOR_GROUND)
    ctx.translate(0, viewY.current)

    const jointPos = (id: number) => model.joints.find((j) => j.id === id)!

    // Onde o chão vai ficar ao simular (logo abaixo do ponto mais baixo).
    if (model.joints.length > 0) {
      const gy = groundYFor(model)
      ctx.strokeStyle = 'rgba(138, 127, 106, 0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(canvas.clientWidth, gy)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Prévia da pele, bem apagada, por baixo do esqueleto.
    if (model.joints.length > 0) {
      ctx.save()
      ctx.globalAlpha = 0.22
      drawBody(ctx, toWorld(model, groundYFor(model)).body, 1)
      ctx.restore()
    }

    ctx.strokeStyle = '#2b6cb0'
    ctx.lineWidth = 3
    for (const bone of model.bones) {
      const a = jointPos(bone.a)
      const b = jointPos(bone.b)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Membros: o exemplar de trás primeiro, mais claro; o da frente por cima.
    const strokeLimb = (start: Vec2, points: Vec2[], color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      for (const p of points) ctx.lineTo(p.x, p.y)
      ctx.stroke()
      ctx.fillStyle = color
      for (const p of points) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Músculos como fusos, mais grossos quanto maior a força.
    for (const m of model.muscles) {
      const a = refPos(model, m.a)
      const b = refPos(model, m.b)
      if (a && b) drawMuscle(ctx, a, b, m.strength, 0)
    }
    for (const limb of model.limbs) {
      const start = jointPos(limb.anchor)
      strokeLimb(start, limb.points, 'rgba(128, 90, 213, 0.35)', 6)
      strokeLimb(start, limb.points, '#6b46c1', 3)
    }

    if (preview) {
      const from = jointPos(preview.from)
      ctx.strokeStyle = '#dd6b20'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(preview.to.x, preview.to.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (draft) {
      const tipOf = draft.extendLimb === undefined ? undefined : model.limbs.find((l) => l.id === draft.extendLimb)?.points.at(-1)
      strokeLimb(tipOf ?? jointPos(draft.anchor), draft.points, '#dd6b20', 2)
    }

    const from = muscleFrom && refPos(model, muscleFrom)
    if (from) {
      ctx.strokeStyle = '#dd6b20'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(from.x, from.y, 9, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Pés: anel verde nas juntas que podem tocar o chão.
    ctx.strokeStyle = '#2f9e44'
    ctx.lineWidth = 2.5
    for (const ref of footRefs(model)) {
      const p = refPos(model, ref)
      if (!p) continue
      ctx.beginPath()
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (const j of model.joints) {
      ctx.beginPath()
      ctx.arc(j.x, j.y, j.id === selected ? 8 : 5, 0, Math.PI * 2)
      ctx.fillStyle = j.id === selected ? '#dd6b20' : '#c53030'
      ctx.fill()
    }
  }, [model, selected, draft, preview, muscleFrom, sim, training, canvasSize])

  const jointCount = model.joints.length
  const hint =
    mode === 'torso'
      ? `Clique ou arraste para criar juntas (arrastar cria uma cadeia). Clique numa junta para ligar com a selecionada. Juntas: ${jointCount}, ossos: ${model.bones.length}`
      : mode === 'foot'
        ? `Clique numa junta para marcar ou desmarcar como pé (anel verde). Só os pés podem tocar o chão: qualquer outra parte encostando conta como queda no treino. Pés: ${footRefs(model).length}`
      : mode === 'muscle'
        ? `Clique em duas juntas (torso ou membro) para ligar com um músculo, espelhado nos dois lados. Músculos: ${model.muscles.length}${muscleFrom ? ' — escolha a segunda junta' : ''}`
        : mode === 'rotate'
        ? 'Arraste uma junta de membro para girá-la (e as partes seguintes) em torno da junta anterior. Define o lado para onde o membro dobra.'
        : mode === 'split'
        ? `Clique num segmento de membro para inserir uma junta (vale para os dois lados). Ossos mínimos: ${MIN_SEGMENT} px`
        : draft
          ? `Arraste para desenhar o membro e solte para concluir (ou clique para adicionar pontos). Esc cancela. Pontos: ${draft.points.length}`
          : `Clique numa junta do torso e arraste para desenhar um membro; arraste de novo a partir da ponta para continuar. Membros: ${model.limbs.length} (espelhados atrás e na frente)`

  if (training) return <Trainer model={training.model} groundY={training.groundY} terrain={terrain} look={look} onLookChange={setLook} onBack={() => setTraining(null)} />

  return (
    <section className="editor">
      <div className="my-2 flex flex-wrap items-center gap-2">
        {sim ? (
          <>
            <Button variant="secondary" onClick={() => setSim(null)}>
              <ArrowLeft /> Voltar ao editor
            </Button>
            <LookToggle look={look} onChange={setLook} />
            <Button variant="outline" onClick={simulate} title="Recomeça a simulação">
              <RotateCcw /> Repetir
            </Button>
            <span className="text-sm text-muted-foreground">
              {sim.trained !== null
                ? `Cérebro treinado (geração ${sim.trained})`
                : 'Cérebro aleatório: use Treinar para a criatura aprender a andar'}
            </span>
          </>
        ) : (
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              value={mode}
              onValueChange={(v) => v && switchMode(v as Mode)}
            >
              <ToggleGroupItem value="torso" aria-label="Torso">
                <Shapes /> Torso
              </ToggleGroupItem>
              <ToggleGroupItem value="limb" aria-label="Membro">
                <Spline /> Membro
              </ToggleGroupItem>
              <ToggleGroupItem value="split" aria-label="Subdividir" disabled={model.limbs.length === 0}>
                <Scissors /> Subdividir
              </ToggleGroupItem>
              <ToggleGroupItem value="rotate" aria-label="Rotacionar" disabled={model.limbs.length === 0}>
                <RotateCw /> Rotacionar
              </ToggleGroupItem>
              <ToggleGroupItem value="muscle" aria-label="Músculo" disabled={jointCount < 2}>
                <Activity /> Músculo
              </ToggleGroupItem>
              <ToggleGroupItem value="foot" aria-label="Pé" disabled={jointCount === 0}>
                <Footprints /> Pé
              </ToggleGroupItem>
            </ToggleGroup>
            {mode === 'muscle' && (
              <>
                <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />
                <label className="flex w-40 items-center gap-2 text-xs">
                  Força {strength.toFixed(2)}
                  <Slider min={0.1} max={1} step={0.05} value={[strength]} onValueChange={([v]) => setStrength(v)} />
                </label>
                <label className="flex w-44 items-center gap-2 text-xs">
                  Contração {contraction.toFixed(2)}
                  <Slider min={0.05} max={0.6} step={0.05} value={[contraction]} onValueChange={([v]) => setContraction(v)} />
                </label>
              </>
            )}
            {mode === 'limb' && draft && (
              <>
                <Button variant="outline" onClick={finishLimb} disabled={draft.points.length === 0}>
                  <Check /> Concluir membro
                </Button>
                <Button variant="outline" onClick={cancelDraft}>
                  <X /> Cancelar
                </Button>
              </>
            )}
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />
            <TerrainSelect value={terrain} onChange={setTerrain} />
            <Button onClick={simulate} disabled={jointCount === 0}>
              <Play /> Simular
            </Button>
            <Button
              variant="outline"
              onClick={() => setTraining({ model, groundY: groundYFor(model) })}
              disabled={model.muscles.length === 0}
            >
              <Brain /> Treinar
            </Button>
            <Button variant="outline" onClick={undo} disabled={history.length === 0}>
              <Undo2 /> Desfazer
            </Button>
            <Button variant="outline" onClick={clear} disabled={jointCount === 0}>
              <Trash2 /> Limpar
            </Button>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />
            <Button
              variant={showExamples ? 'secondary' : 'ghost'}
              onClick={() => setShowExamples(!showExamples)}
              title="Abre uma criatura pronta (dá para desfazer)"
            >
              <PawPrint /> Exemplos
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => downloadModel(model)}
              disabled={jointCount === 0}
              title="Exportar: baixa a criatura como JSON"
              aria-label="Exportar"
            >
              <Download />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => fileInput.current?.click()} title="Importar: abre uma criatura salva em JSON" aria-label="Importar">
              <Upload />
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void importFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button variant={showHelp ? 'secondary' : 'ghost'} size="icon" onClick={() => setShowHelp(!showHelp)} title="Ajuda" aria-label="Ajuda">
              <CircleHelp />
            </Button>
          </>
        )}
      </div>
      {!sim && showExamples && <ExamplePicker onPick={loadExample} onClose={() => setShowExamples(false)} />}
      {!sim && showHelp && <Help onClose={() => setShowHelp(false)} />}
      {!sim && importError && <p className="mb-2 text-sm text-destructive">{importError}</p>}
      {!sim && <p className="mb-2 text-sm text-muted-foreground">{hint}</p>}

      {sim ? (
        <Canvas world={sim.world} body={sim.body} look={look} />
      ) : (
        <canvas
          ref={canvasRef}
          className="stage"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
    </section>
  )
}
