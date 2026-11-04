import type { SandboxState } from '../game/sandbox/Sandbox'
import './tools.css'

/**
 * Canto inferior esquerdo: o que o slot atual faz (mãos, ferramenta) e os
 * atalhos do sandbox. Embaixo da mira: o item criado sob a mira.
 */
export function ToolHud({ sandbox }: { sandbox: SandboxState }) {
  let title = ''
  let hint = ''
  if (sandbox.slot === 'hands') {
    title = sandbox.holding ? (sandbox.holdingNpc ? 'Segurando o NPC' : 'Segurando') : 'Mãos'
    hint = sandbox.holding
      ? 'clique: arremessar · solte o botão direito: largar'
      : 'botão direito: agarrar (segure) · clique: soco'
  } else if (sandbox.slot === 'tool') {
    title = `Ferramenta: ${sandbox.toolName}` + (sandbox.pending ? ' (ponto A marcado)' : '')
    hint = `${sandbox.toolHint} · Tab: próxima`
  }
  return (
    <>
      <div className="tool-hud">
        {title && <div className="tool-title">{title}</div>}
        {hint && <div className="tool-hint">{hint}</div>}
        <div className="tool-keys">
          <kbd>Q</kbd> spawn <kbd>Tab</kbd> ferramentas <kbd>X</kbd> apagar <kbd>E</kbd> pegar arma
        </div>
      </div>
      {sandbox.aimed && (
        <div className="aim-tag">
          {sandbox.aimed.name}
          {sandbox.aimed.pickup && (
            <>
              {' '}
              · <kbd>E</kbd> pegar
            </>
          )}
          {' '}
          · <kbd>X</kbd> apagar
        </div>
      )}
    </>
  )
}
