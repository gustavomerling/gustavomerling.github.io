# Natural Pixels — Game Design

> Sandbox de simulação de elementos, inspirado no Powder Game (2011), com visual moderno e suave.
> Idioma do jogo: **inglês**. Idioma deste documento: português (nomes de elementos/código em inglês).

Deploy: `https://gustavomerling.github.io/natural-pixels-game/dist/` (estático, GitHub Pages).

---

## 1. Visão

O jogador desenha elementos numa tela (terra, água, sementes, metal, fogo...) e assiste eles
interagirem sozinhos: água molha a terra, semente em terra molhada vira planta, planta bem regada
vira árvore, fogo embaixo de uma panela de metal ferve a água, o vapor sobe, vira nuvem e chove.

Pilares:

1. **Emergência** — regras simples por elemento, comportamentos complexos no conjunto.
2. **Componentização** — cada elemento é um módulo isolado; adicionar um novo não exige mexer no motor.
3. **Bonito, não "pixelado"** — a simulação é em grade, mas a renderização suaviza (líquidos com
   superfície contínua, fogo com brilho, gases difusos, variação orgânica de cor).

---

## 2. Stack e restrições

| Item | Escolha |
|---|---|
| Build | Vite |
| UI (telas, menus, HUD, toolbar) | React + TypeScript |
| Simulação | TypeScript puro, sem React, em `TypedArray`s |
| Renderização | Canvas 2D na fase 1 → WebGL2 (shaders) na fase visual |
| Deploy | `vite build` → `dist/` commitado; `base: './'` |
| Navegação | estado no React (sem router — GitHub Pages não tem fallback de rota) |

Regras:

- **React não toca na simulação a cada frame.** O loop roda em `requestAnimationFrame` fora do
  ciclo de render do React; o React só recebe eventos (elemento selecionado, pausa, pincel).
- **TS com `erasableSyntaxOnly`**: sem `enum`; usar objetos `as const` + union types.
- Se a performance pedir, a simulação pode ir para um **Web Worker** (o motor já nasce isolado para isso).

---

## 3. Telas

```
Splash ──(click / any key)──▶ Menu ──(Play)──▶ Game
                               ▲                 │
                               └──(Esc / Menu)───┘
```

### 3.1 Splash
- Título **Natural Pixels**, subtítulo curto ("A tiny world of elements").
- Fundo animado leve (partículas caindo).
- "Click to start" — avança no clique ou em qualquer tecla.

### 3.2 Menu
- **Play** — abre o sandbox.
- **How to Play** — painel com controles e dicas de combinações.
- **About** — créditos/inspiração.
- (futuro) **Settings** — qualidade gráfica, tamanho da grade, som.

### 3.3 Game

Atalhos: `1–9` elemento · `E` / botão direito = borracha · `Espaço` pausa · `N` passo ·
`[` `]` pincel · `Esc` menu.

- Canvas da simulação ocupando a maior parte da tela.
- **Sidebar à esquerda (30% da largura)**, com o canvas ocupando o resto:
  - *Simulation*: play/pause, passo, velocidade, limpar.
  - *Brush*: tamanho do pincel e borracha.
  - *Elements*: um accordion por família (`elements/categories.ts`: Terrain, Water, Plants,
    Animals, Fire, Materials), gerado do registro; estado aberto/fechado lembrado no navegador;
    a família com o elemento selecionado ganha um ponto verde mesmo fechada.
  - Em telas estreitas (≤ 760px) a sidebar vai para baixo do canvas, com rolagem própria.
- HUD (topo): elemento e temperatura sob o cursor, contagem de partículas, FPS.
- Botão / `Esc` para voltar ao menu.
- Input: mouse e toque (desenhar arrastando, com interpolação entre pontos para não deixar buracos).

---

## 4. Arquitetura

```
src/
  app/            App.tsx (máquina de telas), tipos de Screen
  screens/        SplashScreen, MenuScreen, GameScreen
  game/           SandboxView (canvas ↔ motor), ElementToolbar, SimControls, settings
  ui/             componentes reutilizáveis (Button, Panel, FallingParticles, useKey)
  engine/
    Sandbox.ts    fachada: loop (passo fixo), pincel, pausa/velocidade, stats
    grid.ts       estado em TypedArrays (+ camada `under`)
    simulation.ts passo: lifetime → umidade → update do elemento → movimento; depois calor
    context.ts    CellContext: API relativa que os elementos usam
    moisture.ts   absorção e difusão de umidade
    thermal.ts    condução, resfriamento, queima, mudanças de fase
    brush.ts      pincel → células
    behaviors/    movimentos por matter: powder, liquid, gas, energy
    renderer/     canvas2d.ts (→ webgl.ts na fase 4)
    constants.ts, random.ts
  elements/
    types.ts      contrato ElementDefinition
    registry.ts   lista de todos os elementos (posição = índice numérico; ordem da toolbar)
    core/         air
    terrain/      sand, soil, ash
    water/        water, steam, cloud
    plants/       seed, plant, leaf, wood, fruit + tissue.ts (regras compartilhadas)
    animals/      bird
    fire/         fire
    materials/    metal
```

Cada pasta de `elements/` é uma família (= campo `category`) e tem um `index.ts` que exporta seus
elementos.

### 4.1 Grade (estado do mundo)

Uma grade `W × H` de células (ex.: 320×180; configurável). Cada atributo é um array separado
(Structure of Arrays), indexado por `i = y * W + x`:

| Array | Tipo | Uso |
|---|---|---|
| `type` | `Uint8Array` | índice do elemento (0 = vazio) |
| `temp` | `Float32Array` | temperatura em °C (ambiente = 20) — ✅ fase 3 |
| `water` | `Uint8Array` | umidade/água absorvida (terra, planta) 0–255 — ✅ fase 2 |
| `life` | `Uint16Array` | timer livre por elemento (atividade do pássaro; futuro: vida útil de vapor, fogo, nuvem) — ✅ |
| `data` | `Uint8Array` | estado livre por elemento (estágio de crescimento, carga de chuva...) — ✅ fase 2 |
| `shade` | `Uint8Array` | variação de cor fixa por célula (aspecto orgânico) |
| `stamp` | `Uint32Array` | tick em que a célula se moveu (evita mover a mesma célula 2×) |
| `under.*` | type/water/data/life/shade | camada "embaixo": o que uma partícula está cobrindo ao passar por cima (pássaro dentro da copa). `moveOver` guarda o alvo embaixo e devolve ao sair; `place` limpa |

### 4.2 Passo da simulação

A cada tick (passo fixo, ex.: 60/s):

1. **Movimento** — varre de baixo para cima, alternando a direção horizontal a cada tick
   (evita viés para um lado). Cada célula chama o comportamento do seu `matter`.
2. **Reações** — cada célula testa vizinhos (8-vizinhança) contra a tabela de reações do elemento.
3. **Temperatura** — difusão entre vizinhos ponderada pela condutividade; fontes (fogo) injetam
   calor; tudo tende ao ambiente lentamente. Transições de fase por limiar.
4. **Vida útil** — decrementa `life`; ao zerar, aplica a transformação definida (`into`).
5. **`update` customizado** — hook opcional do elemento para lógica especial (crescimento de planta).

Densidade decide trocas: um elemento mais denso afunda trocando de lugar com um menos denso
(areia afunda na água; vapor sobe no ar).

### 4.3 Contrato de elemento

Todo elemento é **dados + hooks opcionais**. O motor só conhece o contrato:

```ts
type Matter = 'static' | 'powder' | 'liquid' | 'gas' | 'energy'

interface ElementDefinition {
  id: string                 // 'water'
  name: string               // 'Water' (exibido na UI)
  category: ElementCategory  // família = pasta: 'core' | 'terrain' | 'water' | 'plants' | 'animals' | 'fire' | 'materials'
  matter: Matter             // comportamento de movimento padrão
  density: number            // decide quem afunda/sobe (ar = 1)
  color: ElementColor        // { base: '#hex', variation?, alpha? } + (futuro) parâmetros de shader
  icon: LucideIcon           // ícone na toolbar (lucide-react)
  movement?: {
    slide?: number           // powder: chance de escorregar na diagonal (1 = areia solta)
    spread?: number          // liquid: quantas células flui para o lado por tick
    sink?: number            // chance por tick de atravessar outro fluido (arrasto)
  }
  brushFill?: number         // fração do pincel preenchida por frame
  hidden?: boolean           // não aparece na toolbar (ex.: plant, cloud — só surgem por reação)

  thermal?: {
    conductivity: number     // 0..1
    initialTemp?: number
    heatSource?: number      // temperatura que mantém (fogo)
    transitions?: { above?: number; below?: number; into: string }[]
  }

  lifetime?: { min: number; max: number; into?: string }  // em ticks

  reactions?: Reaction[]     // regras declarativas com vizinhos

  update?: (ctx: CellContext) => void  // lógica especial, opcional
}

interface Reaction {
  with: string               // id do vizinho
  chance: number             // probabilidade por tick (0..1)
  self?: string | null       // no que eu viro (null = some; omitido = não muda)
  other?: string | null      // no que o vizinho vira
  // efeitos sobre atributos (ex.: transferir água) ficam no hook update
}
```

`CellContext` (`engine/context.ts`) expõe uma API pequena e segura, relativa à célula atual:
`get(dx, dy)` → id, `set(dx, dy, id, { water?, data? })`, `swap(dx, dy)`, `moveOver(dx, dy)`,
`under(dx, dy)`, `water/setWater`,
`data/setData`, `life/setLife`, `random()`. O `update` pode retornar `true` para pular o
movimento padrão do tick. Células criadas por `set` só agem no próximo tick. Elementos **nunca** acessam a grade
diretamente.

Adicionar um elemento = criar `elements/<família>/<id>.ts` exportando um `ElementDefinition`,
exportá-lo no `index.ts` da pasta e incluí-lo em `registry.ts`. A toolbar (ícone, cor, atalho numérico) se atualiza sozinha.

O ar (`air`) é o elemento de índice 0, densidade 1: pós/líquidos descem trocando com o que for
mais leve; gases (futuro) sobem trocando com o que for mais pesado.

> Implementado: `name`, `description`, `category`, `matter`, `density`, `color` (com `wet`), `icon`,
> `movement`, `brushFill`, `hidden` (fase 1); `moisture` e `update` (fase 2); `thermal` e
> `lifetime` (fase 3). `reactions` declarativas ainda não foram necessárias (as interações estão
> nos `update`s e no `thermal`).

### 4.3.2 Calor (`thermal`) e vida útil (`lifetime`) — fase 3

```ts
thermal?: {
  conductivity?: number                       // 0..1 (metal 0.9, água 0.3, madeira 0.05)
  initialTemp?: number                        // ao ser pintado/criado
  source?: number                             // mantém essa temperatura (fogo = 800)
  above?: { temp, into, chance? }             // água > 100 → vapor (chance 0.01/tick)
  below?: { temp, into, chance? }
  burn?: { at, temp?, rate, into? }           // inflamável
}
lifetime?: { min, max, into? }                // ticks; usa o `life` da célula
```

Passe de calor (`engine/thermal.ts`), uma vez por tick depois do movimento:
1. fontes fixam a temperatura; 2. condução entre vizinhos (cada par uma vez, taxa =
`min(condutividades) × 0.25`); 3. lados encostados no ar perdem calor para o ambiente (o ar não
guarda calor); 4. células com umidade acima de 100 °C secam; 5. inflamáveis **secas** (água ≤ 30)
acima de `burn.at` queimam: se mantêm quentes, soltam chamas no ar vizinho e são consumidas em
`burn.into` (água encostada apaga); 6. mudanças de fase. Com `chance` < 1, a célula fica presa na
temperatura de transição até mudar (calor latente: água fervendo segura a panela em 100 °C).

Calibração (simulada sem navegador): panela de metal com 133 células de água e fogo segurado
embaixo começa a ferver em ~3 s e seca em ~15 s; metal fica ~330 °C com água e só fica em brasa
seco. Bloco de madeira seca queima todo em ~15 s; madeira molhada (árvore viva) resiste a 2 s de fogo.

O renderer faz sólidos/pós/líquidos acima de 350 °C brilharem em vermelho-alaranjado. O HUD mostra
elemento e temperatura sob o cursor.

### 4.3.1 Umidade (`moisture`) — fase 2

```ts
moisture?: {
  capacity: number        // máx. de unidades (≤ 255); 1 célula de água = 100 unidades
  group: string           // só troca umidade com células do mesmo grupo ('soil', 'plant')
  absorbs?: string        // líquido que absorve dos vizinhos (soil absorve 'water')
  flow?: number           // fração da diferença equalizada por troca
  bias?: 'down' | 'up'    // terra drena para baixo; seiva sobe
}
```

O motor roda isso para toda célula com `moisture` antes do `update`. Atravessar grupos (raiz
puxando da terra) é lógica do elemento, via `update` (`elements/plants/tissue.ts`).

### 4.4 Renderização (sem cara de pixel)

- **Fase 1 (Canvas 2D):** escreve a grade num `ImageData` em resolução de simulação, desenha
  ampliado com suavização ligada. Já fica menos "quadrado" que pixel art.
- **Fase visual (WebGL2):** a grade vira textura; um fragment shader faz:
  - líquidos: borrão + limiar (efeito "metaball") → superfície contínua, brilho na borda, leve ondulação;
  - pós/terra: textura granulada a partir de `shade`, sombra sutil de profundidade;
  - fogo: cor por temperatura + bloom;
  - vapor/nuvem: blur forte, alfa baixo, deriva suave;
  - plantas/árvores: tons por estágio de crescimento.
- Fundo com gradiente de céu; (opcional) modo de visualização de temperatura.

---

## 5. Elementos

### 5.1 Lista inicial

| Elemento | id | Matter | Na toolbar | Resumo |
|---|---|---|---|---|
| Soil | `soil` | powder (pesado, pouco escorrega) | ✅ | absorve água, fica mais escura molhada |
| Sand | `sand` | powder | ✅ | cai e escorrega em montes, afunda na água |
| Water | `water` | liquid | ✅ | escorre, molha a terra, ferve a 100 °C |
| Seed | `seed` | powder (densidade 8: flutua na água) | ✅ | germina em terra molhada |
| Plant | `plant` | static | ❌ | cresce consumindo água; vira árvore |
| Wood | `wood` | static | ✅ | tronco da árvore (com raiz se `data & WOOD_TREE`); material de construção; combustível futuro |
| Leaf | `leaf` | static | ❌ | copa da árvore |
| Metal | `metal` | static | ✅ | sólido flutuante, ótimo condutor de calor |
| Fire | `fire` | energy | ✅ | sobe, vida curta (20–45 ticks), fonte de 800 °C, água apaga |
| Steam | `steam` | gas | ✅ | sobe (atravessa água), vira nuvem após ~10 s |
| Ash | `ash` | powder (leve, flutua) | ❌ | resto de madeira queimada (futuro: adubo) |
| Cloud | `cloud` | gas (lento) | ❌ | deriva; cada célula vira 1 gota de água após 5–15 s |
| Fruit | `fruit` | powder (densidade 9: flutua) | ✅ | nasce na copa, pássaros comem; caída apodrece em semente |
| Bird | `bird` | static (move-se sozinho via `update`) | ✅ | voa, come fruta, solta semente longe, pousa e dorme |

### 5.2 Interações

**Ciclo da planta** (implementado)
1. `soil` absorve `water` vizinha: a célula de água some e a terra ganha 100 unidades (capacidade
   200 → duas células de água saturam uma de terra; o excesso empoça). A umidade desce/espalha entre
   terras e a terra escurece (`color.wet`).
2. `seed` flutua na água; encostada em `soil` (acima, abaixo ou dos lados) com umidade ≥ 60 → vira
   `plant` (broto), gastando 30 da terra mais úmida. Vale para semente enterrada.
   Ponta enterrada sobe reto atravessando a terra (ocupa a célula e herda a umidade dela); altura
   só conta no ar, e copa/folhas laterais só nascem fora da terra.
3. `plant`: a célula com terra embaixo é raiz (puxa umidade); a seiva sobe entre tecidos (grupo
   `plant`). A ponta (`GROW_TIP`) cresce 1 célula por vez pagando 40 de água, às vezes na diagonal,
   e solta folhas laterais pequenas. `data` = altura (bits 0–5) + `GROW_TIP` + `MATURE`.
4. A partir da altura 9, a ponta pode virar copa: ela vira `wood` e nasce uma `leaf` acima com
   orçamento 5, que se espalha em copa enquanto houver água.
5. A maturidade (`MATURE`) desce pelo caule a partir da copa; caule maduro com terra/madeira embaixo
   vira `wood` → o tronco "lignifica" de baixo para cima. Madeira de árvore mantém a raiz.
6. A árvore continua crescendo enquanto tiver água: o topo do tronco (`wood` com `WOOD_TOP`) sobe
   1 célula por vez (custa 60), atravessando as próprias folhas, até altura 31; a cada passo
   renova a copa acima. A partir da altura 14 pode bifurcar em galhos (galho não bifurca de novo).
   `data` da madeira: bit 0 `WOOD_TREE`, bit 1 `WOOD_TOP`, bit 2 `BRANCH`, bits 3–7 altura.
7. Caule, folhas e madeira de árvore também absorvem água encostada (regar a árvore, chuva na
   copa). Madeira pintada é inerte. A umidade se espalha pelos 8 vizinhos, então a seiva segue
   caules e galhos inclinados.
8. Sem água, nada cresce. (Futuro: murchar/secar, folhas caindo, queimar.)

**Frutas e pássaros** (implementado)
1. Folha de copa (`leaf` com bit `CROWN`) bem regada às vezes pendura uma `fruit` embaixo de si
   (custa 60 de água; nunca a menos de 3 células de outra fruta).
2. Fruta com `FRUIT_ATTACHED` não cai enquanto tiver folha/madeira/caule vizinho (o `update`
   retorna `true` para pular o movimento). Sem galho, cai; parada no chão, apodrece em `seed`.
3. `bird` é uma partícula (1 célula) colocada pelo jogador. Voa ~30 células/s **atravessando
   folhas, madeira e caules** (`moveOver`: a árvore fica guardada embaixo e volta intacta), desvia de paredes,
   sobe quando está perto do chão. Faminto, enxerga fruta num raio de 10 células e vai até ela.
4. Encostado na fruta: come (1 s), fica `FULL` e sai voando numa direção aleatória; a semente cai
   em pleno voo após 2,5–6 s (≈75–180 células de distância).
5. De barriga vazia, às vezes pousa no que estiver embaixo (qualquer coisa exceto ar/água/pássaro)
   e pode cochilar; se o poleiro sumir, volta a voar.
   `data`: bits 0–1 estado (`FLY`/`PERCH`/`SLEEP`/`EAT`), bit 2 `FULL`, bit 3 direção.
   `life`: timer da atividade atual.
6. Sementes que caem na terra se enterram até 2 células (`seed.data` = profundidade).

**Ciclo da água**
1. `fire` aquece vizinhos (`heatSource ≈ 600 °C`) e some após vida curta, subindo.
2. `metal` conduz calor muito bem → uma **panela de metal** com fogo embaixo aquece por inteiro.
3. `water` com `temp ≥ 100` → `steam`.
4. `steam` sobe; após ~10 s (`lifetime`) vira `cloud`.
5. `cloud` deriva devagar e solta gotas de `water` (`data` = carga de chuva); esgotada, some.

**Outros**
- `sand` afunda na `water` (densidade maior).
- `fire` em contato com `water` → apaga (fogo some, água pode virar vapor).
- (futuro) `fire` + `wood`/`plant`/`leaf` → queima.

### 5.3 Ideias para depois
Lava, pedra, gelo (água < 0 °C), óleo (inflamável, flutua na água), vento/ventilador, ácido,
lama (terra saturada), sementes de tipos diferentes, animais/insetos simples, sol/ciclo dia-noite.

---

## 6. Roadmap

| Fase | Entrega |
|---|---|
| ✅ **0 — Hello World** | Vite + React + TS, `base: './'`, telas Splash / Menu / Game (placeholder), deploy em `dist/` |
| ✅ **1 — Motor base** | grade, loop de passo fixo, renderer Canvas 2D, pincel (mouse/touch), toolbar a partir do registro; elementos `sand`, `water`, `soil` com movimento; controles (pausa, passo, velocidade, pincel, limpar, borracha) e ícones Lucide |
| ✅ **2 — Vida** | umidade da terra, `seed` → `plant` → `wood`/`leaf` |
| ✅ **3 — Calor** | temperatura e difusão, `metal`, `fire`, `steam`, `cloud` + chuva |
| **4 — Visual** | renderer WebGL2 com shaders (líquido contínuo, bloom, gases suaves), fundo |
| **5 — Polimento** | How to Play, settings, sons, salvar/carregar cena (localStorage / arquivo), Web Worker se precisar |

---

## 7. Decisões em aberto

- Tamanho da grade padrão (320×180?) e se adapta à proporção da tela.
- Simulação na thread principal ou Worker desde o início (começar na principal, medir).
- Quanto o shader pode "esconder" a grade sem confundir onde o elemento realmente está.
- Plantas: crescimento puramente por regras locais vs. "agente" com estado (estágio no `data`).
