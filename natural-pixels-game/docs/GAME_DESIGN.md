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
  Também é o fallback se WebGL2 não existir ou o shader falhar.
- Cores por célula (`cellColors.ts`): paleta por elemento × shade × umidade (`color.wet`) + brasa
  acima de 350 °C.

### 4.8 Cenas (`engine/scene.ts`)

Cabeçalho JSON (dimensões, ids dos elementos por índice, hora do dia) + todos os arrays da grade,
comprimidos com gzip (`CompressionStream`). Os ids permitem carregar cenas depois de adicionar ou
reordenar elementos. Cena de outro tamanho é colocada alinhada embaixo e centralizada. Save rápido
fica no `localStorage` (base64); arquivos usam a extensão `.npscene`.

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
| Water | Water | liquid | ✅ | escorre, encharca a terra, ferve a 100 °C (calor latente) |
| | Steam | gas | ✅ | sobe (atravessa água), vira nuvem após ~10 s |
| | Cloud | gas lento | ❌ | deriva; cada célula vira 1 gota de chuva |
| Plants | Seed | powder (flutua) | ✅ | enterra-se 2 células na terra; brota com umidade (mais rápido em terra fértil) |
| | Grass | static | ✅ | cobre terra úmida, se espalha (mais em terra fértil, de dia); surge sozinha às vezes |
| | Wood | static | ✅ | tronco (vivo se `WOOD_TREE`) ou material de construção; queima em cinza |
| | Fruit | powder (flutua) | ✅ | nasce na copa; pássaros comem; caída apodrece em semente |
| | Plant | static | ❌ | caule crescendo |
| | Leaf | static | ❌ | copa; dá fruta (15× se polinizada); envelhece e cai |
| | Dry Leaf | powder leve | ❌ | folha caída; apodrece e aduba; muito inflamável |
| Animals | Bird | static (move-se) | ✅ | voa através das árvores, come fruta, solta a semente longe, pousa e dorme |
| | Bee | static (move-se) | ✅ | voa pelas copas polinizando folhas; descansa; para à noite |
| | Fish | static (move-se) | ✅ | nada só na água; fora dela morre; água quente cozinha |
| | Worm | static (move-se) | ✅ | cava a terra adubando; come folha seca/cinza → terra fértil |
| | Human | static (3 células) | ✅ | vive sozinho estilo Minecraft (seção 5.2) |
| Terrain | Stone | powder sem deslizar | ✅ | rocha em blocos: cai reto e empilha (gravidade); minerada com picareta; derrete a 1100 °C |
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
| | Lamp | static, brilha | ✅ | ilumina a noite sem calor |
| | Boat | static | ❌ | barco do humano; anda com ele sobre a água, some quando ele desce |

### 5.1 Ciclos

**Planta → árvore**
1. Água encharca a terra (1 célula de água = 100 unidades; terra guarda 200).
2. Semente se enterra até 2 células e brota quando a terra encostada tem umidade ≥ 60. Caule
   enterrado atravessa a terra até a superfície.
3. O caule cresce consumindo água (raiz puxa da terra; seiva sobe pelos 8 vizinhos), solta folhas
   laterais, e a partir da altura 9 forma a copa.
4. O caule lignifica em madeira de baixo para cima; o topo do tronco segue crescendo até altura 31,
   bifurca em galhos e renova a copa. Adulto, gasta a água mantendo a copa cheia.
5. Folhas envelhecem (~1 min) e caem como folha seca, que apodrece e aduba a terra.
6. Tudo cresce mais de dia; terra fértil acelera brotar, beber e a grama.

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

Coluna de 3 células: pés (`human`, que pensa), tronco (`human_body`) e cabeça (`human_head`),
movidas juntas com `moveCell`. Atravessa ar, grama, folhas, troncos, frutas e água (ficam
guardados embaixo); sobe degraus de 1, escala paredes, cai, e cava quando fica preso (terra à mão,
pedra com picareta; nunca quebra tábua/vidro/metal). Age ~12×/s.

**Água**: não anda pelo fundo. Na água ele **nada** com a cabeça para fora (sobe se a cabeça
afunda, desce até o tronco molhar). Na margem, com água à frente (no nível dos pés ou até 5
células abaixo), põe o **barco** (5 tábuas, fabricado na primeira travessia) na superfície e
**rema**: o barco (`materials/boat.ts`, 1 célula oculta da paleta) vai junto embaixo dos pés. Ao
chegar na outra margem desce e o barco é guardado (a célula volta a ser água). Nadando, se tiver
barco ou tábuas, sobe nele ali mesmo. Não minera pedra debaixo d'água.

**Mente** (`mind.ts`, na memória da célula): tarefa atual, fome (0–100), inventário (toras,
tábuas, pedra, comida, sementes, balde cheio), ferramentas (picareta/machado de madeira ou pedra,
balde), casa, obra em andamento, mudas plantadas. O hover mostra tudo isso.

**Crafting** (`craft.ts`, automático): 1 tora → 4 tábuas · 3 tábuas → picareta de madeira
(necessária para pedra) · 3 tábuas → machado · 3 pedras + 2 tábuas → picareta/machado de pedra ·
3 tábuas → balde · 1 tábua + 1 pedra → lâmpada · 5 tábuas → barco (na margem).

**Cérebro** (`brain.ts`), em ordem de prioridade:
1. Noite → vai para casa e dorme (sem casa, dorme onde está).
2. Fome ≥ 50 come do inventário; ≥ 60 sem comida → colhe fruta ou pesca.
3. Sem casa → derruba árvores (a árvore inteira cai: toras, folhas viram folha seca, frutas caem,
   sementes) → fabrica ferramentas → minera pedra (sem pedra à vista, cava uma **escada** para baixo,
   nunca um poço) → constrói a casa (19 tábuas + 7 pedras: alicerce de pedra, paredes e telhado de
   tábua, porta à direita, lâmpada no teto) num terreno plano sem árvores.
4. Com casa → rega as mudas com o balde (busca água, despeja ao lado), planta sementes em volta,
   mantém estoques (tábuas, pedra, comida) e passeia perto de casa. Replanta onde derrubou.

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
| ✅ **6b — Balões** | balão de pensamento do humano, vontades com dica, presentes do jogador, memória de lugares inalcançáveis |

---

## 7. Decisões em aberto

- Web Worker: não necessário hoje (ver seção 2); revisitar se o grain "Fine" ficar pesado.
- Calibração fina dos ritmos (crescimento, frutificação, dia de 3 min) depende de jogar.
- Cena salva em grade de outro tamanho é recortada/centralizada, não redimensionada.
