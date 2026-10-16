import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Window } from '../ui/Window'

export function RecycleDialog({ onConfirm, onClose }: { onConfirm(): void; onClose(): void }) {
  return (
    <Window title="Confirm File Delete" icon="recycle" onClose={onClose}>
      <div className="dialog-row">
        <Icon name="warning" size={32} />
        <p style={{ margin: 0 }}>
          Are you sure you want to empty the Recycle Bin?
          <br />
          <br />
          This erases all KB, upgrades and records. It cannot be undone.
        </p>
      </div>
      <div className="dialog-buttons">
        <Button
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          Yes
        </Button>
        <Button isDefault autoFocus onClick={onClose}>
          No
        </Button>
      </div>
    </Window>
  )
}
