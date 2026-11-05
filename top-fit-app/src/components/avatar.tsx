import { useId } from 'react';
import {
  Anchor,
  Bike,
  Bird,
  BicepsFlexed,
  Cat,
  Crown,
  Dog,
  Dumbbell,
  Fish,
  Flame,
  Footprints,
  Gem,
  Ghost,
  Heart,
  Leaf,
  Moon,
  Mountain,
  Rabbit,
  Rocket,
  Shield,
  Skull,
  Snowflake,
  Sparkles,
  Squirrel,
  Star,
  Sun,
  Swords,
  Target,
  Trophy,
  Turtle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar, AvatarPattern } from '@/store/useApp';

export const AVATAR_ICONS: { id: string; Icon: LucideIcon }[] = [
  { id: 'dumbbell', Icon: Dumbbell },
  { id: 'biceps', Icon: BicepsFlexed },
  { id: 'flame', Icon: Flame },
  { id: 'zap', Icon: Zap },
  { id: 'rocket', Icon: Rocket },
  { id: 'crown', Icon: Crown },
  { id: 'trophy', Icon: Trophy },
  { id: 'target', Icon: Target },
  { id: 'swords', Icon: Swords },
  { id: 'shield', Icon: Shield },
  { id: 'star', Icon: Star },
  { id: 'heart', Icon: Heart },
  { id: 'gem', Icon: Gem },
  { id: 'sparkles', Icon: Sparkles },
  { id: 'mountain', Icon: Mountain },
  { id: 'bike', Icon: Bike },
  { id: 'footprints', Icon: Footprints },
  { id: 'anchor', Icon: Anchor },
  { id: 'sun', Icon: Sun },
  { id: 'moon', Icon: Moon },
  { id: 'snowflake', Icon: Snowflake },
  { id: 'leaf', Icon: Leaf },
  { id: 'skull', Icon: Skull },
  { id: 'ghost', Icon: Ghost },
  { id: 'cat', Icon: Cat },
  { id: 'dog', Icon: Dog },
  { id: 'bird', Icon: Bird },
  { id: 'rabbit', Icon: Rabbit },
  { id: 'squirrel', Icon: Squirrel },
  { id: 'turtle', Icon: Turtle },
  { id: 'fish', Icon: Fish },
];

/** Cada cor tem o tom base e um segundo tom para degradê/padrões. */
export const AVATAR_COLORS: { id: string; a: string; b: string }[] = [
  { id: 'lima', a: '#a3e635', b: '#16a34a' },
  { id: 'verde', a: '#34d399', b: '#0f766e' },
  { id: 'ciano', a: '#22d3ee', b: '#2563eb' },
  { id: 'azul', a: '#3b82f6', b: '#4338ca' },
  { id: 'roxo', a: '#a855f7', b: '#6d28d9' },
  { id: 'rosa', a: '#f472b6', b: '#be123c' },
  { id: 'vermelho', a: '#ef4444', b: '#9a3412' },
  { id: 'laranja', a: '#fb923c', b: '#dc2626' },
  { id: 'amarelo', a: '#facc15', b: '#ea580c' },
  { id: 'areia', a: '#d6c7a1', b: '#8b6b3d' },
  { id: 'cinza', a: '#94a3b8', b: '#334155' },
  { id: 'grafite', a: '#3f3f46', b: '#09090b' },
];

export const AVATAR_PATTERNS: { id: AvatarPattern; nome: string }[] = [
  { id: 'solido', nome: 'Sólido' },
  { id: 'degrade', nome: 'Degradê' },
  { id: 'listras', nome: 'Listras' },
  { id: 'bolinhas', nome: 'Bolinhas' },
  { id: 'raios', nome: 'Raios' },
  { id: 'xadrez', nome: 'Xadrez' },
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts.at(-1)![0] : (parts[0][1] ?? ''))).toUpperCase();
}

export function randomAvatar(name = ''): Extract<Avatar, { kind: 'custom' }> {
  const color = pick(AVATAR_COLORS);
  return {
    kind: 'custom',
    icon: pick(AVATAR_ICONS).id,
    initials: initialsOf(name),
    color: color.id,
    pattern: pick(AVATAR_PATTERNS.filter((p) => p.id !== 'solido')).id,
    fg: color.id === 'grafite' || color.id === 'azul' || color.id === 'roxo' ? 'claro' : pick(['claro', 'escuro'] as const),
  };
}

export const DEFAULT_AVATAR: Extract<Avatar, { kind: 'custom' }> = {
  kind: 'custom',
  icon: 'dumbbell',
  initials: '',
  color: 'lima',
  pattern: 'degrade',
  fg: 'escuro',
};

function Background({ pattern, a, b, id }: { pattern: AvatarPattern; a: string; b: string; id: string }) {
  switch (pattern) {
    case 'solido':
      return <rect width="100" height="100" fill={a} />;
    case 'degrade':
      return (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${id})`} />
        </>
      );
    case 'listras':
      return (
        <>
          <defs>
            <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="16" height="16" fill={a} />
              <rect width="7" height="16" fill={b} opacity="0.55" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#${id})`} />
        </>
      );
    case 'bolinhas':
      return (
        <>
          <defs>
            <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill={a} />
              <circle cx="7" cy="7" r="2.6" fill={b} opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#${id})`} />
        </>
      );
    case 'raios':
      return (
        <>
          <rect width="100" height="100" fill={a} />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M50 50 L50 -30 L70 -30 Z" fill={b} opacity="0.4" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </>
      );
    case 'xadrez':
      return (
        <>
          <defs>
            <pattern id={id} width="25" height="25" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <rect width="25" height="25" fill={a} />
              <rect width="12.5" height="12.5" fill={b} opacity="0.45" />
              <rect x="12.5" y="12.5" width="12.5" height="12.5" fill={b} opacity="0.45" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#${id})`} />
        </>
      );
  }
}

export function AvatarView({ avatar, className }: { avatar: Avatar; className?: string }) {
  const uid = useId().replace(/:/g, '');
  if (avatar.kind === 'upload') {
    return <img src={avatar.dataUrl} alt="" className={cn('size-12 shrink-0 rounded-full object-cover', className)} />;
  }
  const color = AVATAR_COLORS.find((c) => c.id === avatar.color) ?? AVATAR_COLORS[0];
  const fg = avatar.fg === 'claro' ? '#ffffff' : '#0a0a0a';
  const Icon = AVATAR_ICONS.find((i) => i.id === avatar.icon)?.Icon;
  const showInitials = avatar.icon === 'iniciais';

  return (
    <svg viewBox="0 0 100 100" className={cn('size-12 shrink-0 rounded-full', className)} aria-hidden>
      <clipPath id={`c${uid}`}>
        <circle cx="50" cy="50" r="50" />
      </clipPath>
      <g clipPath={`url(#c${uid})`}>
        <Background pattern={avatar.pattern} a={color.a} b={color.b} id={`p${uid}`} />
      </g>
      {showInitials ? (
        <text
          x="50"
          y="50"
          dy="0.36em"
          textAnchor="middle"
          fill={fg}
          fontSize={avatar.initials.length > 1 ? 34 : 42}
          fontWeight={800}
          style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}
        >
          {avatar.initials || '?'}
        </text>
      ) : (
        Icon && <Icon x={24} y={24} width={52} height={52} color={fg} strokeWidth={2.2} />
      )}
    </svg>
  );
}

/** Lê uma imagem do usuário e devolve um JPEG quadrado de 256px (cabe tranquilo no localStorage). */
export function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
