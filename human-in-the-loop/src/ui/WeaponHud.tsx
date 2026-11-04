import { useEffect, useState } from 'react'
import { WEAPONS } from '../game/weapons/weapons'
import type { WeaponState } from '../game/weapons/WeaponSystem'

/** Canto inferior direito: arma atual; ao trocar, mostra a lista por um instante. */
export function WeaponHud({ weapon }: { weapon: WeaponState }) {
  const [showList, setShowList] = useState(true)
  useEffect(() => {
    setShowList(true)
    const id = setTimeout(() => setShowList(false), 1400)
    return () => clearTimeout(id)
  }, [weapon.changedAt])

  return (
    <div className="weapon-hud">
      {showList ? (
        WEAPONS.map((w, i) =>
          weapon.owned && !weapon.owned[i] ? null : (
          <div key={w.id} className={i === weapon.index ? 'weapon-slot current' : 'weapon-slot'}>
            <kbd>{i + 1}</kbd>
            {w.name}
          </div>
          ),
        )
      ) : (
        <div className="weapon-slot current">{weapon.name}</div>
      )}
      {Number.isFinite(weapon.ammo) && (
        <div className={weapon.ammo === 0 ? 'weapon-ammo empty' : 'weapon-ammo'}>{weapon.ammo === 0 ? 'sem munição' : weapon.ammo}</div>
      )}
    </div>
  )
}
