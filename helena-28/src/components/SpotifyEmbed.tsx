type SpotifyEmbedProps = {
  type: 'track' | 'artist' | 'playlist' | 'album'
  id: string
  title: string
  /** Altura interna. ~90 = player compacto (80 + respiro), 152 = com capa grande, 352 = com lista de faixas */
  height?: number
}

/** Player oficial do Spotify (prévia de 30s, ou a música toda se a pessoa estiver logada) */
export function SpotifyEmbed({ type, id, title, height = 90 }: SpotifyEmbedProps) {
  return (
    <iframe
      className="spotify-embed"
      title={`Spotify: ${title}`}
      src={`https://open.spotify.com/embed/${type}/${id}?utm_source=generator`}
      height={height}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  )
}
