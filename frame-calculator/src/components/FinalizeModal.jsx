import { X, MessageCircle } from 'lucide-react'
import { calculatePrice, formatBRL } from '../utils/pricing'
import './FinalizeModal.css'

function FinalizeModal({ frames, onClose, onUpdateQuantity }) {
  const frameDetails = frames.map(frame => ({
    ...frame,
    price: calculatePrice(frame),
  }))

  const grandTotal = frameDetails.reduce((sum, f) => sum + f.price.totalPrice, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Resumo do Orçamento</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Quadro</th>
                <th>Tamanho</th>
                <th>Madeira</th>
                <th>Vidro</th>
                <th>Qty</th>
                <th>Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {frameDetails.map((frame, idx) => (
                <tr key={frame.id}>
                  <td>{frame.name || `Quadro ${idx + 1}`}</td>
                  <td>{frame.size}</td>
                  <td className="capitalize">{frame.woodType}</td>
                  <td className="capitalize">{frame.glassType}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={frame.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(frame.id, Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="qty-input"
                    />
                  </td>
                  <td>R$ {formatBRL(frame.price.unitPrice)}</td>
                  <td className="font-semibold">R$ {formatBRL(frame.price.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="modal-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <strong>R$ {formatBRL(grandTotal)}</strong>
            </div>
            <div className="total-row">
              <span>Desconto (0%):</span>
              <strong>R$ 0,00</strong>
            </div>
            <div className="total-row grand-total">
              <span>Total:</span>
              <strong>R$ {formatBRL(grandTotal)}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Voltar e Editar
          </button>
          <a
            href={`https://wa.me/554797631716?text=Olá! Gostaria de solicitar um orçamento para os seguintes quadros:%0A${frameDetails
              .map(
                (f, i) =>
                  `Quadro ${i + 1}: ${f.size}, Madeira ${f.woodType}, Vidro ${f.glassType}, Qtd: ${f.quantity} - R$ ${formatBRL(f.price.totalPrice)}`
              )
              .join('%0A')}%0ATotal: R$ ${formatBRL(grandTotal)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <MessageCircle size={16} /> Solicitar Orçamento via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

export default FinalizeModal
