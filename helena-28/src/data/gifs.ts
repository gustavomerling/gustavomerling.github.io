// GIFs do canal oficial da Taylor no GIPHY (giphy.com/taylorswift).
// Ficam hospedados no GIPHY: nada protegido por direito autoral vai para o repositório.
export type Gif = {
  id: string
  caption: string
  alt: string
}

export const GIFS = {
  era1989: { id: 'FOeoCHlcHfeejfzCE8', caption: "1989 (Taylor's Version)", alt: 'Taylor Swift sorrindo, capa do 1989' },
  bejeweled: { id: 'ldr2Go1A2a2mGRBdZ5', caption: 'Bejeweled', alt: 'Taylor Swift brilhando de rosa no clipe de Bejeweled' },
  karma: { id: 'RR30mIPug9oNcbLuNw', caption: 'Karma', alt: "Taylor Swift cantando \"Karma's a relaxing thought\"" },
  erasTour: { id: 'P5AcR0jbksqRDlJTi0', caption: 'The Eras Tour', alt: 'Taylor Swift no palco da Eras Tour' },
  lover: { id: 'dAd4H9cCE78ql0DAwA', caption: 'Lover', alt: "Taylor Swift: \"I don't wanna look at anything else now that I saw you\"" },
  whyMad: { id: 'iDmCY9CbpmwmJZ3LUx', caption: 'Why are you mad?', alt: 'Taylor Swift no palco: "Why are you mad?"' },
  me: { id: 'KciJJZsORJHKnJuS0e', caption: 'ME!', alt: 'Taylor Swift no clipe colorido de ME!' },
} satisfies Record<string, Gif>

export const gifUrl = (id: string) => `https://media.giphy.com/media/${id}/giphy.webp`
