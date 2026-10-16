import { useState } from 'react'
import type { SaveData } from '../game/save'
import { SHOP_UPGRADES } from '../game/shop/upgrades'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Pips } from '../ui/Pips'
import { Window } from '../ui/Window'

interface Props {
  save: SaveData
  onBuy(id: string): void
  onRefundAll(): void
  onClose(): void
}

/** "Add/Remove Programs" style list of permanent upgrades. */
export function ShopScreen({ save, onBuy, onRefundAll, onClose }: Props) {
  const [confirmRefund, setConfirmRefund] = useState(false)
  const owned = Object.values(save.shop).reduce((a, b) => a + b, 0)

  return (
    <>
      <Window
        title="Control Panel — Upgrades"
        icon="controlPanel"
        onClose={onClose}
        menu={['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help']}
        status={[`${SHOP_UPGRADES.length} object(s)`, `${save.kb} KB available`]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
          <p style={{ margin: 0 }}>
            Install permanent upgrades with the KB you earn from runs. They apply at the start of every run.
          </p>
          <div className="list-view" style={{ flex: 1 }}>
            {SHOP_UPGRADES.map((u) => {
              const level = save.shop[u.id] ?? 0
              const maxed = level >= u.maxLevel
              const cost = maxed ? 0 : u.cost(level)
              return (
                <div key={u.id} className="list-row">
                  <Icon name={u.icon} size={32} />
                  <div>
                    <div className="name">{u.name}</div>
                    <div className="desc">{u.description} per level</div>
                  </div>
                  <Pips value={level} max={u.maxLevel} />
                  <Button disabled={maxed || save.kb < cost} onClick={() => onBuy(u.id)} style={{ minWidth: 110 }}>
                    {maxed ? 'Installed' : `Install · ${cost} KB`}
                  </Button>
                </div>
              )
            })}
          </div>
          <div className="dialog-buttons" style={{ marginTop: 0 }}>
            <Button disabled={owned === 0} onClick={() => setConfirmRefund(true)}>
              Uninstall all
            </Button>
            <Button isDefault onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Window>

      {confirmRefund && (
        <Modal>
          <Window title="Uninstall" onClose={() => setConfirmRefund(false)} style={{ width: 'min(360px, 100%)' }}>
            <div className="dialog-row">
              <Icon name="warning" size={32} />
              <p style={{ margin: 0 }}>Remove all upgrades? Every KB spent will be refunded.</p>
            </div>
            <div className="dialog-buttons">
              <Button
                isDefault
                onClick={() => {
                  onRefundAll()
                  setConfirmRefund(false)
                }}
              >
                Yes
              </Button>
              <Button onClick={() => setConfirmRefund(false)}>No</Button>
            </div>
          </Window>
        </Modal>
      )}
    </>
  )
}
