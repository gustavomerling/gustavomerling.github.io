import { Registry } from '@engine/content/registry';
import type { AttachmentDef } from './types';

export const ATTACHMENTS = new Registry<AttachmentDef>('attachment', [
  {
    id: 'suppressor',
    name: 'Silenciador',
    description: 'Ninguém escuta. Igual seus e-mails pro suporte.',
    slot: 'muzzle',
    modifiers: [
      { stat: 'noise', op: 'mul', value: 0.2 },
      { stat: 'damage', op: 'mul', value: 0.9 },
    ],
    behaviors: ['silenced'],
  },
  {
    id: 'compensator',
    name: 'Compensador',
    description: 'Menos coice, mais foco. Tipo pomodoro.',
    slot: 'muzzle',
    modifiers: [
      { stat: 'recoil', op: 'mul', value: 0.5 },
      { stat: 'spreadDeg', op: 'mul', value: 0.8 },
    ],
  },
  {
    id: 'laser',
    name: 'Mira laser',
    description: 'Apontador de apresentação, versão hostil.',
    slot: 'underbarrel',
    modifiers: [{ stat: 'spreadDeg', op: 'mul', value: 0.6 }],
    behaviors: ['laserSight'],
  },
  {
    id: 'extended-mag',
    name: 'Carregador estendido',
    description: '+50% de balas, recarga um pouco mais lenta.',
    slot: 'magazine',
    modifiers: [
      { stat: 'magazine', op: 'mul', value: 1.5 },
      { stat: 'reloadTime', op: 'mul', value: 1.15 },
    ],
  },
  {
    id: 'drum-mag',
    name: 'Tambor',
    description: 'Munição para a semana toda. Recarregar leva a semana toda.',
    slot: 'magazine',
    modifiers: [
      { stat: 'magazine', op: 'mul', value: 2.5 },
      { stat: 'reloadTime', op: 'mul', value: 1.6 },
      { stat: 'fireRate', op: 'mul', value: 0.9 },
    ],
  },
  {
    id: 'auto-kit',
    name: 'Kit de conversão',
    description: 'Transforma a pistola em mangueira de chumbo.',
    slot: 'conversion',
    allowedClasses: ['pistol'],
    fireMode: 'auto',
    modifiers: [
      { stat: 'fireRate', op: 'mul', value: 2 },
      { stat: 'spreadDeg', op: 'mul', value: 2 },
      { stat: 'recoil', op: 'mul', value: 1.4 },
    ],
  },
  {
    id: 'ricochet-rounds',
    name: 'Munição ricochete',
    description: 'Balas que quicam na parede, como reclamações no chamado.',
    slot: 'ammo',
    modifiers: [{ stat: 'damage', op: 'mul', value: 0.85 }],
    behaviors: ['ricochet'],
  },
  {
    id: 'ap-rounds',
    name: 'Munição perfurante',
    description: 'Atravessa um inimigo. E a divisória do open space.',
    slot: 'ammo',
    modifiers: [{ stat: 'projectileSpeed', op: 'mul', value: 1.2 }],
    behaviors: ['pierce'],
  },
]);
