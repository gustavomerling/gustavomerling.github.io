import { Plus, Copy, Trash2, Receipt, Minus, LogOut, Eraser } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { calculatePrice, formatBRL } from '../utils/pricing'
import './Sidebar.css'

function Sidebar({
  frames,
  selectedFrameId,
  onAddFrame,
  onSelectFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onUpdateQuantity,
  onFinalize,
  onClearAll,
  onLogout,
}) {
  const estimatedTotal = frames.reduce((sum, frame) => sum + calculatePrice(frame).totalPrice, 0)

  const handleClearAll = () => {
    if (frames.length === 0) return
    if (window.confirm('Tem certeza que deseja limpar toda a simulação? Todos os quadros serão apagados.')) {
      onClearAll()
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logoUrl} alt="Logo" className="sidebar-logo" />
        <button className="btn-logout" title="Sair" onClick={onLogout}>
          <LogOut size={16} />
        </button>
      </div>

      <button className="btn-add-frame" onClick={onAddFrame}>
        <Plus size={16} /> Adicionar Quadro
      </button>

      <div className="frames-list">
        {frames.map((frame, idx) => (
          <div
            key={frame.id}
            className={`frame-item ${selectedFrameId === frame.id ? 'active' : ''}`}
            onClick={() => onSelectFrame(frame.id)}
          >
            <div className="frame-item-title">{frame.name || `Quadro ${idx + 1}`}</div>

            <div className="frame-item-footer">
              <div className="frame-item-meta">{frame.size}</div>

              <div className="qty-stepper" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(frame.id, Math.max(1, frame.quantity - 1))}
                >
                  <Minus size={12} />
                </button>
                <span>{frame.quantity}</span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(frame.id, Math.min(100, frame.quantity + 1))}
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="frame-item-actions">
                <button
                  className="btn-duplicate"
                  title="Duplicar quadro"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicateFrame(frame.id)
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  className="btn-delete"
                  title="Excluir quadro"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteFrame(frame.id)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {frames.length > 0 && (
        <>
          <div className="estimated-total">
            <span>Total estimado</span>
            <strong>R$ {formatBRL(estimatedTotal)}</strong>
          </div>
          <button className="btn-finalize" onClick={onFinalize}>
            <Receipt size={16} /> Finalizar Orçamento
          </button>
          <button className="btn-clear-all" onClick={handleClearAll}>
            <Eraser size={14} /> Limpar Simulação
          </button>
        </>
      )}
    </div>
  )
}

export default Sidebar
