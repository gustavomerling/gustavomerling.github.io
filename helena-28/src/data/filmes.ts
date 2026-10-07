// Resenhas da Helena no Letterboxd (letterboxd.com/helefanta), só filmes com nota e comentário.
// Pôsteres em src/assets/posters (WebP, 460px).
const posters = import.meta.glob<string>('../assets/posters/*.webp', { eager: true, import: 'default' })

export type Filme = {
  slug: string
  title: string
  year: number
  rating: number
  /** AAAA-MM-DD */
  watched: string
  review: string
  poster: string
}

const LIST: Omit<Filme, 'poster'>[] = [
  { slug: "gail-daughtry-and-the-celebrity-sex-pass", title: "Gail Daughtry and the Celebrity Sex Pass", year: 2026, rating: 4, watched: "2026-10-02", review: "filme ridículo [em tom de elogio]" },
  { slug: "novocaine-2025", title: "Novocaine", year: 2025, rating: 2.5, watched: "2025-04-25", review: "o maior erro foi não terem adicionado \"novocaine\" do fob na trilha sonora" },
  { slug: "a-minecraft-movie", title: "A Minecraft Movie", year: 2025, rating: 2, watched: "2026-09-23", review: "duas estrelas só pelo jack black" },
  { slug: "sorry-baby-2025", title: "Sorry, Baby", year: 2025, rating: 5, watched: "2026-09-07", review: "chorei muito vou ficar semanas pensando nesse filme" },
  { slug: "what-a-girl-wants", title: "What a Girl Wants", year: 2003, rating: 3.5, watched: "2026-09-02", review: "único defeito é não tocar \"what a girl wants\" da christina aguilera no filme" },
  { slug: "disclosure-day", title: "Disclosure Day", year: 2026, rating: 4, watched: "2026-07-24", review: "esperava menos, me surpreendeu bastante" },
  { slug: "heel-2025", title: "Heel", year: 2025, rating: 4, watched: "2026-06-20", review: "pensando bem não é uma má ideia aceitar viver no porão de alguém com comida e roupa lavada considerando a economia atual né" },
  { slug: "voicemails-for-isabelle", title: "Voicemails for Isabelle", year: 2026, rating: 3.5, watched: "2026-06-20", review: "the old wes can't come to the phone right now!!! you know why??? cause he's DEAD" },
  { slug: "ladies-first-2026", title: "Ladies First", year: 2026, rating: 3.5, watched: "2026-06-07", review: "anotando todas dicas pra pôr em prática misandria ✍️🏻" },
  { slug: "hokum", title: "Hokum", year: 2026, rating: 2, watched: "2026-06-02", review: "muito difícil não largar esse filme no meio, o personagem principal é quase que intragável de tão insuportável, rude e estúpido o enredo da fiona é muito mais interessante e legal e se fosse mais focado nela, teria sido 10x mais envolvente, ela tem uma cena mais longa onde ela sequer aparece, só a voz, e é muito mais cativante do que todos os 90 minutos da cara do adam scott sendo chato o tempo todo mesmo tendo uma história…" },
  { slug: "ghost-rider", title: "Ghost Rider", year: 2007, rating: 3.5, watched: "2026-06-02", review: "lembro de ter um dvd pirata desse aqui, e de conversar horas e horas com meu irmão sobre (ele amava!) fiquei muito nostálgica assistindo apesar da atuação dos principais ser de mediana a ruim, o enredo é muito interessante, tem efeitos bons, uma boa direção e merecia mais notoriedade como um bom filme cult dos anos 2000" },
  { slug: "a-cinderella-story", title: "A Cinderella Story", year: 2004, rating: 3.5, watched: "2026-05-21", review: "a cena da chuva salva o filme inteiro, simplesmente incrível" },
]

export const FILMES: Filme[] = LIST.map((f) => ({ ...f, poster: posters[`../assets/posters/${f.slug}.webp`] }))

/** Total de filmes no perfil do Letterboxd em 07.10.2026 */
export const LETTERBOXD_TOTAL = '1.673'
