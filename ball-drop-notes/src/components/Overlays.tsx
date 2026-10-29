import { useEffect, useRef, type ReactNode } from 'react'
import { playUi } from '../audio'
import { Icon, type IconName } from './Icon'
import type { ToastItem } from './ui'

// Janela modal simples: fundo escurecido, foco no primeiro botão, Esc fecha (tratado no App).
function Modal({
  label,
  className = '',
  onClose,
  children,
}: {
  label: string
  className?: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus()
    return () => previous?.focus?.()
  }, [])
  return (
    <div
      className="overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} className={`modal glass ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

const WELCOME_PATHS: { id: 'compose' | 'draw' | 'listen'; icon: IconName; title: string; text: string }[] = [
  {
    id: 'compose',
    icon: 'sparkle',
    title: 'Criar música automática',
    text: 'Escolha um clima, ouça a melodia e gere uma pista pronta.',
  },
  {
    id: 'draw',
    icon: 'pencil',
    title: 'Desenhar livremente',
    text: 'Desenhe blocos com o mouse. Cada bloco é uma nota.',
  },
  {
    id: 'listen',
    icon: 'headphones',
    title: 'Ouvir um exemplo',
    text: 'Uma música conhecida vira pista e a bolinha já sai tocando.',
  },
]

export function Welcome({
  onChoose,
  onClose,
}: {
  onChoose: (path: 'compose' | 'draw' | 'listen') => void
  onClose: () => void
}) {
  return (
    <Modal label="Boas-vindas" className="welcome" onClose={onClose}>
      <div className="welcome-hero" aria-hidden="true">
        <span className="hero-ball" />
        <span className="hero-step hero-step-1" />
        <span className="hero-step hero-step-2" />
        <span className="hero-step hero-step-3" />
      </div>
      <h1 className="welcome-title">Ball Drop Notes</h1>
      <p className="welcome-lead">
        Uma bolinha cai e quica nos blocos. Cada bloco é uma nota, e o caminho vira música. Sem pressa, sem
        pontos: só criar e ouvir.
      </p>
      <div className="welcome-paths">
        {WELCOME_PATHS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`path-card path-${p.id}`}
            data-autofocus={i === 0 ? '' : undefined}
            onClick={() => {
              playUi('success')
              onChoose(p.id)
            }}
          >
            <span className="path-icon">
              <Icon name={p.icon} size={26} />
            </span>
            <span className="path-title">{p.title}</span>
            <span className="path-text">{p.text}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link-btn welcome-skip" onClick={onClose}>
        Só quero explorar
      </button>
    </Modal>
  )
}

const MOUSE_TIPS: [string, string][] = [
  ['Arrastar no vazio', 'cria um bloco'],
  ['Clicar num bloco', 'seleciona (escolha a nota no cartão)'],
  ['Arrastar as alças', 'muda a largura (a duração da nota)'],
  ['Botão direito', 'apaga o bloco'],
  ['Arrastar a bolinha', 'muda o ponto de partida'],
  ['Shift + arrastar a bolinha', 'grava um caminho em blocos'],
  ['Roda do mouse', 'zoom'],
  ['Botão do meio + arrastar', 'move a câmera'],
]

const KEY_TIPS: [string, string][] = [
  ['Espaço', 'tocar / pausar'],
  ['R', 'reiniciar a bolinha'],
  ['.', 'avançar um passo'],
  [',', 'voltar 5 s'],
  ['0', 'enquadrar tudo'],
  ['+ / −', 'zoom'],
  ['Ctrl + Z', 'desfazer'],
  ['Delete', 'apagar o bloco selecionado'],
  ['A S D F G H J K', 'piano: Dó Ré Mi Fá Sol Lá Si Dó'],
  ['W E T Y U', 'piano: sustenidos'],
  ['Z / X', 'piano: oitava abaixo / acima'],
  ['?', 'esta ajuda'],
  ['Esc', 'fechar painéis'],
]

export function HelpOverlay({ onClose, onWelcome }: { onClose: () => void; onWelcome: () => void }) {
  return (
    <Modal label="Ajuda e atalhos" className="help" onClose={onClose}>
      <header className="modal-header">
        <h2>Como brincar</h2>
        <button type="button" className="icon-btn" aria-label="Fechar (Esc)" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="help-grid">
        <section>
          <h3 className="section-title">Mouse e toque</h3>
          <dl className="tips">
            {MOUSE_TIPS.map(([k, v]) => (
              <div key={k} className="tip-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className="section-title">Teclado</h3>
          <dl className="tips">
            {KEY_TIPS.map(([k, v]) => (
              <div key={k} className="tip-row">
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <footer className="modal-footer">
        <button type="button" className="btn" onClick={onWelcome}>
          Ver a tela de boas-vindas
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Entendi
        </button>
      </footer>
    </Modal>
  )
}

// Dica rápida de desenho: não bloqueia o canvas, só o próprio cartão recebe cliques.
export function DrawHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="draw-hint glass" role="note" aria-label="Como desenhar">
      <div className="draw-hint-head">
        <Icon name="pencil" size={18} />
        <strong>Como desenhar</strong>
      </div>
      <ul className="draw-hint-list">
        <li>
          <b>Arraste</b> no vazio para criar um bloco
        </li>
        <li>
          <b>Clique</b> num bloco para escolher a nota
        </li>
        <li>
          <b>Botão direito</b> apaga
        </li>
        <li>
          <b>Arraste a bolinha</b> para mudar a partida; com <b>Shift</b>, grava um caminho
        </li>
        <li>
          Depois, <b>Espaço</b> para soltar a bolinha
        </li>
      </ul>
      <button
        type="button"
        className="btn btn-primary btn-small"
        onClick={() => {
          playUi('click')
          onClose()
        }}
      >
        Bora desenhar
      </button>
    </div>
  )
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={`toast toast--${t.kind}`} onClick={() => onDismiss(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  )
}
