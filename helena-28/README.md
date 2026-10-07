# Helena 28

Landing page de aniversário de 28 anos da Helena, feita pelo Gustavo Merling (namorado).

- **Data do aniversário:** 21/10/2026
- **Publicação:** GitHub Pages, em `/helena-28/dist/`
- **Stack:** Vite + React + TypeScript, `react-router` com `HashRouter`

## Rodando

```bash
npm install
npm run dev     # http://localhost:5173/helena-28/dist/
npm run build   # gera dist/, que é commitado (o GitHub Pages serve essa pasta)
```

Rotas:

- `#/`: a LP
- `#/design-system`: catálogo de tokens, cards e blocos
- `#/qr-code`: QR code da LP (`src/assets/qr-code.png`), sem trava

**Trava de data:** a LP e o design system só abrem em **21/10/2026 00:00 (Brasília)**; antes disso, mostram a contagem regressiva (`src/components/DateLock.tsx`, data em `src/lib/time.ts`). Para testar antes: `#/?preview=1` ou `#/design-system?preview=1`. Não é segurança, só protege a surpresa.

Estrutura:

- `src/pages/Home.tsx`: monta a LP empilhando as seções em ordem
- `src/sections/`: uma seção da LP por arquivo (com o próprio `.css` quando precisa)
- `src/components/`: design system (`primitives`, `cards`, `blocks`, `layout`, `icons`)
- `src/components/intro/`: peças da abertura (cartão, explosão, borboleta)
- `src/components/motion/`: movimento (`Reveal`/`RevealGroup` na rolagem, `Tilt` 3D holográfico, `CountUp`, `Floaters`, `Sparkles`, `GlitterCursor`, `ScrollProgress`). Usa a lib [Motion](https://motion.dev) e respeita o "reduzir movimento" do sistema
- `src/data/gifs.ts` + `src/components/GifCard.tsx`: GIFs do canal oficial `@taylorswift` no GIPHY, carregados direto do GIPHY (nada fica salvo no repositório)
- `src/components/Plim.tsx`: easter egg do falso comercial da Principia ("plim, plom, plim…"). **Nada de `ad`/`ads`/`banner`/`sponsor`/`promo` em classes ou nomes de arquivo**: o Brave da Helena bloquearia
- `src/styles/`: tokens, base e estilos dos componentes

---

## Briefing: sobre a Helena

> ✅ = confirmado pelo Gustavo · ❓ = visto online, ainda não confirmado

### Diretrizes da LP

- **A Helena é o foco.** O Gustavo aparece em no máximo uns **10%** da página.
- **Tema:** **filmes e músicas**. Ela se considera cinéfila.
- **Tom:** terror, bruxa, Halloween **e** coisas femininas: rosa, Hello Kitty, Taylor. Um mix divertido, não sombrio.
- **Nunca** usar o nome "Maria". É sempre **Helena**.
- **Não exaltar Campinas.** A vida dela lá foi difícil, e Joinville é onde ela encontrou a felicidade.

### Básico

- ✅ **Nome completo:** Maria Helena Vieira da Silva. Assina profissionalmente como **Helena Vieira**.
- ✅ **Nascimento:** 21/10/1998, em Campinas-SP. Faz 28 anos em 2026.
- ✅ **Mora em Joinville-SC** desde 2022 e ainda sonha em ir para Curitiba ("tem mais coisa para fazer").
- ✅ **Profissão:** designer gráfica (marcas, eventos, redes sociais)
- ✅ **Apelido de internet:** "Helena Bruce" (nem o Gustavo sabe de onde veio)
- 💡 **Xará de uma pintora famosa:** Maria Helena Vieira da Silva (1908–1992), pintora abstrata luso-francesa. Pode virar easter egg (sem o "Maria").

### Helena + Gustavo (os ~10%)

- ✅ Começaram a namorar em Joinville, em 2022
- ✅ Terminaram em 11/2022
- ✅ Voltaram a se falar em **17/12/2023**
- ✅ Moram juntos desde **02/2024**
- ✅ Assistem muitos filmes juntos (o Letterboxd dela registra isso)

### Família de quatro patas

- ✅ **Bastet:** a gatinha, **a 01, da Helena**
- ✅ **Mocha:** a cachorrinha, **a 02, do Gustavo**. Piada interna: a Helena diz que vai roubar a Mocha no dia em que for embora.

### Fotos

27 fotos em `src/assets/fotos/` (WebP, no máximo 1080px, sem EXIF/GPS). O nome do arquivo descreve a foto e serve de legenda:

- **Helena:** sendo fofa · no museu · em BC · com a moça do Freepik · e o Nemo · e pelúcias · e uma Hello Kitty gigante · braços sujos de pintar o cabelo · esperando a Taylor aparecer na propaganda do metrô
- **Pets:** Mocha · Bastet · Helena e Mocha (2) · Mocha e Bastet no aquecedor
- **Comida e bebida:** hambúrguer de Hello Kitty · poke que ela preparou · açaí · ice tea no Outback · drinks · drink no Liberdade
- **Rolês e cultura:** show do Avenged Sevenfold e A Day To Remember · Vingadores: Ultimato no relançamento · amamos viajar de avião · ela que me ensinou a andar de metrô
- **Casal (~10%):** muito chiques · último Dia dos Namorados, com pizza · besteiras

### Favoritos (confirmados pelo Gustavo)

- **Cantora favorita:** Taylor Swift · **segunda:** Hayley Williams
- **Carro favorito:** BYD Dolphin
- **Cidade onde moraria:** Curitiba
- **Filme favorito:** Martyrs (2008)
- **Comida favorita:** temaki empanado crispy, com muito tarê, salmão e até camarão se tiver
- **País favorito:** Nova Zelândia
- **Hobbies:** gerar paletas de cores, trabalhar de graça pra fandoms, colecionar fotos da Hayley
- **Shows da Hayley (The Hayley Williams Show, Brasil 2026):** 10/11 no Rio (Qualistage); 12/11 e 13/11 em São Paulo (Espaço Unimed)

### Gostos

- ✅ **Música:** Taylor Swift, Paramore e **Hayley Williams solo**. Ela vai a **3 shows da Hayley em 2026**.
- ✅ **Avril Lavigne** (tem pasta própria no Pinterest, estética Y2K e rosa)
- ✅ **Cores favoritas:** rosa, vermelho e laranja
- ✅ **Estética desejada:** mix de Taylor Swift, Hello Kitty e Paramore
- ✅ **Linguagem visual dela:** muito **noise** (granulado) e **recorte e colagem**
- ✅ **Cinema:** terror, bruxas e Halloween, mais comédias românticas e "coisas de menina"
- ❓ **Sex and the City** (tem lista no Letterboxd só com filmes citados na série)

### Jeito de falar ("coisa do vale")

- ✅ Usa muita expressão do Twitter, que ela chama de "coisa do vale" ou "de gays": **"Diva"**, **"Mona"**, **"Fazer o barro"**, **"Fizeram piada do seu mousse"**
- ✅ Ama coisas "**apenas para gays e mulheres**", como o **Fiat 500** e o **BYD Dolphin**
- A brincadeira vem da série viral do influenciador Eduardo Emanuel, que classifica carros "de mulher e de gay": Fiat 500, BYD Dolphin, Mini Cooper, New Beetle, Peugeot 208, VW Nivus, Nissan Kicks, Nissan March, Honda Fit, HB20, C4 Cactus, Jeep Renegade e Mercedes GLA, entre outros ([AutoPapo](https://autopapo.com.br/noticia/carro-para-mulher-e-gay-confira-modelos/))

### Perfis

- Letterboxd: https://letterboxd.com/helefanta/ (**1.673 filmes** em 07/10/2026; 12 resenhas com nota, usadas na LP em `src/data/filmes.ts`)
- Spotify: https://open.spotify.com/user/helenabomb (perfil montado por JS; as playlists não são lidas sem login)
- Instagram: https://www.instagram.com/helefanta/ (exige login, não foi lido)
- Pinterest: https://br.pinterest.com/helefanta/
- Filmow: https://filmow.com/@helefanta (perfil antigo, ativo desde 2015)
- X: https://x.com/helefanta
- Threads: https://www.threads.com/@helefanta (exige login, não foi lido)
- Behance: https://www.behance.net/helefanta

### Frases dela

- X: _"vocês esperam muito de mim, tudo que eu tenho a oferecer é design, muito rock e taylor swift"_
- Pinterest: _"your favorite artist's favorite designer 💗👩‍💻✨"_
- Filmow: _"who knew evil girls have the prettiest face?"_
- Behance: _"Trazendo mais identidade e menos ruído para o seu negócio."_ (curioso: "menos ruído" no texto, muito noise no visual)
- Post fixado no X: _"infelizmente se for misógino e/ou falar mal da taylor e do paramore eu dou block sim"_
- Letterboxd, sobre _Sorry, Baby_ (5★): _"chorei muito vou ficar semanas pensando nesse filme"_
- Letterboxd, sobre _Minecraft_: _"duas estrelas só pelo jack black"_
- Letterboxd, sobre _What a Girl Wants_: _"único defeito é não tocar 'what a girl wants' da christina aguilera no filme"_
- Filmow, sobre _Senhora do Destino_: _"chamar de 'ruim' é elogio, esse aqui supera o insuperável!"_

### Cinema

**Spooky season.** Ela monta uma lista de terror para outubro **todo ano**, desde 2021: são 5 listas (2021, 2022, 2023, 2025, 2026). O aniversário dela cai no meio dessa tradição. A lista de 2026 tem 33 filmes e está em andamento.

- **spooky season 2026:** The Funhouse Massacre, Trick, WNUF Halloween Special, House of Fears, DeadTectives, Hellbent, Butterfly Kisses, The Deep House, Ghostwatch, Lake Mungo…
- **spooky season 2025:** Elvira, Trick 'r Treat, Lady in White, Casper, Scary Stories to Tell in the Dark, Sleepy Hollow, **Practical Magic**, The Witches of Eastwick, **The Craft**, Dark Shadows…
- **Melhores de 2023:** When Evil Lurks, Talk to Me, Infinity Pool, Evil Dead Rise, Hell House LLC Origins…

**Outras listas dela no Letterboxd**

- _filmes que me fizeram chorar:_ À Espera de um Milagre, Túmulo dos Vagalumes, **Vidas Passadas**, Lado a Lado, Agora e Para Sempre, Três Estranhos Idênticos
- _new years day:_ Harry & Sally, Sex and the City, Te Amarei para Sempre…
- _lonely:_ Encontros e Desencontros, Gravidade, Náufrago, WALL·E, As Vantagens de Ser Invisível…
- _must watch (marketing's version):_ Obrigado por Fumar, Fome de Poder, Do Que as Mulheres Gostam…

**Notas altas recentes (Letterboxd, 2026)**

- 5★: _Over the Garden Wall_ (06/10), _Sorry, Baby_, _Taylor Swift: The Eras Tour (The Final Show)_ (revisto)
- 4,5★: _The Invite_
- Revê com carinho: _What a Girl Wants_, _Barbie as the Island Princess_, Vingadores

**Favoritos do Filmow** (perfil antigo, 982 títulos)

- Terror e bruxas: _A Bruxa_, _Possessão_ (1981), _A Morte do Demônio_, _O Iluminado_, _Cemitério Maldito_, _Casei-me com uma Feiticeira_, _Scooby-Doo e o Fantasma da Bruxa_
- Outros: _Fleabag_ (T2), _O Castelo Animado_, _Violet Evergarden_, _Another_, _O Mágico de Oz_, _O Grande Hotel Budapeste_, _Aranhaverso_

### Trabalho (Behance)

- Design gráfico para marcas, eventos e redes sociais. No Behance desde out/2020.
- Projetos: mídia kit de influencer e social media para agência de marketing, importadora de Apple e empresa de software.

### Pinterest

- Pasta **"aniversario"**, uma referência direta para a LP:
  - bolos vintage _kitsch_ rosa, com confeitos e frases irônicas ("Not Thirty Yet", "MENOS 1 ANO DE VIDA")
  - **festa de aniversário com tema Halloween/terror**: "Have a Killer Birthday", Pânico (Scream), Ghostbusters, pipoca "sangrenta", aranhas, fantasminhas
  - convites com **foto de bebê recortada + chapéu de festa** (puro recorte e colagem)
  - quiz "Who knows the birthday girl best?"
- Pasta "aesthetic": vermelho, azul, botões vintage, café, Frankie Stein (Monster High), mãos de monstro, piano
- Outras pastas: `avril`, `archive` (referências de design gráfico), `amor-e-canela`, `amigas-em-rota`

### Ideias para a LP

- **Conceito:** "Helena's Spooky Season: edição de 28 anos". O aniversário vira o filme principal da temporada.
- **Linguagem:** pôster de filme / ingresso de cinema / VHS + setlist de show, com **noise e recorte/colagem** (fita adesiva, papel rasgado, fotos recortadas).
- **Paleta:** rosa (Hello Kitty, Taylor), vermelho (sangue fofo, cereja) e laranja (abóbora, Paramore _Riot!_).
- **Seções possíveis:**
  - hero como pôster de filme ("Helena, 28", com classificação indicativa de brincadeira)
  - "Créditos": os fatos dela no formato de ficha técnica
  - top filmes da Helena, como cards de VHS ou ingressos
  - setlist/tracklist: Taylor, Paramore, Hayley, Avril
  - contagem regressiva para os 3 shows da Hayley
  - linha do tempo curtinha do casal (os ~10%): 2022 → 17/12/2023 → 02/2024
  - quiz "quem conhece a Helena?"
  - bolo vintage rosa e chapéu de festa sobre uma foto dela
- **Easter egg:** a pintora xará.
