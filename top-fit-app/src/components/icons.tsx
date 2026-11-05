import {
  BicepsFlexed,
  Bell,
  Cable,
  Cog,
  Dumbbell,
  Flame,
  HeartPulse,
  Medal,
  PersonStanding,
  Spline,
  Sprout,
  TrendingUp,
  Weight,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Equip } from '@/data/exercises';
import type { Goal, Nivel } from '@/lib/training';

export const GOAL_ICON: Record<Goal, LucideIcon> = {
  hipertrofia: BicepsFlexed,
  emagrecimento: Flame,
  forca: Zap,
  saude: HeartPulse,
};

export const EQUIP_ICON: Record<Equip, LucideIcon> = {
  maquina: Cog,
  polia: Cable,
  halteres: Dumbbell,
  barra: Weight,
  kettlebell: Bell,
  elastico: Spline,
  corporal: PersonStanding,
};

export const LEVEL_ICON: Record<Nivel, LucideIcon> = {
  1: Sprout,
  2: TrendingUp,
  3: Medal,
};
