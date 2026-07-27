import FramePreview from './FramePreview'
import FrameEditor from './FrameEditor'
import './MainContent.css'

function MainContent({ frame, onUpdateFrame }) {
  return (
    <div className="main-content">
      <div className="preview-section">
        <FramePreview frame={frame} />
      </div>

      <div className="editor-section">
        <FrameEditor frame={frame} onUpdateFrame={onUpdateFrame} />
      </div>
    </div>
  )
}

export default MainContent
