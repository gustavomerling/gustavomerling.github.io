import band2023 from '@/assets/a-banda/band-o2-2023.jpg'
import hayley from '@/assets/a-banda/hayley.jpg'
import taylor from '@/assets/a-banda/taylor.jpg'
import zac from '@/assets/a-banda/zac.jpg'
import rio2011 from '@/assets/a-banda/ruptura-rio-2011.jpg'
import coverAwkif from '@/assets/galeria/covers-awkif.jpg'
import coverRiot from '@/assets/galeria/covers-riot.jpg'
import coverBne from '@/assets/galeria/covers-bne.jpg'
import coverSelftitled from '@/assets/galeria/covers-selftitled.jpg'
import coverAfterLaughter from '@/assets/galeria/covers-afterlaughter.jpg'
import coverThisIsWhy from '@/assets/galeria/covers-thisiswhy.jpg'

export interface GalleryPhoto {
  id: string
  src: string
  title: string
  caption: string
  era: string
  credit: string
  file: string
}

export const GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'banda-2023',
    src: band2023,
    title: 'Paramore em estúdio',
    caption: 'O trio na fase de pré-produção do novo ciclo.',
    era: '2023',
    credit: 'Arquivo do fã-clube',
    file: 'paramore-2023.jpg',
  },
  {
    id: 'hayley-2023',
    src: hayley,
    title: 'Hayley Williams',
    caption: 'Retrato para a imprensa do novo material.',
    era: '2023',
    credit: 'Arquivo do fã-clube',
    file: 'hayley-williams-2023.jpg',
  },
  {
    id: 'taylor-2018',
    src: taylor,
    title: 'Taylor York',
    caption: 'O guitarrista em apresentação na era After Laughter.',
    era: '2018',
    credit: 'Arquivo do fã-clube',
    file: 'taylor-york-2018.jpg',
  },
  {
    id: 'zac-2018',
    src: zac,
    title: 'Zac Farro',
    caption: 'O baterista de volta ao posto após a pausa.',
    era: '2018',
    credit: 'Arquivo do fã-clube',
    file: 'zac-farro-2018.jpg',
  },
  {
    id: 'rio-2011',
    src: rio2011,
    title: 'Paramore no Rio de Janeiro',
    caption: 'Primeira passagem da banda pelo Brasil em grande escala.',
    era: '2011',
    credit: 'Arquivo do fã-clube',
    file: 'paramore-rio-2011.jpg',
  },
]

export interface AlbumCover {
  id: string
  src: string
  title: string
  year: string
  file: string
}

export const ALBUM_COVERS: AlbumCover[] = [
  { id: 'awkif', src: coverAwkif, title: 'All We Know Is Falling', year: '2005', file: 'all-we-know-is-falling.jpg' },
  { id: 'riot', src: coverRiot, title: 'RIOT!', year: '2007', file: 'riot.jpg' },
  { id: 'bne', src: coverBne, title: 'Brand New Eyes', year: '2009', file: 'brand-new-eyes.jpg' },
  { id: 'selftitled', src: coverSelftitled, title: 'Paramore (Self-Titled)', year: '2013', file: 'paramore-self-titled.jpg' },
  { id: 'afterlaughter', src: coverAfterLaughter, title: 'After Laughter', year: '2017', file: 'after-laughter.jpg' },
  { id: 'thisiswhy', src: coverThisIsWhy, title: 'This Is Why', year: '2023', file: 'this-is-why.jpg' },
]