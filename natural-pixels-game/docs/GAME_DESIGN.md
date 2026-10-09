# Natural Pixels — Game Design

> Sandbox de simulação de elementos, inspirado no Powder Game (2011), com visual moderno e suave.
> Idioma do jogo: **inglês**. Idioma deste documento: português (nomes de elementos/código em inglês).

Deploy: `https://gustavomerling.github.io/natural-pixels-game/dist/` (estático, GitHub Pages).

---

## 1. Visão

O jogador desenha elementos numa tela e assiste eles interagirem sozinhos: água molha a terra,
semente brota e vira árvore, a árvore dá fruta, o pássaro come e espalha a semente; fogo embaixo de
uma panela de metal ferve a água, o vapor vira nuvem e chove; madeira queima em cinza, que aduba a
terra.

Pilares:

1. **Emergência** — regras simples por elemento, comportamentos complexos no conjunto.
2. **Componentização** — cada elemento é um módulo isolado; adicionar um novo não exige mexer no motor.
3. **Bonito, não "pixelado"** — a simulação é em grade, mas o renderer WebGL suaviza tudo.
4. **Tudo é partícula** — inclusive os animais. O jogador coloca tudo; o jogo não spawna nada sozinho
   (exceto o que nasce de reações: grama selvagem, frutas, folhas...).

---

## 2. Stack e restrições

| Item | Escolha |
|---|---|
| Build | Vite |
| UI (telas, menus, HUD, sidebar) | React + TypeScript, ícones `lucide-react` |
| Visual da UI | **cozy, papel e tons pastéis**: fundo creme com textura de papel, cartões de papel com sombra suave, poucas bordas, pastéis (sálvia, pêssego, manteiga, rosa, céu), texto marrom; Fredoka (títulos), Nunito (texto), Patrick Hand (detalhes); logo em pixel art (`ui/Logo.tsx`) |
| Simulação | TypeScript puro, sem React, em `TypedArray`s |
| Renderização | WebGL2 ("Smooth") com fallback Canvas 2D ("Pixel") |
| Som | WebAudio procedural (sem arquivos) |
| Deploy | `vite build` → `dist/` commitado; `base: './'` |
| Navegação | estado no React (sem router — GitHub Pages não tem fallback de rota) |

Regras:

- **React não toca na simulação a cada frame.** O loop roda em `requestAnimationFrame` dentro do
  `Sandbox`; o React só empurra configurações e eventos de ponteiro, e recebe stats 4×/s.
- **TS com `erasableSyntaxOnly`**: sem `enum` nem parameter properties.
- **Sem Web Worker por enquanto**: medido ~2,7 ms por tick numa grade 360×200 (60 ticks/s ≈ 16% de
  um núcleo). O motor é isolado do React, então mover para um Worker continua possível.

---

## 3. Telas

```
Splash ──(click / any key)──▶ Menu ──(Play)──▶ Game
                               ▲                 │
                               └──(Esc / Menu)───┘
```

- **Splash**: título, partículas caindo, "Click or press any key to start".
- **Menu**: Play · How to Play (controles, vida, calor) · Settings · About.
- **Game**:
  - **Topo (HUD)**: voltar ao menu, elemento + temperatura sob o cursor, relógio do dia (☀/☾),
    partículas, FPS, engrenagem de Settings.
  - **Sidebar à esquerda (30%)**:
    - *Simulation*: play/pause, passo, velocidade (0.5×–4×), limpar, ciclo dia/noite.
    - *Brush*: tamanho do pincel e borracha.
    - *Elements*: um accordion por família (`elements/categories.ts`), gerado do registro; estado
      aberto/fechado lembrado; ponto verde na família do elemento selecionado.
    - *Scene*: Save/Load rápido (navegador) e download/abrir arquivo `.npscene`.
    - Em telas ≤ 760px a sidebar vai para baixo do canvas.
  - **Canvas** ocupando o resto.

Atalhos: `1–9`, `0` elementos (na ordem da sidebar) · `E` / botão direito = borracha ·
`Espaço` pausa · `N` passo · `[` `]` pincel · `Esc` menu (ou fecha o painel aberto).

### Settings (persistidas no navegador — `app/settings.ts`)

| Opção | Valores |
|---|---|
| Graphics | Smooth (WebGL2) · Pixel (Canvas 2D nítido) |
| Grain size | Coarse (40k células) · Normal (72k) · Fine (120k) — vale para o próximo mundo |
| Day/night cycle | On · Off (dia eterno) |
| Weather | On · Off (chuva diária, tempestades) |
| Thought bubbles | On · Off |
| Sound | On · Off + volume |

---

## 4. Arquitetura

```
src/
  app/            App (máquina de telas), settings (store + provider)
  screens/        SplashScreen, MenuScreen, GameScreen
  game/           SandboxView (canvas ↔ motor), Sidebar, ElementPalette, SimControls,
                  SceneControls, SettingsPanel
  ui/             Button, Panel, Segmented, FallingParticles, useKey
  audio/          SoundEngine (WebAudio procedural)
  engine/
    Sandbox.ts    fachada: loop (passo fixo), pincel, renderer, cenas, stats
    grid.ts       estado em TypedArrays (+ camada `under`)
    simulation.ts passo: lifetime → umidade → update do elemento → movimento; depois calor
    context.ts    CellContext: API relativa que os elementos usam
    moisture.ts   absorção e difusão de umidade
    thermal.ts    condução, resfriamento, secagem, queima, mudanças de fase
    treefall.ts   árvores soltas (tronco sem apoio firme, 8 direções) caem inteiras
    daylight.ts   relógio do dia, luz, posição do sol/lua
    scene.ts      salvar/carregar cenas (gzip)
    brush.ts      pincel → células
    behaviors/    movimentos por matter: powder, liquid, gas, energy
    renderer/     webgl.ts + shaders.ts (smooth), canvas2d.ts (pixel), cellColors, sky
  elements/
    types.ts      contrato ElementDefinition
    registry.ts   lista de elementos (posição = índice numérico; ordem da sidebar)
    categories.ts famílias (rótulo + ícone) na ordem da sidebar
    core/         air
    terrain/      sand, soil, stone, mud, ash + fertility.ts
    water/        water, ice, steam, cloud
    plants/       seed, grass, wood, fruit, plant, leaf, litter + tissue.ts
    animals/      bird, bee, fish, worm + shared.ts
      human/      human.ts (elementos), body, mind, craft, senses, brain + tasks/
    fire/         fire, lava
    chemistry/    oil, acid, nitrogen, gunpowder
    materials/    metal, glass, plank, lamp
```

### 4.1 Grade (estado do mundo)

Grade `W × H` (tamanho calculado pela área do canvas e pelo "grain"). Structure of Arrays,
índice `i = y * W + x`:

| Array | Tipo | Uso |
|---|---|---|
| `type` | `Uint8Array` | índice do elemento (0 = ar) |
| `temp` | `Float32Array` | temperatura em °C (ambiente 20; o ar não guarda calor) |
| `water` | `Uint8Array` | umidade (terra, plantas) 0–255 |
| `data` | `Uint8Array` | estado livre por elemento (bits documentados em cada arquivo) |
| `life` | `Uint16Array` | timer livre por elemento; usado pelo motor em elementos com `lifetime` |
| `shade` | `Uint8Array` | variação de cor fixa por célula |
| `stamp` | `Uint32Array` | tick em que a célula se moveu (evita mover 2× no mesmo tick) |
| `under.*` | type/temp/water/data/life/shade | o que uma partícula está cobrindo ao passar por cima (pássaro/abelha dentro da copa). `moveOver` guarda o alvo e devolve ao sair; `place` limpa |

### 4.2 Passo da simulação

A cada tick (60/s × velocidade): o relógio do dia avança; a grade é varrida **de baixo para cima**,
alternando a direção horizontal. Para cada célula:

1. **Lifetime** — conta o `life`; ao acabar, vira `lifetime.into` (fogo → ar, vapor → nuvem, nuvem → água).
2. **Umidade** — absorve líquido vizinho e equaliza com um dos 8 vizinhos do mesmo grupo.
3. **`update`** do elemento — pode retornar `true` para pular o movimento.
4. **Movimento** do `matter` (powder, liquid, gas, energy). Densidade decide quem afunda.

Depois da varredura, o **passe de calor** (seção 4.5).

### 4.3 Contrato de elemento

```ts
interface ElementDefinition {
  id, name, description            // 'water', 'Water', tooltip
  category: ElementCategory        // família = pasta
  matter: 'empty' | 'static' | 'powder' | 'liquid' | 'gas' | 'energy'
  density: number                  // ar = 1
  color: { base, variation?, alpha?, wet? }
  icon: LucideIcon
  movement?: { slide?, spread?, viscosity?, rise?, drift?, sink? }
  moisture?: { capacity, group, absorbs?, flow?, bias? }
  thermal?: { conductivity?, initialTemp?, source?, above?, below?, burn? }
  lifetime?: { min, max, into? }
  reactions?: { with, chance, self?, other?, selfChance? }[]  // lava + água → pedra + vapor
  update?: (ctx: CellContext) => boolean | void
  describe?: (ctx) => string       // texto extra no hover (o que o humano está fazendo)
  thought?: (ctx) => Thought       // balão de pensamento { icon, text, hint? } (humano)
  brushFill?: number
  brushSingle?: boolean            // 1 por clique (humano)
  partOf?: { below }               // parte de um corpo multi-célula (cabeça/tronco do humano)
  hidden?: boolean                 // só surge por reação (plant, leaf, cloud, litter)
}
```

`color.emissive` (0..1) faz o elemento brilhar sozinho (lava, lâmpada): não escurece à noite e
ilumina os arredores. `thermal.insulation` (0..1) reduz a perda de calor para o ar (gelo derrete
devagar, lava fica líquida). Reações declarativas (`engine/reactions.ts`) testam um vizinho
aleatório por tick.

`CellContext` (relativo à célula atual): `get`, `set(dx, dy, id, { water?, data?, temp? })`,
`swap`, `moveOver`, `moveCell` (mover outra célula do corpo), `under`, `water/setWater`,
`data/setData`, `life/setLife`, `temp/setTemp`, `light()` (luz do dia), `random()` e
`memory(create)` — objeto persistente da célula (a "mente" do humano), chaveado pelo `life`,
que acompanha a célula e é salvo nas cenas. Células criadas por `set` só agem no próximo tick.

Adicionar um elemento = `elements/<família>/<id>.ts` + exportar no `index.ts` da pasta + incluir em
`registry.ts`. A sidebar (ícone, cor, atalho) se atualiza sozinha.

### 4.4 Umidade (`moisture`)

```ts
moisture?: {
  capacity: number        // máx. (≤ 255); 1 célula de água = 100 unidades
  group: string           // só troca com o mesmo grupo ('soil', 'plant')
  absorbs?: string        // líquido que absorve dos vizinhos
  flow?: number           // fração da diferença equalizada por troca
  bias?: 'down' | 'up'    // terra drena para baixo; seiva sobe
}
```

Atravessar grupos (raiz puxando da terra) é lógica do elemento (`plants/tissue.ts`).

### 4.5 Calor (`thermal`)

```ts
thermal?: {
  conductivity?: number             // 0..1 (metal 0.9, água 0.3, madeira 0.05)
  initialTemp?: number
  source?: number                   // mantém essa temperatura (fogo = 800)
  above?: { temp, into, chance? }   // água > 100 → vapor (chance 0.01/tick)
  below?: { temp, into, chance? }
  burn?: { at, temp?, rate, into? } // inflamável
}
```

Passe (`engine/thermal.ts`): fontes → condução entre vizinhos (cada par uma vez,
`min(condutividades) × 0.25`) → perda para o ar por lado exposto → células úmidas acima de 100 °C
secam → inflamáveis **secas** acima de `burn.at` queimam (se mantêm quentes, soltam chamas, viram
`burn.into`; água encostada apaga) → mudanças de fase. Com `chance` < 1 a célula fica presa na
temperatura de transição (calor latente).

Calibração (simulada sem navegador): panela com 133 células de água começa a ferver em ~3 s e seca
em ~15 s com fogo segurado; madeira seca queima toda em ~15 s; madeira molhada resiste a 2 s de fogo.

### 4.6 Dia e noite (`engine/daylight.ts`)

Dia de 3 min e noite de 45 s (o relógio anda em duas velocidades); mundos começam de manhã. `light` 0..1 com amanhecer/entardecer
curtos. Efeitos: plantas crescem a `0.1 + 0.9 × light` da velocidade; pássaros e abelhas dormem à
noite; o céu muda (estrelas, lua, crepúsculo) e o fogo ilumina os arredores. Desligado = sempre 10h.

### 4.7 Renderização

- **Smooth (WebGL2)** — `renderer/webgl.ts` envia duas texturas por frame (cor da célula; tipo +
  calor + shade) e `shaders.ts` desenha em resolução de tela olhando os 5×5 vizinhos de cada pixel:
  céu (gradiente, sol/lua, estrelas) → líquidos como superfície contínua com brilho na linha d'água
  e leve ondulação → sólidos/pós com cantos expostos arredondados e "escadas" suavizadas, luz de cima
  → gases como nuvens suaves → fogo aditivo com flicker e halo; material em brasa irradia luz.
- **Pixel (Canvas 2D)** — uma célula = um pixel, `image-rendering: pixelated`, mesmo céu e luz.
- **Zoom** (`Sandbox.camera`, `View` = canto do que aparece + zoom 1–6×): roda do mouse aproxima e
  afasta mirando no cursor; botão do meio (ou Shift + arrastar, com zoom) move a câmera; botões +,
  − e "mundo todo" no canto da tela. No modo suave o shader desenha só a parte à vista (`uView`,
  mesmo custo sem zoom); no modo pixel a tela é escalada por CSS (continua nítida). Pincel, balões
  e linhas de pesca acompanham a câmera.
  Também é o fallback se WebGL2 não existir ou o shader falhar.
- Cores por célula (`cellColors.ts`): paleta por elemento × shade × umidade (`color.wet`) + brasa
  acima de 350 °C.
- **Horizonte** (`renderer/horizon.ts`, espelhado no shader em `horizon()`): no lugar do céu só em
  degradê, três camadas de paisagem atrás do mundo — montanhas azuladas e enevoadas com **neve nos
  picos**, morros verde-acinzentados e colinas verdes com uma franja de **árvores** na crista (linhas
  de cume de value noise ao longo do mundo), mais baixas (cumes entre 42% e 75% da altura do
  mundo). Cores sólidas, sem transparência — mais claras e azuladas quanto mais longe — e mais
  escuras à noite; sol e lua se põem **atrás** das montanhas. Só aparece onde o céu aparece
  (em cavernas e galerias o fundo continua escuro). Modo pixel: as cristas são calculadas uma vez
  por coluna.
- **Luz e sombra** (`renderer/lighting.ts`, Settings → Light & shadow, ligado por padrão): um mapa
  de luz por célula, recalculado a cada 3 frames na CPU (~1–2 ms por frame). **Luz do céu** desce
  **em leque a partir do sol** (ou da lua): reta logo abaixo dele e mais inclinada quanto mais
  longe a coluna está (1,2 × a distância em fração da largura do mundo, até 0,6 célula para o lado
  por linha) — com o sol no meio, as árvores da esquerda fazem sombra para a esquerda e as da
  direita para a direita; com o sol baixo, todas para o lado oposto e mais longas (interpolada
  entre as duas células de cima, bordas suaves; fora do mundo vale a coluna da borda, nunca luz do
  nada) — ar não perde nada, água 6% por célula (fundo mais escuro), fundos onde se anda na
  frente (parede de mina, parede de casa, escadas, móveis) 7%, e terra/rocha/tábua 7,5% (a luz
  vai ~13 células chão adentro); depois espalha para os lados e em volta (15% por célula no ar),
  iluminando bocas de caverna e o topo de poços. **Sombra das árvores**: tudo abaixo da primeira
  folha (ou fruta, tronco) de uma coluna recebe 75% da luz do céu — sombra suave e uniforme na
  largura toda da copa, aplicada depois do espalhamento (o ar em volta não a apaga); o **ar** na
  sombra (o céu atrás) ganha um véu preto leve de 20% (canal azul do mapa de luz). **Pessoas e barcos**
  também fazem sombra (humanos, zumbis, esqueletos, barco: 75% da luz, na mesma direção do sol) no
  chão, na água e no ar ao lado — nunca em si mesmos (um corpo não escurece o outro, mas a sombra
  de uma árvore escurece quem está embaixo dela).
  Janelas deixam entrar luz do dia nos cômodos. **Luz própria** (tochas, fogueira, lâmpadas, lava,
  fogo, cogumelos brilhantes, a tocha do humano; vagalumes fracos) se espalha ~10 células no aberto
  e ~2 dentro de sólidos, em tom quente e tremulando. O shader amostra o mapa com filtro linear
  (sombras suaves): brilho = luz do céu × hora do dia + luz própria; onde não chega luz do céu, o
  **fundo vira caverna escura** em vez de céu. Resultado: **mina sem tocha é escura** de verdade
  (e o humano acende a tocha dele sempre que está na mina); rocha funda fica na penumbra (13%,
  minérios ainda visíveis; ouro e ametista brilham um pouco). O modo pixel usa o mesmo mapa.

### 4.8 Cenas (`engine/scene.ts`)

Cabeçalho JSON (dimensões, ids dos elementos por índice, hora do dia) + todos os arrays da grade,
comprimidos com gzip (`CompressionStream`). Os ids permitem carregar cenas depois de adicionar ou
reordenar elementos. Cena de outro tamanho é colocada alinhada embaixo e centralizada. Save rápido
fica no `localStorage` (base64); arquivos usam a extensão `.npscene`.

### 4.8b Mundo aleatório (`engine/worldgen.ts`)

Todo jogo começa num mundo aleatório novo (gerado ao abrir a tela de jogo); o botão **Random world** (seção Scene) sorteia outro. Sorteia um estilo (plano, ondulado ou montanhoso; 0–3
lagos; mais ou menos árvores) e gera: relevo com value noise 1D, terra fina (4–12% da altura, a pedra e os minérios ficam ao alcance)
sobre pedra (com veios de carvão, ferro, prata e ouro), topos de morro de pedra pura, lagos com peixes em bacias forradas de areia no fundo e nas margens, 2 de espessura (a terra não bebe a
água) cheios até a borda mais baixa, manchas de areia, pedregulhos, bandos de galinhas, árvores já crescidas (tronco
vivo com topo que continua crescendo, às vezes um galho, copa com frutas), grama nas campinas e
minhocas na terra. Simulado: água, árvores e minhocas estáveis após 60 s, ~3 ms/tick.

**Cavernas** (`engine/caves.ts`, `carveCaves`, entre os lagos e as manchas de areia): 1–4 sistemas
por mundo (largura/160 × um sorteio de estilo), túneis por passeio aleatório com pincel de raio
1–3, salões ovais de vez em quando e até 2 níveis de ramificação; só em pedra/minério, ≥ 8 células
abaixo do topo da pedra, longe dos lagos e, perto do meio do mapa (onde o humano começa), ≥ 20
abaixo da superfície. Como pedra e minério **caem** (pó sem deslizar), todo teto vira **parede de
mina** (estática, escura) e terra/areia ao lado de uma caverna vira pedra — nenhum teto desaba.
Dentro: **lagos subterrâneos** (45% dos salões, bacia de pedra, peixe nos maiores), **cogumelos
brilhantes** no chão, **minério exposto** nas paredes (tipo pela profundidade) e estalagmites de
pedra; em ~1 de 3 mundos uma **boca** se abre numa encosta. Com a iluminação, cavernas são escuras,
iluminadas pelos cogumelos e minérios brilhantes. Também nascem **ovelhas e vacas** soltas nos
campos, longe do meio do mapa.

### 4.8c Tempo (`engine/weather.ts`)

Chove **10% de cada dia** (dia + noite = 13.500 ticks) num horário sorteado no começo do dia; 30%
das chuvas são **tempestades**. A chuva entra e sai em rampa (`rain` 0..1, exposta aos elementos
por `ctx.rain()`) e vem de nuvens criadas no topo do céu (cada célula de nuvem vira 1 gota). Na
tempestade caem **raios** (`fire/lightning.ts`): um traço em zigue-zague até o primeiro sólido, que
esquenta a 900 °C (árvores, grama e casas pegam fogo) e um clarão (`flash`). Os renderers recebem
`overcast` (céu cinza, mundo mais escuro, sol apagado), `flash` e `rainbow` (arco-íris por ~30 s
depois de uma chuva sem tempestade, de dia). **Vento** (`wind`, −1..1): muda de direção e força
a cada ~1 min e entra devagar (mais forte nas tempestades); gases (fumaça, vapor, nuvens) derivam
para o lado dele (`behaviors/gas.ts`). Em noites limpas, **estrelas cadentes** cruzam o céu de vez
em quando (shader, a cada ~7 s com 60% de chance). 30% dos arco-íris vêm **duplos** (um segundo
arco por fora, mais fraco, cores invertidas).

**Eventos raros** (`engine/events.ts`, sorteados a cada dia; o mundo conta os dias em `sim.day`,
`ctx.day()`): **eclipse** (10% dos dias: a lua cobre o sol por ~15 s, sobra a coroa; o dia escurece
85% e bichos e zumbis agem como se fosse noite), **aurora** (15% das noites: cortinas verdes e
violeta no céu), **chuva de meteoros** (15% das noites: estrelas cadentes a cada ~1 s e alguns
**meteoros** de verdade que caem inclinados deixando fumaça e viram uma **estrela caída**
(`meteorite`, brilha; na água viram vapor; não queimam nada) — o humano recolhe: 2 ferros, às
vezes ouro) e o **mercador ambulante** (30% dos dias, de manto roxo, ver 5.2). Eclipse, aurora e
chuva de meteoros entram no diário de todo mundo.

**Peixes pela água** (`engine/fishery.ts`): a cada 10 s a água é mapeada em corpos (água, algas e
peixes ligados lado a lado) e cada corpo com 30+ células ganha peixes até **5 a cada 30 células**
(30 → 5, 60 → 10...), um de cada vez, embaixo da superfície — lagos novos, baixadas alagadas e
poças grandes de chuva ganham peixes sozinhos, e lagos pescados se repovoam. **Peixe vira sapo**:
de vez em quando um peixe na superfície, encostado na margem, sobe para a terra como sapo (se há
menos de 3 sapos por perto).

**Madeira bebe poças** (`materials/soak.ts`): troncos, tábuas, parede de fundo, portas, cercas e
escadas somem com a água rasa encostada neles (ou a até 3 células ao lado, no mesmo nível): 2% de
chance por tick, só poça aberta para o céu e com até 2 de fundo — lagos e a água embaixo do píer
não. A chuva não empoça mais entre árvores e casas.

Efeitos: água parada evapora no sol (vapor → nuvem → chuva, fecha o ciclo); a água **corre por
cima da grama e das flores** sem apagá-las (ficam embaixo, `Simulation.seeps/relocate`); minhocas
sobem à superfície na chuva; pássaros e abelhas se abrigam; humanos vão para casa e não regam.

### 4.9 Som (`audio/SoundEngine.ts`)

WebAudio procedural, liberado no primeiro clique/tecla. Camadas guiadas pelas contagens de
elementos (4×/s): estalos ∝ fogo, bolhas ∝ vapor, chuva ∝ nuvens, piados ∝ pássaros (de dia),
zumbido ∝ abelhas, grilos à noite se houver grama. Silencia com o jogo pausado.

---

## 5. Elementos

| Família | Elemento | Matter | Na sidebar | Resumo |
|---|---|---|---|---|
| Terrain | Sand | powder | ✅ | escorre em montes, afunda na água |
| | Soil | powder | ✅ | absorve água (escurece), aduba com cinza/folhas (`data` = fertilidade), vira lama saturada |
| | Mud | liquid viscoso | ✅ | terra encharcada; escorre devagar e seca de volta (rápido com calor) |
| | Ash | powder leve | ✅ | resto de fogo; se mistura na terra e aduba |
| Water | Artesian Spring | static | ❌ | empurra água para cima pela coluna acima dela enquanto as duas laterais forem fechadas (até 24): enche um poço até a boca e repõe o que é tirado, sem transbordar (`water/spring.ts`) |
| | Water | liquid | ✅ | escorre, encharca a terra, ferve a 100 °C (calor latente). `data` = algas: folha seca que encosta apodrece nela e a deixa verde; o verde se espalha e some bem devagar |
| | Steam | gas | ✅ | sobe (atravessa água), vira nuvem após ~10 s |
| | Cloud | gas lento | ❌ | deriva; cada célula vira 1 gota de chuva |
| Plants | Seed | powder (flutua) | ✅ | enterra-se 2 células na terra; brota com umidade (mais rápido em terra fértil) |
| | Grass | static | ✅ | cobre terra úmida, se espalha (mais em terra fértil, de dia); surge sozinha às vezes |
| | Wood | static | ✅ | tronco (vivo se `WOOD_TREE`) ou material de construção; queima em cinza. Tronco/galho que não toca nada firme (terra, pedra, construção, madeira pintada), nem na diagonal, cai inteiro com folhas e frutos até apoiar (`engine/treefall.ts`) |
| | Fruit | powder (flutua) | ✅ | nasce na copa; pássaros comem; caída apodrece em semente |
| | Plant | static | ❌ | caule crescendo |
| | Leaf | static | ❌ | copa; dá fruta (15× se polinizada); envelhece e cai. Sem corrente de folhas até alguma madeira (8 direções), seca e cai (`engine/treefall.ts`) |
| | Dry Leaf | powder leve | ❌ | folha caída; apodrece e aduba; muito inflamável; some em até ~1 min (esfarela e aduba a terra de baixo) |
| | Wheat | static (2 células) | ✅ | cresce em terra úmida de dia, amadurece dourado (Ripe Wheat); o humano cultiva |
| | Flower | static | ✅ | nasce na grama ao sol; abelhas visitam e se multiplicam perto delas |
| | Mushroom | static | ✅ | nasce em terra úmida à sombra das árvores; o humano come |
| Creatures | Bird | static (move-se) | ✅ | voa através das árvores, come fruta, solta a semente longe, pousa e dorme |
| | Bee | static (move-se) | ✅ | voa pelas copas polinizando folhas; descansa; para à noite |
| | Fish | static (move-se) | ✅ | nada só na água; fora dela morre; água quente cozinha; dois peixes juntos às vezes geram outro (até 6 num raio de 12), então lagos não se esgotam |
| | Worm | static (move-se) | ✅ | cava a terra adubando; fareja folha seca/cinza no chão (até 8 células) e vai atrás; atravessa a grama de baixo para cima para comer (a grama fica) |
| | Human | static (3 células) | ✅ | vive sozinho estilo Minecraft (seção 5.2) |
| | Zombie | static (3 células) | ✅ | nasce à noite longe das casas, persegue humanos, queima no sol; às vezes deixa pólvora |
| | Rabbit | static (move-se) | ✅ | pula pelo chão, come grama e trigo, tem filhotes (até 4 por região); cerca barra |
| | Chicken / Chick / Egg | static / powder | ✅ | galinha anda e cisca grama, sementes, minhocas e trigo; bota ovo (~90 s) que, se ninguém pegar, choca em ~40 s (50% férteis; até 4 aves num raio de 24) num pintinho que vira galinha em ~1 min; ovo velho estraga; humanos colhem ovos como comida (`animals/chicken.ts`) |
| | Firefly | static, brilha | ✅ | sai da grama à noite, voa baixo, some de dia ou na chuva |
| Terrain | Stone | powder sem deslizar | ✅ | rocha em blocos: cai reto e empilha (gravidade); minerada com picareta; derrete a 1100 °C |
| | Coal / Iron Ore / Silver Ore / Gold Ore / Sulfur / Saltpeter | como pedra | ✅ | veios dentro da pedra (carvão raso e comum → ouro fundo e raro; salitre raso, enxofre médio; `worldgen.ts`). Picareta mínima: carvão madeira, ferro/enxofre/salitre pedra, prata/ouro ferro (`terrain/ore.ts`) |
| Water | Ice | powder sem deslizar | ✅ | cai e empilha como bloco, flutua na água; −60 °C, derrete devagar; água vira gelo abaixo de 0 °C |
| Fire | Fire | energy | ✅ | sobe, vida curta, 800 °C, aquece o que toca; água apaga |
| | Lava | liquid viscoso, brilha | ✅ | 1200 °C; endurece em pedra; + água → pedra + vapor; derrete areia em vidro |
| Chemistry | Oil | liquid (flutua) | ✅ | pega fogo a 120 °C; a chama corre pela poça |
| | Acid | liquid | ✅ | corrói quase tudo e se gasta; vidro e metal resistem |
| | Liquid Nitrogen | liquid | ✅ | −196 °C, congela água, apaga fogo, evapora |
| | Gunpowder | powder | ✅ | explode com calor/chama (raio 5), em cadeia; pedra/metal/vidro resistem |
| Materials | Metal | static | ✅ | sólido flutuante, ótimo condutor de calor |
| | Glass | static transparente | ✅ | areia derretida; à prova de ácido |
| | Plank | static | ✅ | tábua (o humano fabrica); queima em cinza |
| | Lamp | static, brilha | ❌ | ilumina a noite sem calor |
| | Back Wall | static | ❌ | parede de fundo da casa: humanos passam na frente; chuva e areia não |
| | Mine Wall | static | ❌ | fundo escuro do túnel da mina: humanos passam na frente; nada mais entra (não desaba nem alaga) |
| | Torch | static, emissivo | ❌ | ilumina a mina; humanos passam por ela; feita de carvão + tábua |
| | Smoke | gas | ✅ (Fire) | fumaça de fogueira, chaminé e fogo: sobe, deriva e some; não é água |
| | Campfire / Furnace | static, emissivo | ❌ | fogueira e fornalha (com chaminé): iluminam e soltam fumaça, sem calor |
| | Statue / Gold Statue / Tiki / Workbench / Anvil | static | ❌ | o que o humano constrói no quintal (`materials/decor.ts`); humanos passam na frente |
| | Skeleton | 3 células | ✅ | surge nas galerias da mina enquanto o humano descansa; luta como zumbi; deixa ossos |
| | Butterfly | static voador | ✅ | voa de flor em flor de dia (cores variadas), pousa à noite; flores ao sol trazem novas (até 3 por região); vive 2,5–5 min |
| | Frog | static | ✅ | pula nas margens (salto longo), nada, come vagalumes/abelhas/borboletas; filhotes em noites perto da água (até 5) |
| | Duck | static | ✅ | boia na superfície dos lagos e rema devagar; em terra anda |
| | Snail | static | ✅ | sai da grama na chuva, rasteja devagar, some quando seca e faz sol |
| | Bat | static voador | ❌ | só nas galerias da mina; voa e cochila pendurado |
| | Beehive | static | ✅ | no tronco das árvores; enche de mel de dia e solta abelhas (até 4 por perto); cai se a árvore some |
| | Glow Mushroom | static, brilha | ✅ | brilho azul-verde; nasce no piso de minas antigas |
| | Seaweed | static | ✅ | **algas** que sobem do fundo dos lagos (até 6 de altura, nunca até a superfície) e se espalham pelo fundo (até 6 raízes por região); só existem embaixo d'água — cada uma esconde a água em que cresceu (volta quando ela some), morre fora d'água ou solta do fundo. Peixes passam por dentro delas sem criar nem gastar água. A geração do mundo põe algas em ~30% das colunas do fundo de cada lago |
| | Amethyst | como pedra, brilha | ✅ | veios fundos e raros; tesouro |
| | Mine Post / Scarecrow / Bench | static | ❌ | poste da galeria; espantalho e banco do quintal |

| | Back Window / Painting / Table / Chair / Bookshelf / Flowerpot | static | ❌ | móveis e decoração das casas: humanos passam na frente; a janela de fundo é translúcida (mostra o céu) |
| | Door | static | ❌ | humanos atravessam; zumbis, água e areia não |
| | Ladder | static | ❌ | humanos sobem e descem por ela |
| | Fence | static | ❌ | barra coelhos (2 de altura); humanos atravessam |
| | Bed | static | ❌ | cama da casa; o humano dorme nela |
| Fire | Lightning | static, brilha | ❌ | raio de tempestade, 3000 °C por um instante |
| | Shot | static, brilha | ❌ | rastro do tiro do mosquete |
| | Boat | static | ❌ | barco do humano (5 células + proa/popa); cobre a água; fica ancorado quando ele desce |

### 5.1 Ciclos

**Planta → árvore**
1. Água encharca a terra (1 célula de água = 100 unidades; terra guarda 200).
2. Semente se enterra até 2 células e brota quando a terra encostada tem umidade ≥ 60. Caule
   enterrado atravessa a terra até a superfície.
3. O caule cresce quase reto consumindo água (raiz puxa da terra; seiva sobe pelos 8 vizinhos),
   solta folhas laterais, e a partir da altura 9 para e forma um tufo de folhas no topo.
4. O caule amadurece e vira madeira **estritamente do chão para cima** (só com madeira/terra
   embaixo), soltando as folhinhas laterais; quando chega à ponta, ela vira o topo do tronco.
5. O tronco sobe fino e quase reto (inclina 8% das vezes) só com um tufo, largando as folhas que
   deixa para trás. A partir da altura 20 vira copa: bifurca em galhos que abrem para fora e a copa
   cheia cresce em volta deles, até a altura 31. Adulto, gasta a água mantendo a copa cheia.
6. Folhas envelhecem (~1 min) e caem como folha seca, que apodrece e aduba a terra.
7. Tudo cresce mais de dia; terra fértil acelera brotar, beber e a grama.

**Fruta → pássaro → semente**
1. Folha de copa bem regada pendura uma fruta (nunca a < 3 células de outra); abelhas polinizam e
   multiplicam por 15 a chance.
2. Fruta presa não cai enquanto tiver galho/folha encostado (o `update` pula o movimento).
3. O pássaro faminto enxerga fruta a 10 células, atravessa a copa (`moveOver`), come, voa numa
   direção e solta a semente em pleno voo depois de 2,5–6 s (~75–180 células).

**Água**
Fogo → panela de metal conduz → água ferve (fica em 100 °C) → vapor sobe → nuvem após ~10 s →
chuva (1 gota por célula de nuvem) → rega terra e árvores.

**Fogo → cinza → solo**
Fogo seca e incendeia madeira/folhas/grama secas; madeira vira cinza; cinza e folhas caídas se
misturam na terra (fertilidade); minhocas aceleram isso.

### 5.2 Humano (`elements/animals/human/`)

Coluna de 3 células: pés (`human`, que pensa), tronco (`human_body`, ou `human_torch` com a tocha
acesa) e cabeça (`human_head`), movidas juntas com `moveCell`. O `Body` (`body.ts`) serve a
humanos e zumbis via `BodyKind` (o que atravessa, o que é plataforma, se escala). Humanos
atravessam ar, grama, folhas, troncos, frutas, água e as partes da casa (fundo, porta, escada,
cama, cerca); **paredes e janelas** (tábua, vidro) eles atravessam de lado mas pisam em cima como
piso e telhado, então **só sobem andares pela escada** e nunca escalam a casa. Sobem degraus de 1,
escalam paredes naturais, caem, e cavam quando ficam presos (terra à mão, pedra com picareta).
Dois humanos que se encontram **trocam de lugar** (não colidem). Poça pequena no caminho (≤ 40
células) ele tira com as mãos e joga para trás (`bail`). Age ~12×/s.

**Água**: não anda pelo fundo. Na água ele **nada** com a cabeça para fora (sobe se a cabeça
afunda, desce até o tronco molhar). Na margem, com água à frente (no nível dos pés ou até 5
células abaixo), constrói um **barco** (5 tábuas), põe na água e pula no meio dele para **remar**.
O barco (`materials/boat.ts`, oculto da paleta) tem 5 células de casco (150% da altura do humano)
e proa/popa levantadas; cada célula **cobre** a água sem destruí-la (`Grid.cover`/`reveal`). Ao
remar, o barco inteiro anda junto. Quando a proa encosta na margem ele pula para a terra e o barco
**fica ancorado** na água; qualquer humano que for atravessar dali pula nele de novo (sem gastar
tábuas). Só usa barco para atravessar até um destino do outro lado (não para encher o balde ou
pescar). Nadando, se tiver tábuas, constrói um barco ali mesmo. Não minera pedra debaixo d'água.
Um barco por humano: ao construir um novo, o anterior (`Mind.boatAt`) é desmontado. O barco desce junto com o nível da água (lago que seca ou infiltra) até boiar de novo ou encalhar; peixes na superfície não o bloqueiam.

**Mente** (`mind.ts`, na memória da célula): tarefa atual, fome (0–100), inventário (toras,
tábuas, pedra, carvão, ferro, prata, ouro, tochas, comida, sementes, balde cheio), ferramentas
(picareta/machado/espada de madeira, pedra ou ferro; balde), casa, obra em andamento, mudas plantadas. O hover mostra tudo isso.

**Crafting** (`craft.ts`, automático): 1 tora → 4 tábuas · 3 tábuas → picareta de madeira
(necessária para pedra) · 3 tábuas → machado · 3 pedras + 2 tábuas → picareta/machado de pedra ·
3 tábuas → balde · 1 tábua + 1 pedra → lâmpada · 5 tábuas → barco (na margem) · 2 tábuas →
espada de madeira · 2 pedras + 1 tábua → espada de pedra · 1 pólvora + 3 tábuas + 2 pedras →
mosquete · 1 carvão + 1 tábua → 4 tochas · 3 ferros + 2 tábuas → picareta/machado de ferro ·
2 ferros + 1 tábua → espada de ferro. 1 carvão + 1 enxofre + 1 salitre → 3 pólvoras. Toras viram tábuas todas (um estágio da casa exige as
tábuas na mão). Prata e ouro são tesouro.

**Mina** (`tasks/shaft.ts`): uma **cobra** de túnel, nunca escavação livre (que derrubaria a rocha
de cima). Cada célula aberta faz parte de um segmento: **vertical** (poço com escada de mão, até 5
linhas por vez) ou **horizontal** (galeria de até 10 colunas por vez, 4 de altura, **parede de mina**
escura e lisa ao fundo — sólida para tudo menos pessoas, então nada desaba —, piso de tábua sobre
buracos; sempre nivelada — toda descida é pelos poços). **Padrão fixo**: a cada 3 colunas um
**suporte** — **poste de madeira** (`mine_post`) no fundo, **tocha** no poste (se tiver) e **viga
de tábua** no teto; as outras 2 colunas são só fundo escuro. Andando pelas galerias (`tendMine`) ele
põe tudo nesse padrão (poste, tocha e viga onde faltam; tochas fora do lugar voltam para o
inventário; buracos no fundo são tapados), então galerias antigas ficam iguais às novas.
Começa além da casa máxima e do quintal (lado oposto à lavoura, em terra seca), mira o minério que
mais quer (ferro sem ferramentas de ferro, carvão com poucas tochas, depois prata/ouro; ±45 colunas,
até 45 de fundo) e vai até ele em zigue-zague: desce pelo poço até a linha do minério quando ele está abaixo dos pés (minério acima da galeria é deixado),
senão anda de lado. **Espaçamento**: poços a ≥ 15 colunas uns dos outros (se um novo ficaria perto, segue a galeria antes) e galerias com ≥ 2 linhas de rocha entre si onde se cruzam (desce antes; se o minério não está mais abaixo, desiste dele). Chegando a um minério, mira o próximo perto da ponta da mina; minério colado no túnel (paredes, teto, piso) também sai — só o minério, o buraco vira parede de mina. Galeria cai **uma coluna inteira por vez** (custo do bloco mais duro). **Cansaço de mina** (`Mind.mineTired`, barra no painel): +0,2 por ação de trabalho; em 100 (~40 s) diz "Phew, tired…", sobe e vai **descansar em casa**; recupera **só fora da mina**: 0,1/ação, 0,25 descansando ou dormindo; só volta com ≤ 20.
Enquanto ele descansa, a mina ganha vida: **morcegos** (até 3, voam pelas galerias e cochilam
pendurados no teto, nunca saem; `animals/bat.ts`), **cogumelos brilhantes** no piso entre os
suportes (até 8; `plants/glowshroom.ts`, também na paleta) e **esqueletos** (até 2 por mina,
`spawnSkeleton`; `animals/skeleton.ts`): andam pelas galerias (na frente da parede de mina), não
sobem escadas, atacam como zumbis e se desfazem ao sol. São para ser enfrentados: na mina ele luta
(foge só com menos de 35% de vida), e com espada de pedra/ferro ou mosquete carregado enfrenta
qualquer monstro, seja qual for a coragem. Esqueleto derrotado deixa **2 ossos**: regando uma muda
com um osso no inventário, ele espalha **farinha de osso** (terra em volta da muda com fertilidade
máxima, "Bone meal!"). A mina também tem **ametista** (veios fundos, brilha, picareta de ferro):
tesouro. Terra 1 ação, rocha 8 ÷ picareta; só vai com 12+
tábuas. Guarda tudo (pedra, minérios — grita "Iron!" —, terra). `Body.mineRoute` percorre a cobra
segmento a segmento (lembra em qual está, `Mind.mineSeg`), descendo/subindo escadas; no topo de
cada poço ele **sobe um bloco acima da escada** e fica em pé em cima dela (o topo de uma escada é
chão firme para quem não está agarrado nela), e dali anda — subindo um calombo de terra ao lado se
houver. Seguindo a rota da mina (ou a escada da casa) não conta como "preso" mesmo se o caminho se
afasta do destino por um tempo; dentro da mina nunca abre túnel livre. Num poço curto (1 degrau,
no nível do piso da galeria de cima) ele reconhece que já está no fundo dele e segue para a
galeria seguinte (antes ficava tentando descer de novo: "can't find a way"). **Mina encerrada**
(cavada até o fim, ou bloqueada de vez — 4 viagens sem cavar nada): ele abre **outra mina** a
partir da superfície, 30 colunas mais longe de casa e longe das antigas (`Mind.oldMines`), até 4
minas no total. Plano em `Mind.shaft` (v3).

**Navegação**: preso, o humano cava o que estiver no caminho em qualquer tarefa (terra à mão,
pedra com picareta; nunca dentro ou embaixo da casa atual). A mineração de pedra também nunca
tira pedra da casa (nem até 6 linhas abaixo do alicerce, onde os buracos foram aterrados) nem pedra
que sustenta algo construído (casa, muro, poço, estátua...). "Can't get there… (X in the way)"
mostra o que bloqueia (ou "too high up" / "too far down"). Para contornar o terreno: **pula** vãos
de até 2 células com chão firme do outro lado; vãos mais largos (≥ 3 de fundo) e água estreita
(até 5) ele atravessa com **ponte de tábua**; com o alvo bem acima e nada para escalar, monta uma
**escada de mão** (1 tábua por degrau) e sobe; sobe qualquer escada de mão que encontrar. Essas
escadas e pontes são **andaimes** (`Mind.scaffold`): quando ele se afasta mais de 6 células (e não
há ninguém nelas), desmonta e recupera as tábuas; a escada da casa e a do poço não entram nisso. Andar
sem chegar mais perto por 30 ações conta como preso. Bichos pequenos (minhoca,
coelho, pássaro, abelha, peixe) não bloqueiam. Corta a árvore em qualquer altura do tronco que
alcançar. Escondido de um zumbi de dia por muito tempo, perde a paciência e ganha coragem. Luta sem resultado por 400 ações (zumbi inalcançável): desiste e só reage a zumbis colados nele por ~25 s. Golpe alcança o mesmo que o braço (3 acima). Pesca da margem (para em terra a até 4 células da água) com linha de pesca **vetorial** (SVG de 1 px sobre o canvas, com boia; `Mind.cast` → `Sandbox.onLines` → `game/FishingLines.tsx`), e só espera se houver peixe a até 12 células. Escadas de mão são desenhadas com degraus (linhas claras e escuras alternadas, `color.stripes`).

**Sono pelo cansaço** (`Mind.tired`, 0–100, barra "Tiredness" no cartão): cada ação acordado soma
0,022 (cansado depois de ~6 min de dia tranquilo), trabalho pesado mais (cortar árvore, minerar
pedra, construir, nivelar, poço, cercado, luta) e a **mina** +0,2 por ação; descansar em casa tira
um pouco. Com 80+ ele vai para a cama (ou dorme onde está, sem casa) **a qualquer hora**, e dorme
até descansar (0,4 por ação, 30% mais rápido com cobertor) — a noite não manda mais dormir. Na
mina, esgotado (100) ele sobe e vai dormir; só volta a minerar com cansaço ≤ 50.

**Cérebro** (`brain.ts`), em ordem de prioridade:
1. **Zumbi ou esqueleto a 14 células** → luta (se corajoso — `courage` sorteada —, com ≥ 50% de vida e armado,
   ou sem casa; bem armado sempre luta; dentro da mina luta até 35% de vida) ou corre para casa e espera atrás da porta até sumirem (`tasks/combat.ts`).
2. Noite → vai para a cama e dorme **parte da noite** (220–420 ações); acordado, fica em casa ou
   passeia com **tocha** (tronco brilhante que ilumina em volta).
3. Fome ≥ 50 come do inventário; ≥ 60 sem comida → colhe trigo, fruta/cogumelo ou pesca.
4. Sem casa → derruba árvores → fabrica ferramentas → minera pedra **de lado** (só pedra que dá
   para alcançar em pé ao lado dela — penhasco, rocha, parede de caverna; nunca cava buraco reto
   para baixo; a pedra funda vem da mina; sem pedra à vista, cava uma escada) → constrói a casa (estágio 1). Terreno (`findSite`): reto na largura do estágio 2 e
   sem água nem árvores em toda a área da casa máxima (até 30 colunas); sem nenhum assim, aceita um
   só reto sob a casa. Desníveis de até 4 sob o alicerce são aterrados de baixo para cima.
   Se o próximo estágio ficar bloqueado 12 vezes seguidas (água, rocha, barranco — árvore ele
   derruba), procura um terreno ideal até 90 colunas e constrói ali a casa já no estágio seguinte;
   pronta, **desmonta a antiga** (guarda as tábuas e pedras) e recomeça lavoura e mina ao lado.
5. Com casa → chuva forte ou fim de tarde: vai para casa. **Cresce a casa** quando dá (se uma
   árvore atrapalha, derruba); senão junta material para o próximo estágio. Pega pólvora, cuida da
   **lavoura**, rega mudas, planta árvores, mantém estoques, cava a **mina**, perfura o **poço** —
   essas tarefas opcionais são tentadas em **ordem aleatória** a cada escolha (não espera a casa
   máxima para minerar); às vezes só **passa tempo em casa** (`tasks/relax.ts`, em qualquer andar);
   senão passeia. Só derruba árvores adultas (tronco ≥ 10). Come ovos, frutas, cogumelos e peixes.

**Poço artesiano** (`tasks/well.ts`): com lavoura, 14 pedras e 2 tábuas, perfura (de cima, ao lado)
um poço 2 colunas além da ponta da lavoura: 6 de fundo, revestido de pedra dos dois lados, borda de
tábua e **nascente** no fundo; a água sobe sozinha até a borda e regar fica perto. Lixo que cai
dentro (folhas, sementes, areia, terra, pedra...) é **lavado para fora**: a nascente troca por água
o que estiver no poço revestido, então ele sempre enche.

**Quintal decorado** (`tasks/decor.ts`, tarefa `decorate`, só quando não está juntando material
para a casa): uma coisa por vez, nesta ordem, conforme o estágio e o estoque (sempre guardando 14
tábuas; se não acha lugar para uma, passa para a próxima): **fogueira** (est. 1, 3 tábuas),
**jardim** de 5 flores (est. 1, de graça, só em terra; replanta quando faltam 2+ flores), **banco**
(est. 1, 3 tábuas), 2 **tochas tiki** (est. 2, 2 tábuas + 1 tocha), 2 **postes de luz** (est. 2,
cerca + lâmpada: 3 tábuas + 1 pedra), **espantalho** (est. 2, 4 tábuas, junto à cerca da lavoura,
fora da casa e do poço: coelhos a até 12 colunas não comem trigo), **cercado** (est. 2, 14 tábuas: cercas
de 2 de altura nas pontas, um canto coberto com feno — para ovelhas e vacas), **píer** (est. 2, 10
tábuas + 1 pedra, na margem do lago mais próximo),
**estátua** de pedra (est. 2, 10 pedras), **oficina** (est. 2, 26 tábuas + 10 pedras + 1 ferro:
galpão de tábua com **fornalha** e chaminé atravessando o telhado, bancada, bigorna e tocha),
**torre de vigia** (est. 3, 48 tábuas + 1 tocha: pernas de cerca, escada de mão até um mirante a 11
de altura com parapeito e telhado) e **estátua de ouro** (est. 3, 7 ouros + 3 pedras). Cada uma em
terreno plano e livre (sem árvore nem água por perto) além de onde a casa máxima chega, longe da
lavoura, do poço e da entrada da mina; construída de baixo para cima, um bloco a cada 2 ações. Lugar
inalcançável 3 vezes: desiste e recupera o material. Mudando de casa, desmonta tudo (guarda o
material). Nas horas livres (`relax`, sem chuva) ele **se aquece na fogueira** (bem mais ao
anoitecer; à noite **canta** lá), **senta no banco**, **mexe na oficina** ou **sobe na torre**
para vigiar (de dia) ou **ver estrelas** (à noite), descendo pela escada depois. Em casa, o lugar
onde fica decide o que faz: **lê** perto da estante, **toma chá** na mesa, **rega o vaso** ou olha
pela janela. Em casa ao anoitecer (ou dormindo), a **chaminé** solta fumaça do topo do telhado.
**Peixe** pescado vem **cru** (`inv.fish`, mata 28 de fome em vez de 35); com fogueira ele vai
**assar** (`tasks/cook.ts`, 24 ações por peixe → comida). **Mel**: colmeias cheias são colhidas
como fruta (2 comidas; 30% de chance de ferroada, −5 de vida).
**Fogos que não queimam**: fogueira, fornalha e tochas iluminam mas não esquentam nada; fogueira e
topo da chaminé soltam **fumaça** (`smoke`: gás cinza que sobe, deriva e some em 2,5–5 s — nunca
vira água nem nuvem). O fogo comum também solta um pouco de fumaça. Chamas paradas (tochas,
fogueira, lâmpadas) **tremulam** um pouco no shader, assim como a luz que jogam em volta.

**Casa** (`house.ts` + `tasks/build.ts`): 4 estágios, cada um construído **por cima** do
anterior (blocos já certos são pulados; tábuas reaproveitadas são devolvidas). Todo estágio leva
o **mesmo tempo de obra** (~150 ações, ~15 s): ele assenta os blocos que faltam num ritmo
fracionário (`site.todo` / 150 por ação), então estágios maiores têm mais blocos por ação:

| Estágio | Largura | Andares | Novidades |
|---|---|---|---|
| 1 | 7 | 1 | porta à direita, cama, lâmpada |
| 2 | 11 | 2 | escada de mão entre andares, portas dos dois lados |
| 3 | 15 | 2 | janelas de vidro no andar de cima |
| 4 | 19 | 3 | mais um andar |

Cada andar tem 4 linhas + laje; dentro, **parede de fundo** com **janelas de fundo** (2 colunas,
mostram o céu) e **quadros** se alternando, lâmpada no teto de cada andar; térreo com cama, mesa e
cadeiras; andares de cima com estante, cadeira e mesinha, vaso de planta; alicerce de pedra (de tábua se faltar pedra); telhado em degraus. `planHouse` calcula custo
e bloqueios (árvore no caminho → derruba). A chegada de família (moradores novos a partir do
estágio 3) está desligada por enquanto.

**Quintal** (`tasks/level.ts`): 10 colunas de cada lado da casa ficam na altura do alicerce.
Varre folhas secas (somem), cava montes de até 6 (terra vai para o inventário, pedra para a pilha;
a grama de cima morre junto) e aterra buracos de até 4 jogando terra na boca (ela cai até o
fundo); pula colunas com gente dentro. Varre só folhas caídas no chão (não as presas nas copas).
Pode cavar onde a casa ainda vai crescer, nunca dentro dela nem embaixo da casa atual. Não planta
nem replanta árvores a menos de 23 colunas do meio da casa.

**Lavoura** (`tasks/field.ts`): faixa plana de terra (5–8 colunas) além de onde a casa máxima
chega, cercada (2 postes, 4 tábuas). Sementes de trigo vêm de **cortar grama** (35%) e de cada
colheita (2); colheita = 1 comida + 2 sementes e replanta na hora; rega com balde se seca (não na
chuva). **Regar mudas**: um balde tem 36 células de água (6×6), tiradas da fonte (a superfície do
lago baixa) e **encharcadas direto na terra** em volta da muda (até 3 colunas de cada lado e 4 de
fundo, cada célula de terra até a capacidade dela) — nada de água solta: com o poço artesiano
reabastecendo sozinho, derramar água livre alagava o mundo. A água que ele vai buscar (balde da muda, balde da
lavoura, pesca) é sempre **de superfície** (aberta em cima) e **longe de barcos atracados** (4
colunas, 2 linhas): antes ele mirava a água logo ao lado (ou embaixo) do barco e travava com
"Boat in the way".

**Noite e zumbis**: zumbis (`animals/zombie.ts`, 3 células, mais lentos) nascem raramente na
grama/terra escura à noite, longe de casas (até 2 por região); queimam ao sol sem nada por cima
(árvores protegem); portas, paredes e cercas os barram. Batem 12 de dano a cada 4 ações. O
humano: punhos (10), espada de madeira/pedra (25/40), **mosquete** (70 de dano a até 16 células,
gasta 1 pólvora; precisa de linha livre). Pólvora: zumbis mortos deixam (50%), o jogador pode
pintar e o humano recolhe (`scavenge`); e ele **fabrica**: 1 carvão + 1 enxofre + 1 salitre → 3
pólvoras (até 12 em estoque), com **enxofre** e **salitre** cavados na mina (veios na pedra, picareta
de pedra; ele vai atrás deles quando tem menos de 6 pólvoras). Vida 0–100, regenera sem fome (mais rápido dormindo). Com
vida 0, **acorda na cama** com vida cheia (sem casa, morre).

**Social**: nome sorteado (aparece no balão e no hover); cumprimenta humanos próximos ("Hi,
Ana!", a cada ~75 s); balões de humanos próximos se empilham em vez de se sobrepor.

**Vila** (`village.ts`): com a casa no estágio 3+, de vez em quando (≈ a cada poucos minutos) chega
um **viajante** — um humano novo, com nome próprio e 30 tábuas, 4 comidas e sementes na bolsa — a
~70 colunas, que constrói a própria casa ali (até 3 pessoas no mundo). Terreno de casa nunca é
escolhido em cima de fazenda, quintal, casa ou mina de ninguém. Ao se cumprimentarem, vizinhos
**guardam onde o outro mora** e **trocam**: quem tem 8+ a mais de algo (comida, peixe, tábua, pedra,
carvão, ferro, tocha, lã, sementes, pólvora) dá até 3 ao outro (os dois anotam no diário). Nas
horas livres, de dia, às vezes ele **visita um vizinho** (fica na porta da casa dele).

**Mercador ambulante** (`merchant.ts`, criado por `engine/events.ts`): entra pela borda do mundo
mais próxima de uma casa, procura alguém, negocia e vai embora pela mesma borda (some lá). Não
dorme, constrói nem luta. Vende **ovelha ou vaca** (3 ouros, para quem tem cercado com lugar — a
pessoa leva para casa), **ferro** (3 por 2 ouros ou 4 pratas, para quem ainda quer ferramentas de
ferro), **sementes de trigo** (3 por 1 prata) e **pólvora** (3 por 1 ouro, para quem tem mosquete);
compra **lã** (2 por 1 prata, guardando 3 para o cobertor) e **ametista** (2 ouros cada).

**Animais de criação** (`animals/livestock.ts`, `tasks/herd.ts`): **ovelhas** e **vacas** pastam
grama, andam devagar, não passam cercas nem entram na água e, bem alimentadas e lado a lado, têm
filhotes (até 5 por região). Com o **cercado** pronto (construção do quintal, ver acima), a tarefa
`herd`: **tosquia** ovelhas lanudas do cercado (2 lãs; a ovelha fica `sheep_shorn` e a lã volta em
alguns minutos), **ordenha** vacas cheias (o leite enche enquanto ela come; 1 comida) e, com lugar
(até 4 no cercado), vai buscar um animal solto, **pega no colo** e leva até o cercado. 3 lãs viram
um **cobertor** (dorme curando 50% mais rápido).

**Píer** (construção do quintal, estágio 2, 10 tábuas + 1 pedra): um deck de 7 tábuas logo acima
da água, saindo da margem do lago mais próximo (até 80 colunas), com poste de luz na ponta. Com
píer, 70% das pescarias são **da ponta dele**. **Tesouros**: às vezes a fisgada não é peixe (4% da
margem, 12% do píer, × habilidade de pesca): um **baú** (1–3 ouros, até 2 pratas, às vezes uma
ametista), uma **garrafa com mensagem** (frase sorteada, vai para o diário) ou uma **bota velha**.

**Habilidades** (`skills.ts`): mineração, pesca, lavoura, construção, lenhador e luta ganham
experiência com o uso (bloco minerado, peixe, colheita, bloco assentado, árvore derrubada, golpe)
e sobem de nível até 5 (20/70/160/320/600 de XP). Cada nível deixa ele **12% melhor** naquilo:
rocha mais rápida, mais fisgadas (e às vezes 2 peixes de uma vez), colheita extra a partir do
nível 3, obra mais rápida, árvore mais rápida, golpe mais forte. Cada nível dá um **posto**
("Seasoned miner", "Master angler", "Monster hunter"...) e uma linha no diário; o posto da melhor
habilidade é o **título** dele, mostrado no cartão.

**Diário** (`skills.ts`: `note`, `firstTime`; `Mind.journal`, até 300 linhas, datadas pelo dia do
mundo): marcos da vida — casa (cada estágio, mudança), primeira árvore, primeiro peixe, primeira
colheita, lavoura, poço, ferramentas novas, cobertor, barco, cada construção do quintal, mina
(começada, nova, primeiro minério de cada tipo, primeiro cansaço), monstros (primeiro zumbi, primeiro
esqueleto, a cada 10), nocaute, mel, lã, leite, animais trazidos, tesouros, estrelas caídas,
vizinhos, trocas, visitas, mercador, eventos do céu e níveis de habilidade. O cartão do humano
(barra de cima) tem abas **Status · Skills · Journal**.

Morre com calor (fogo, lava → cinza) e com ácido.

**Balão de pensamento** (`thought.ts`): o `Sandbox` varre a grade 10×/s atrás de elementos com
`thought` e emite `ThoughtBubble[]` (posição em células + ícone Lucide + texto); o
`game/ThoughtBubbles.tsx` desenha os balões em HTML por cima do canvas (desligável em Settings).
Mostra, nesta ordem: dormindo (Zzz) → preso há ~1 s ("Can't get there…") → uma **vontade** →
a tarefa atual (com % da obra da casa).

**Vontades** (`mind.want`, recalculada a cada escolha de tarefa): `wood` (sem árvore alcançável e
faltam tábuas), `stone` (tem picareta mas não acha pedra), `food` (com fome e sem fruta/peixe). O
balão fica laranja com a dica de como ajudar. O jogador ajuda **pintando** perto dele:
- **Wood** pintada (sem `WOOD_TREE`) → tarefa `gather`: pega peça por peça, 1 tábua por célula; a
  pilha desce quando ele tira de baixo. Tem prioridade sobre derrubar árvores.
- **Stone** → minerada normalmente. **Fruit** → colhida. **Fish** na água → pescado.

**Alcance**: árvores, pedra e madeira pintada são procuradas no **mapa inteiro** (anéis a partir
dele até sair do mundo); a paciência da viagem cresce com a distância (`patienceFor`).

**Não travar**: se uma ida falha (não alcançou árvore, pedra, fruta...), o lugar entra em
`mind.avoid` por ~50 s e as buscas o ignoram, em vez de tentar o mesmo alvo para sempre. A
mineração nunca mexe na própria casa.

### 5.3 Ideias para depois
Lava e pedra, gelo (água < 0 °C), óleo (inflamável, flutua), vento/ventilador, ácido, tipos de
semente (flores, cactos), estações do ano, colmeia (abelhas se reproduzem), pássaros fazendo ninho.

---

## 6. Roadmap

| Fase | Entrega |
|---|---|
| ✅ **0 — Hello World** | Vite + React + TS, telas Splash / Menu / Game, deploy em `dist/` |
| ✅ **1 — Motor base** | grade, loop de passo fixo, pincel, toolbar do registro; sand, water, soil |
| ✅ **2 — Vida** | umidade, semente → planta → árvore, frutas, pássaros |
| ✅ **3 — Calor** | temperatura, metal, fogo, vapor, nuvem + chuva, queima |
| ✅ **3b — Ecossistema** | cinza/fertilidade, grama, folhas caindo, lama, minhoca, peixe, abelha |
| ✅ **4 — Visual** | renderer WebGL2, céu, ciclo dia/noite |
| ✅ **5 — Polimento** | settings, sons procedurais, salvar/carregar cenas, sidebar por famílias |
| ✅ **6 — Química e humano** | pedra, lava, gelo, óleo, ácido, nitrogênio, pólvora, vidro, tábua, lâmpada; reações declarativas; humano estilo Minecraft |
| ✅ **6c — Mundo e água** | mundo aleatório, pedra/gelo com gravidade, humano nada e rema (barco ancorado) |
| ✅ **7 — Vida na vila** | chuva diária e tempestades (raios, céu escuro, arco-íris, evaporação), casa em 4 estágios com fundo/escada/cama/portas, lavoura de trigo com cerca, tempo em casa, zumbis à noite (lutar ou se esconder, espada, mosquete com pólvora), tocha, sono parcial, família, nomes e cumprimentos, coelhos, flores, cogumelos, vagalumes, água sobre a grama |
| ✅ **6b — Balões** | balão de pensamento do humano, vontades com dica, presentes do jogador, memória de lugares inalcançáveis |

---

## 7. Decisões em aberto

- Web Worker: não necessário hoje (ver seção 2); revisitar se o grain "Fine" ficar pesado.
- Calibração fina dos ritmos (crescimento, frutificação, dia de 3 min) depende de jogar.
- Cena salva em grade de outro tamanho é recortada/centralizada, não redimensionada.
