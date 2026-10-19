# 03 · Arquitetura

## Stack

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript (strict, `noUncheckedIndexedAccess`) | erros de conteúdo e de índice aparecem na compilação |
| UI (menus, HUD, opções) | React 19 | telas e overlays são UI de verdade; React é bom nisso |
| Jogo (mundo, física, render) | **motor próprio** em Canvas 2D | controle total do loop, do tempo (câmera lenta) e do determinismo |
| Bundler / dev server | Vite 8 | HMR rápido, build estático |
| Desktop | **Electron** + electron-builder | empacota um Chromium próprio: o `.exe` não depende de navegador instalado |
| Testes | Vitest + smoke test em Electron | lógica pura testada em Node; o jogo real testado com input simulado |

### Por que motor próprio e não Phaser/Pixi?

- O jogo precisa de **física de plataforma específica** (one-way, slide, coyote time), **tempo com escalas diferentes** para mundo e jogador, e **geração determinística** — tudo isso é mais simples de controlar do que de contornar num framework.
- React fica só com a UI; o mundo do jogo não passa pelo React (sem re-render por frame).
- O motor é pequeno (~1.200 linhas) e testado. Se um dia o Canvas 2D não aguentar, o `Renderer` é o único ponto que muda (ex.: trocar por PixiJS/WebGL).

## Camadas e regra de dependência

```
src/
  engine/   motor genérico — não sabe que existe lasanha
  game/     o jogo: conteúdo, sistemas, cenas, procgen
  ui/       React: telas, HUD, menus, settings
electron/   processo principal + preload (desktop)
scripts/    build/dev/smoke
```

**Setas permitidas:** `ui → game → engine`. Nunca o contrário.

- `engine/` não importa nada de `game/` nem de `ui/`.
- `game/` não importa React nem `ui/`.
- `ui/` fala com o jogo **só** através de `GameSession` (métodos) e `GameEvents` (eventos tipados).

Aliases: `@engine/*`, `@game/*`, `@ui/*`.

## Motor (`src/engine`)

| Módulo | Responsabilidade |
|---|---|
| `core/loop.ts` | loop de **passo fixo** (60 Hz) com acumulador e interpolação; independente da taxa do monitor |
| `core/clock.ts` | relógio do jogo: `scale` com rampa (câmera lenta) e *hit-stop* |
| `core/scene.ts` | cenas empilháveis (run, hub, loja…) |
| `core/events.ts` | `EventBus` tipado |
| `ecs/world.ts` | ECS mínimo: entidades = ids, componentes = dados, sistemas = funções em ordem |
| `input/input.ts` | ações com *bindings* (teclado/mouse/roda); bordas travadas por tick (um toque rápido nunca se perde) |
| `render/renderer.ts` | back buffer em 480×270, ampliado *nearest-neighbour* (modo `fit` ou `integer`) |
| `render/camera.ts` | seguir com suavização, limites, *shake* por trauma, interpolação, snap no pixel |
| `render/sprite.ts` | sprite sheets e animador por frames (para efeitos/objetos; personagens usam rig) |
| `render/pixel.ts` | linhas e círculos em pixel puro (Bresenham, sem anti-aliasing) |
| `rig/skeleton.ts` | esqueleto 2D: ossos com pai/comprimento/encaixe, `Pose` (ângulos locais), cinemática direta, `PoseBuilder`, blend de poses |
| `rig/ik.ts` | IK analítica de 2 ossos (ombro→cotovelo→mão, quadril→joelho→pé) |
| `physics/` | grade de tiles (sólido / one-way) e `moveAndCollide` com sub-passos (sem atravessar paredes) |
| `fx/particles.ts` | partículas em pool, fora do ECS (faíscas, fumaça, cápsulas, detritos, clarões); só visual |
| `physics/verlet.ts` | corpo de pontos e hastes (ragdolls) com colisão nos tiles |
| `math/segment.ts` | distância entre segmentos (balas × cápsulas dos ossos, fumaça × linha de visão) |
| `math/rng.ts` | PRNG com seed e `fork(label)` para fluxos independentes |
| `content/registry.ts` | catálogo por id que falha alto em id duplicado/inexistente |
| `assets/`, `audio/`, `storage/`, `platform/` | carregamento, mixer Web Audio, saves versionados, ponte desktop/navegador |

## Jogo (`src/game`)

```
game/
  config.ts            resolução, tile, tuning do jogador, câmera lenta
  input/actions.ts     ações e teclas padrão
  content/             DADOS: armas, attachments, itens, inimigos, biomas, personagem
  character/           rig humanoide: proporções, animador procedural, desenho em caixas
  procgen/             layout + templates de sala + gerador de nível
  world/               componentes ECS, prefabs (receitas de entidades), geometria
  systems/             comportamento: movimento, física, mira, armas, projéteis, itens, câmera, HUD
  render/              desenho wireframe: fundos, tiles, entidades, overlay
  scenes/RunScene.ts   um andar: gera o nível, monta o mundo, roda o pipeline de sistemas
  session.ts           fachada única usada pelo React
  events.ts            mensagens jogo → UI
```

### Pipeline de um passo (RunScene)

```
snapshot → slowmo → aim → playerIntent → playerMovement → ai → physics → pickups
         → weapons → throwables → projectiles → props → lifecycle → particles → rig
         → camera → hud → world.flush()
```

| Sistema | Arquivo | Faz |
|---|---|---|
| `slowmo` | systems/time.ts | câmera lenta + barra de foco |
| `ai` | systems/ai.ts | percepção, patrulha, alerta em grupo, cobertura, tiro, melee |
| `pickups` | systems/pickups.ts | ímã e coleta; troca de arma com F |
| `weapons` | systems/combat.ts | recarga com reserva, disparo, clarão, cápsula, som |
| `projectiles` | systems/combat.ts | hitbox por osso, props, quebráveis, ricochete |
| `props` | systems/props.ts | caixas/portas/barris, luminária, extintor, fumaça, ragdolls |
| `lifecycle` | systems/lifecycle.ts | timers, morte → ragdoll + drops |

**Quebráveis** usam um tipo de tile próprio (`Tile.Breakable`): bloqueiam movimento, balas e visão exatamente como parede, e o mapa `ctx.breakables` liga o tile à entidade dona. Ao quebrar, os tiles voltam a `Empty`.

**Explosões** passam por `explode()` ([systems/explosions.ts](../src/game/systems/explosions.ts)): granada e barril usam o mesmo código; barris encadeiam.

**Áudio** sintetizado em [audio/sfx.ts](../src/game/audio/sfx.ts) (ruído filtrado + osciladores), com variação de pitch e pitch mais grave em câmera lenta. Trocar por samples reais = trocar esse arquivo.

### Determinismo e replay (F10)

A simulação é **determinística**: passo fixo, toda aleatoriedade de gameplay vem do `Rng` com seed, e o input é travado por passo. Partículas e sons podem usar `Math.random` porque não afetam o jogo.

A sessão grava um `InputFrame` por passo da tentativa atual; F10 recria a cena com a mesma seed e injeta os frames gravados — reproduzindo exatamente o que aconteceu. O teste [sim.test.ts](../src/game/sim.test.ts) roda a cena sem tela por 15 s de jogo com input roteirizado, duas vezes, e exige estado idêntico: **se alguém usar `Math.random` no gameplay, esse teste quebra.**

**Intent**: armas e itens leem o componente `Intent` (atirar, recarregar, trocar…), nunca o teclado. O jogador preenche via `playerIntentSystem`; inimigos via `aiSystem`. Por isso o mesmo sistema de armas serve para todos.

**Dano**: tudo que machuca passa por `applyDamage` ([systems/damage.ts](../src/game/systems/damage.ts)) — aplica, mostra o número, dá feedback e alerta o inimigo. Balas testam as **cápsulas dos ossos** do rig ([character/hitbox.ts](../src/game/character/hitbox.ts)) para saber a região atingida.

### Personagens: rig em vez de sprites

Personagens são **esqueletos animados proceduralmente**, não sequências de frames.

- **Esqueleto humanoide** ([character/humanoid.ts](../src/game/character/humanoid.ts)): tronco (raiz, no quadril), cabeça, e para cada lado (frente/trás) braço e perna com 2 ossos (articulação no cotovelo/joelho). Proporções definidas na altura de referência (24 px) e **escaladas pela altura do colisor** — estagiário (20 px), Paulo (24 px), gerente (28 px) usam o mesmo rig.
- **Animador** ([character/animator.ts](../src/game/character/animator.ts)): a cada passo escolhe alvos para o estado (altura do quadril, inclinação do tronco, posição dos pés), suaviza, e posiciona pernas e braços por **IK**. Sem keyframes:
  - *idle*: respiração; *run/sprint/crouch andando*: ciclo de passada com pés plantados (amplitude por velocidade; anda de costas quando mira para trás);
  - *crouch*, *slide* (tronco para trás, perna da frente esticada), *air* (pernas encolhidas subindo, esticadas caindo);
  - braços: mão da frente no punho da arma, mão de trás no guarda-mão, conforme `HOLD_STYLES` por classe de arma; desarmado, os braços balançam opostos às pernas; tiro dá **coice** nos braços;
  - cabeça acompanha a mira.
- Tudo é calculado em espaço "virado para a direita" com origem nos pés; o desenho espelha para a esquerda. A pose é interpolada entre passos como o resto do mundo.
- **Desenho** ([character/draw.ts](../src/game/character/draw.ts)): fase wireframe — cada osso é uma **caixa rotacionada** (membros finos viram barras), membros de trás mais escuros, ordem de desenho de trás para frente. Trocar por arte = trocar este arquivo (ex.: um sprite recortado por osso).
- As balas saem do **cano da arma do rig** (`muzzleLocal`) e convergem para o cursor.
- O `rigSystem` traduz componentes (`PlayerControl`, `Aim`, `Arsenal`, `Npc`) em `RigInput`; o animador não sabe se é jogador ou NPC. F3 mostra o colisor por cima do rig.

A ordem é explícita num array; adicionar comportamento = escrever um sistema e colocá-lo na posição certa.

### Como adicionar conteúdo

| Quero… | Faço |
|---|---|
| nova arma | entrada em `content/weapons/catalog.ts` |
| novo attachment | entrada em `content/attachments/catalog.ts` (+ código só se criar um *behavior* novo) |
| novo item | entrada em `content/items/catalog.ts` (+ efeito em `systems/combat.ts` se for um efeito novo) |
| novo inimigo | entrada em `content/enemies/catalog.ts` e no `enemyPool` de um bioma |
| novo bioma | entrada em `content/biomes/catalog.ts` e em `BIOME_ORDER` |
| nova sala | template ASCII em `procgen/rooms.ts` com as *tags* certas |
| novo tipo de fundo | tipo em `BackgroundLayer` + *painter* em `render/backgrounds.ts` |
| nova tela | componente em `ui/screens/` + caso em `ui/App.tsx` |

Os testes de integridade (`src/game/game.test.ts`) verificam referências cruzadas: arma de inimigo existe, todo attachment cabe em alguma arma, todo bioma tem salas, templates bem formados, toda ação tem tecla.

## Desktop (Electron)

- `electron/main.ts`: janela 1280×720, **sem menu** (nenhum atalho de menu dispara no meio do jogo), F11 tela cheia, F12 devtools só em dev, instância única, sem navegação/janelas externas.
- Segurança: `contextIsolation`, `sandbox`, sem `nodeIntegration`; a página só vê `window.desktop` (`quit`, `setFullscreen`, `isFullscreen`) via preload.
- CSP estrita injetada **só no build** (o dev precisa de scripts inline do React Refresh).
- `base: './'` no Vite para o `index.html` funcionar via `file://`.

## Qualidade e segurança

| Comando | O que garante |
|---|---|
| `npm run typecheck` | tipos do jogo e do Electron |
| `npm test` | motor (loop, input, colisão, ECS, RNG, saves) e jogo (attachments, procgen em 120 seeds, integridade de conteúdo) |
| `npm run build` | roda os dois acima antes de compilar |
| `npm run smoke` | abre o build no Electron, navega abertura → menu → run, anda, pula, atira, câmera lenta, debug, pausa; salva prints em `smoke/` e falha em qualquer erro de console |

Princípios:

- **Determinismo:** toda aleatoriedade vem de `Rng` com seed, em fluxos separados (`layout`, `rooms`, `spawns`, `gameplay`).
- **Conteúdo é dado**, comportamento é sistema. Validação falha cedo (`assembleWeapon` lança em combinações inválidas).
- **Saves nunca quebram o jogo:** `StoredDocument` é versionado e volta aos padrões se o dado estiver corrompido.

## Armadilhas conhecidas

- **`ELECTRON_RUN_AS_NODE`**: o VS Code exporta essa variável e faz o Electron agir como Node. Os scripts (`scripts/electron.mjs`) removem ela antes de abrir o Electron.
- **Janela oculta** tem `requestAnimationFrame` estrangulado; o smoke test usa janela visível.