import { ALBUMS, type Album, type AlbumId } from './albums'

const cache = new Map<AlbumId, HTMLImageElement>()
let coversPromise: Promise<void> | null = null

function loadCover(album: Album): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      cache.set(album.id, image)
      resolve()
    }
    image.onerror = () => resolve()
    image.src = album.cover
  })
}

export function preloadAlbumCovers(): Promise<void> {
  if (!coversPromise) {
    coversPromise = Promise.all(ALBUMS.map(loadCover)).then(() => undefined)
  }
  return coversPromise
}

export function getAlbumCover(album: Album): HTMLImageElement | null {
  return cache.get(album.id) ?? null
}
