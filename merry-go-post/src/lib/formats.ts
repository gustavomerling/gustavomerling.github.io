import type { Format } from '../types';

export const SLIDE_WIDTH = 1080;

export const FORMATS: Record<Format, { label: string; height: number; hint: string }> = {
  '3x4': { label: '3:4', height: 1440, hint: 'Feed retrato' },
  '4x5': { label: '4:5', height: 1350, hint: 'Feed clássico' },
  '9x16': { label: '9:16', height: 1920, hint: 'Stories' },
};

export const FORMAT_LIST = Object.keys(FORMATS) as Format[];

export const slideHeight = (format: Format) => FORMATS[format].height;
