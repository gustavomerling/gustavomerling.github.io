import { useState } from 'react'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import FinalizeModal from './FinalizeModal'
import { useFrameStore } from '../store/useFrameStore'
import './FrameCalculator.css'

function FrameCalculator({ onLogout }) {
  const frames = useFrameStore((s) => s.frames)
  const selectedFrameId = useFrameStore((s) => s.selectedFrameId)
  const addFrame = useFrameStore((s) => s.addFrame)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const deleteFrame = useFrameStore((s) => s.deleteFrame)
  const duplicateFrame = useFrameStore((s) => s.duplicateFrame)
  const updateFrameById = useFrameStore((s) => s.updateFrameById)
  const selectFrame = useFrameStore((s) => s.selectFrame)
  const clearFrames = useFrameStore((s) => s.clearFrames)

  const [showFinalize, setShowFinalize] = useState(false)

  const selectedFrame = frames.find(f => f.id === selectedFrameId)
  const updateQuantity = (id, quantity) => updateFrameById(id, { quantity })

  return (
    <div className="frame-calculator">
      <Sidebar
        frames={frames}
        selectedFrameId={selectedFrameId}
        onAddFrame={addFrame}
        onSelectFrame={selectFrame}
        onDeleteFrame={deleteFrame}
        onDuplicateFrame={duplicateFrame}
        onUpdateQuantity={updateQuantity}
        onFinalize={() => setShowFinalize(true)}
        onClearAll={clearFrames}
        onLogout={onLogout}
      />

      {selectedFrame ? (
        <MainContent
          frame={selectedFrame}
          onUpdateFrame={updateFrame}
        />
      ) : (
        <div className="empty-state">
          <p>Adicione um quadro para começar</p>
        </div>
      )}

      {showFinalize && (
        <FinalizeModal
          frames={frames}
          onUpdateQuantity={updateQuantity}
          onClose={() => setShowFinalize(false)}
        />
      )}
    </div>
  )
}

export default FrameCalculator
