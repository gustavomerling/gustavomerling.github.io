# 03 · Arquitetura

## Stack

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript (strict, `noUncheckedIndexedAccess`) | erros de conteúdo e de índice aparecem na compilação |
| UI (menu, HUD, pausa) | React 19 | telas e overlays são UI de verdade; React é bom nisso |
| Jogo (mundo, física, render) | **motor próprio** em Canvas 2D | controle total do loop, do tempo (câmera lenta) e do determinismo |
| Bundler / dev server | Vite 8 | HMR rápido, build estático |
| Desktop | **Electron** + electron-builder | empacota um Chromium próprio: o `.exe` não depende de navegador instalado |
| Testes | Vitest + smoke test em Electron | lógica pura testada em Node; o jogo real testado com input simulado |

O mundo do jogo não passa pelo React (sem re-render por frame). Se um dia o Canvas 2D não aguentar, o `Renderer` é o único ponto que muda.

## Camadas e regra de dependência

```
src/
  engine/   motor genérico (não conhece o jogo)
  game/     o jogo: conteúdo, sistemas, cena, procgen, render
  ui/       React: menu, HUD, pausa
electron/   processo principal + preload (desktop)
scripts/    build/dev/smoke
tools/      ferramentas de dev servidas pelo Vite (atlas de mapas)
```

**Setas permitidas:** `ui → game → engine`. Nunca o contrário. `ui/` fala com o jogo **só** através de `GameSession` (métodos) e `GameEvents` (eventos tipados). Aliases: `@engine/*`, `@game/*`, `@ui/*`.

## Motor (`src/engine`)

| Módulo | Responsabilidade |
|---|---|
| `core/loop.ts` | loop de **passo fixo** (60 Hz) com acumulador e interpolação |
| `core/clock.ts` | relógio do jogo: `scale` com rampa (câmera lenta) |
| `core/scene.ts` · `core/events.ts` | cenas e `EventBus` tipado |
| `ecs/world.ts` | ECS mínimo: entidades = ids, componentes = dados, sistemas = funções em ordem |
| `input/input.ts` | ações com *bindings*; bordas travadas por tick (um toque rápido nunca se perde); gravação para replay |
| `render/renderer.ts` | **vetorial**: desenha em unidades virtuais direto no canvas visível, em resolução nativa; altura fixa (270), largura acompanha a janela (sem faixas) |
| `render/camera.ts` | seguir com suavização, limites do mundo, interpolação sub-pixel |
| `physics/` | grade de tiles (sólido / one-way / escada), `moveAndCollide` com sub-passos e `verlet.ts` (ragdolls) |
| `rig/` | esqueleto 2D (ossos, poses, cinemática direta) e IK analítica de 2 ossos |
| `math/` | vetores, retângulos, segmentos, PRNG com seed e `fork(label)` |
| `content/registry.ts` | catálogo por id que falha alto em id duplicado/inexistente |
| `storage/`, `platform/` | documentos versionados em `localStorage`, ponte desktop/navegador |

## Jogo (`src/game`)

```
game/
  config.ts            resolução, tile, tuning do jogador, IA, impacto, câmera lenta
  input/actions.ts     ações e teclas padrão
  content/             DADOS: armas, attachments, inimigos, bioma, jogador
  character/           rig humanoide: proporções, animador procedural, desenho, hitbox por osso, ragdoll
  procgen/             layout + grade de andares + chunks + gerador de nível
  world/               componentes ECS, prefabs (receitas de entidades), geometria
  systems/             comportamento: movimento, física, mira, armas, projéteis, IA, câmera, HUD, debug
  render/              céu, tiles + grade, personagens, overlay
  scenes/RunScene.ts   um mapa: gera o nível, monta o mundo, roda o pipeline de sistemas
  session.ts           fachada única usada pelo React
  events.ts            mensagens jogo → UI
```

### Pipeline de um passo (RunScene)

```
snapshot → slowmo → aim → playerIntent → playerMovement → playerMelee → ai → physics
         → weapons → projectiles → lifecycle → rig → effects → pickups → camera → hud → world.flush()
```

| Sistema | Arquivo | Faz |
|---|---|---|
| `slowmo` | systems/time.ts | câmera lenta + barra de foco |
| `playerMovement` | systems/playerMovement.ts | andar, correr, slide, pulo, escada, walljump, vault |
| `ai` | systems/ai.ts | percepção, patrulha, alerta em grupo, cobertura, tiro, soco |
| `physics` | systems/physics.ts | gravidade, atrito e colisão com os tiles |
| `weapons` · `projectiles` | systems/combat.ts | recarga, disparo pelo cano do rig; hitbox por osso, ricochete, perfuração |
| `lifecycle` | systems/lifecycle.ts | timers, morte → ragdoll, simulação e limpeza dos ragdolls |
| `rig` | systems/rig.ts | traduz o estado (jogador ou NPC) em entrada do animador; transforma os eventos do rig (cápsula, pente) em detritos |
| `playerMelee` | systems/melee.ts | chute (Q): empurra e atordoa quem está na frente |
| `effects` | systems/effects.ts | detritos com física simples (cápsulas, pentes, sangue, balas gastas), fumaça, flash, faíscas, furos na parede |
| `pickups` | systems/pickups.ts | armas caídas: caem, param no chão; F pega (mesma arma = pente cheio, slot livre = adiciona, cheio = troca) |

**Intent**: armas leem o componente `Intent` (atirar, recarregar, trocar), nunca o teclado. O jogador preenche via `playerIntentSystem`; inimigos via `aiSystem`. O mesmo sistema de armas serve para todos.

**Dano**: tudo que machuca passa por `applyDamage` ([systems/damage.ts](../src/game/systems/damage.ts)): aplica, empurra, atordoa, alerta o inimigo e alimenta o marcador de acerto e o foco.

### Render

Ordem em `RunScene.render`: **céu** (tela) → parede de fundo dos prédios (janelas recortadas) → tiles → **grade** (F2) → saída → furos de bala → ragdolls → detritos → armas no chão → personagens → fumaça/faíscas → balas → flash → lasers → debug (F3) → mira/marcador (tela).

- [render/tilemap.ts](../src/game/render/tilemap.ts): sólidos com contorno onde encostam em espaço aberto, plataformas como barras, escadas como trilhos. A grade tem três intensidades: tile, a cada 5 tiles / laje de andar, borda de chunk.
- [render/sky.ts](../src/game/render/sky.ts): skybox básico em camadas com parallax horizontal e vertical: gradiente, estrelas, lua, nuvens que derivam e duas silhuetas de cidade (a da frente com janelas acesas).
- [character/draw.ts](../src/game/character/draw.ts): o rig como cápsulas lisas com contorno escuro (membros de trás mais escuros) e cabeça redonda; o ragdoll usa o mesmo desenho. Trocar por arte = trocar este arquivo.

### Personagens: rig em vez de sprites

Personagens são **esqueletos animados proceduralmente** ([character/](../src/game/character)): tronco, cabeça e braços/pernas de 2 ossos, proporções escaladas pela altura do colisor. O animador escolhe alvos por estado (idle, corrida, agachado, slide, ar, escada, escalada), suaviza e posiciona membros por **IK**; a mão segura a arma conforme a classe, o tiro dá coice, a cabeça segue a mira e o golpe faz o rig reagir. As balas saem do cano do rig e testam as **cápsulas dos ossos** ([character/hitbox.ts](../src/game/character/hitbox.ts)). Ao morrer, a pose atual vira um **ragdoll** verlet.

Armas têm **modelo vetorial** ([content/weapons/models.ts](../src/game/content/weapons/models.ts)): peças em "espaço da arma", pontos de empunhadura/apoio/cano/ejeção, pente destacável, força do coice e tamanho do flash. O animador também cuida de recarga (pente cai, mão busca outro), troca de arma (abaixa/levanta), pump, chute, rolamento, walljump, escada de costas e escalada de canto. Folha de poses para conferir tudo: `/tools/poses.html`.

### Balística

Cada arma tem `penetration`. Ao entrar num corpo a bala gasta a soma do custo de **todas as partes que atravessa** ali (`BALLISTICS.partCost`); com força sobrando segue com menos dano/velocidade e pode acertar o próximo; sem força, cai no chão. Na parede: faíscas, poeira e furo; ricochete em ângulo raso; no fim do alcance a bala cai.

### Mapa

[procgen/rooms.ts](../src/game/procgen/rooms.ts) define a **grade de andares** (`STOREY_HEADROOM`, `STOREY_ROWS`, `STOREYS`, `ROOM_ROWS`, `DOOR_ROWS`, `SLAB_ROWS`, `sideWindowRows`) e o formato dos templates ASCII. [procgen/level.ts](../src/game/procgen/level.ts) escolhe os chunks no ritmo prédio/beco, carimba os tiles, abre portas e **janelas laterais** (com peitoril/patamar) e posiciona início, saída e inimigos.

### Determinismo e replay (F10)

A simulação é **determinística**: passo fixo, toda aleatoriedade de gameplay vem do `Rng` com seed, e o input é travado por passo. A sessão grava um `InputFrame` por passo; F10 recria a cena com a mesma seed e injeta os frames, reproduzindo exatamente o que aconteceu. O teste [sim.test.ts](../src/game/sim.test.ts) roda a cena sem tela duas vezes com input roteirizado e exige estado idêntico: **se alguém usar `Math.random` no gameplay, esse teste quebra.** Efeitos puramente visuais (sangue, fumaça, cápsulas) podem usar `Math.random` e ficam fora da comparação; nada que mexa em posição de cano, bala ou personagem pode.

### Como adicionar conteúdo

| Quero… | Faço |
|---|---|
| nova arma | entrada em `content/weapons/catalog.ts` + modelo em `content/weapons/models.ts` |
| novo attachment | entrada em `content/attachments/catalog.ts` (+ código só se criar um *behavior* novo) |
| novo inimigo | entrada em `content/enemies/catalog.ts` e no `enemyPool` do bioma |
| novo chunk | template ASCII em `procgen/chunks/alley.ts` (30×21, na grade de andares) |
| novo bioma | entrada em `content/biomes/catalog.ts` e em `BIOME_ORDER` |
| nova tela | componente em `ui/screens/` + caso em `ui/App.tsx` |

## Desktop (Electron)

- `electron/main.ts`: janela 1280×720, sem menu, F11 tela cheia, F12 devtools só em dev, instância única, sem navegação externa.
- Segurança: `contextIsolation`, `sandbox`, sem `nodeIntegration`; a página só vê `window.desktop` via preload.
- CSP estrita injetada **só no build** (o dev precisa de scripts inline do React Refresh).
- `base: './'` no Vite: o mesmo `dist/` funciona via `file://` (Electron) e no GitHub Pages.

## Qualidade

| Comando | O que garante |
|---|---|
| `npm run typecheck` | tipos do jogo e do Electron |
| `npm test` | motor (loop, input, colisão, ECS, RNG, rig/IK, verlet, storage) e jogo: integridade de conteúdo, poses do rig, hitbox por osso, grade de andares, janelas laterais, ritmo prédio/beco, alcance de toda superfície do mapa a partir do spawn em 20 seeds, **travessia** (um bot joga o mapa), escada, vault, walljump, sair pela janela, câmera subindo, ragdoll, determinismo |
| `npm run build` | roda os dois acima antes de compilar |
| `npm run smoke` | abre o build no Electron, navega menu → partida, anda, pula, atira, câmera lenta, debug, pausa; salva prints em `smoke/` e falha em qualquer erro de console |

## Armadilhas conhecidas

- **`ELECTRON_RUN_AS_NODE`**: o VS Code exporta essa variável e faz o Electron agir como Node. Os scripts (`scripts/electron.mjs`) removem ela antes de abrir o Electron.
- **Janela oculta** tem `requestAnimationFrame` estrangulado; o smoke test usa janela visível.
