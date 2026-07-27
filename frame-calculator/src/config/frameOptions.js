import carvalhoImg from '../assets/wood/carvalho.jpg'
import nogueiraImg from '../assets/wood/nogueira.jpg'
import cerejeiraImg from '../assets/wood/cerejeira.jpg'
import mognoImg from '../assets/wood/mogno.jpg'
import brancaImg from '../assets/wood/branca.jpg'
import pretaImg from '../assets/wood/preta.jpg'

export const SIZES = [
  { value: 'A5', label: 'A5 (15x21cm)', width: 148, height: 210 },
  { value: 'A4', label: 'A4 (21x29cm)', width: 210, height: 297 },
  { value: 'A3', label: 'A3 (29x42cm)', width: 297, height: 420 },
  { value: 'A2', label: 'A2 (42x59cm)', width: 420, height: 594 },
  { value: 'A1', label: 'A1 (59x84cm)', width: 594, height: 841 },
  { value: '10x15', label: '10x15cm', width: 100, height: 150 },
  { value: '13x18', label: '13x18cm', width: 130, height: 180 },
  { value: '15x21', label: '15x21cm', width: 150, height: 210 },
  { value: '20x30', label: '20x30cm', width: 200, height: 300 },
  { value: '30x40', label: '30x40cm', width: 300, height: 400 },
  { value: '40x50', label: '40x50cm', width: 400, height: 500 },
  { value: '40x60', label: '40x60cm', width: 400, height: 600 },
  { value: '50x70', label: '50x70cm', width: 500, height: 700 },
  { value: '60x80', label: '60x80cm', width: 600, height: 800 },
]

export const WOOD_TYPES = [
  {
    value: 'carvalho',
    label: 'Carvalho',
    swatch: '#C9A876',
    image: carvalhoImg,
  },
  {
    value: 'nogueira',
    label: 'Nogueira',
    swatch: '#5C3A21',
    image: nogueiraImg,
  },
  {
    value: 'cerejeira',
    label: 'Cerejeira',
    swatch: '#A9532E',
    image: cerejeiraImg,
  },
  {
    value: 'mogno',
    label: 'Mogno',
    swatch: '#6B2E1F',
    image: mognoImg,
  },
  {
    value: 'branca',
    label: 'Branca',
    swatch: '#EDEAE3',
    image: brancaImg,
  },
  {
    value: 'preta',
    label: 'Preta',
    swatch: '#1C1C1C',
    image: pretaImg,
  },
]

export const GLASS_TYPES = [
  { value: 'vidro-comum', label: 'Vidro Comum', opacity: 0.1, blur: 0 },
  { value: 'vidro-uv', label: 'Vidro UV', opacity: 0.08, blur: 0 },
  { value: 'acrilico', label: 'Acrílico', opacity: 0.15, blur: 2 },
  { value: 'sem-vidro', label: 'Sem Vidro', opacity: 0, blur: 0 },
]

export const COLOR_PRESETS = [
  '#FFFFFF',
  '#F5F0F9',
  '#F0EBE5',
  '#E5D8F0',
  '#0F172A',
  '#1D7870',
  '#6B2E8C',
]

export const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #F5F0F9 0%, #E5D8F0 100%)',
  'linear-gradient(135deg, #FDFBFB 0%, #F0EBE5 100%)',
  'linear-gradient(135deg, #6B2E8C 0%, #9B87F5 100%)',
  'linear-gradient(135deg, #1D7870 0%, #17635C 100%)',
  'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
]
