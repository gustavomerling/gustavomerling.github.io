export interface VideoClip {
  id: string
  title: string
  album: string
}

export const VIDEOS: VideoClip[] = [
  { id: 'mgJ8BZi3vTA', title: 'Emergency', album: 'All We Know Is Falling (2005)' },
  { id: 'aCyGvGEtOwc', title: 'Misery Business', album: 'RIOT! (2007)' },
  { id: 'OH9A6tn_P6g', title: 'Ignorance', album: 'Brand New Eyes (2009)' },
  { id: '-J7J_IWUhls', title: 'The Only Exception', album: 'Brand New Eyes (2009)' },
  { id: 'G0m_uNaSres', title: 'Now', album: 'Paramore (2013)' },
  { id: 'OblL026SvD4', title: 'Still Into You', album: 'Paramore (2013)' },
  { id: 'EFEmTsfFL5A', title: "Ain't It Fun", album: 'Paramore (2013)' },
  { id: 'AEB6ibtdPZc', title: 'Hard Times', album: 'After Laughter (2017)' },
  { id: 'tzkekaSJoq8', title: 'Running Out Of Time', album: 'This Is Why (2023)' },
]

export const TOTAL_CLIPS = VIDEOS.length

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

export const embedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`