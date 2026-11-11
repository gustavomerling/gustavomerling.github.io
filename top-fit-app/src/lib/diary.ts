import { Bike, Dog, Footprints, Music, PartyPopper, Shirt, ShoppingCart, Sprout, Baby, Building2, Activity as ActivityIcon, Coffee, Sandwich, UtensilsCrossed, Soup, Moon, Apple } from 'lucide-react';

/** Unidade da quantidade de uma atividade. Minutos são sempre um campo à parte. */
export type ActivityUnit = 'quadras' | 'km' | 'andares' | 'passos' | null;

export interface ActivityEntry {
  id: string;
  /** Dia (AAAA-MM-DD) */
  day: string;
  /** Hora (HH:MM) */
  time: string;
  kind: string;
  /** Nome livre quando kind = 'outro' (ou para detalhar) */
  name: string;
  minutes?: number;
  amount?: number;
  unit?: ActivityUnit;
  note?: string;
}

export type MealType = 'cafe' | 'lanche-manha' | 'almoco' | 'lanche-tarde' | 'jantar' | 'ceia' | 'outro';

export interface MealEntry {
  id: string;
  day: string;
  time: string;
  type: MealType;
  description: string;
  kcal?: number;
}

export const ACTIVITY_PRESETS: { id: string; nome: string; unit: ActivityUnit; Icon: typeof Dog }[] = [
  { id: 'cachorro', nome: 'Passear com o cachorro', unit: 'quadras', Icon: Dog },
  { id: 'caminhada', nome: 'Caminhada', unit: 'km', Icon: Footprints },
  { id: 'bicicleta', nome: 'Bicicleta', unit: 'km', Icon: Bike },
  { id: 'escadas', nome: 'Subir escadas', unit: 'andares', Icon: Building2 },
  { id: 'show', nome: 'Show ou evento em pé', unit: null, Icon: Music },
  { id: 'danca', nome: 'Dança ou festa', unit: null, Icon: PartyPopper },
  { id: 'mercado', nome: 'Mercado ou compras', unit: null, Icon: ShoppingCart },
  { id: 'faxina', nome: 'Faxina ou arrumação', unit: null, Icon: Shirt },
  { id: 'jardim', nome: 'Jardinagem', unit: null, Icon: Sprout },
  { id: 'criancas', nome: 'Brincar com crianças', unit: null, Icon: Baby },
  { id: 'outro', nome: 'Outra atividade', unit: null, Icon: ActivityIcon },
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITY_PRESETS.map((a) => [a.id, a]));

export const UNIT_LABEL: Record<Exclude<ActivityUnit, null>, string> = {
  quadras: 'quadras',
  km: 'km',
  andares: 'andares',
  passos: 'passos',
};

export const MEAL_TYPES: { id: MealType; nome: string; hora: string; Icon: typeof Coffee }[] = [
  { id: 'cafe', nome: 'Café da manhã', hora: '07:30', Icon: Coffee },
  { id: 'lanche-manha', nome: 'Lanche da manhã', hora: '10:00', Icon: Apple },
  { id: 'almoco', nome: 'Almoço', hora: '12:30', Icon: UtensilsCrossed },
  { id: 'lanche-tarde', nome: 'Lanche da tarde', hora: '16:00', Icon: Sandwich },
  { id: 'jantar', nome: 'Jantar', hora: '20:00', Icon: Soup },
  { id: 'ceia', nome: 'Ceia', hora: '22:30', Icon: Moon },
  { id: 'outro', nome: 'Outra', hora: '', Icon: UtensilsCrossed },
];

export const MEAL_BY_ID = Object.fromEntries(MEAL_TYPES.map((m) => [m.id, m])) as Record<MealType, (typeof MEAL_TYPES)[number]>;

/** Tipo de refeição mais provável para a hora. */
export function mealForTime(time: string): MealType {
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m;
  if (t < 9 * 60 + 30) return 'cafe';
  if (t < 11 * 60 + 30) return 'lanche-manha';
  if (t < 15 * 60) return 'almoco';
  if (t < 18 * 60 + 30) return 'lanche-tarde';
  if (t < 22 * 60) return 'jantar';
  return 'ceia';
}

export const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export const byTime = <T extends { time: string }>(a: T, b: T) => a.time.localeCompare(b.time);
