# Pointer Survivor

Roguelite estilo Vampire Survivors com estética Windows 2000. Você é o ponteiro do mouse: ele gira pra
direção em que é arrastado e atira pra onde aponta. São 3 mapas (Desktop, World Wide Web e System32),
cada um com chefe, fundo e música próprios. Os KB ganhos em cada run compram upgrades na loja
(Control Panel), e tudo que você encontra vai pro Glossary.

- Deploy: `https://gustavomerling.github.io/pointer-survivor/dist/`
- Design: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173/pointer-survivor/dist/
npm run build    # gera dist/ (commitado para o GitHub Pages)
```

`vite.config.ts` usa `base: '/pointer-survivor/dist/'`.

## Estrutura

```
src/
  App.tsx              boot + "sistema operacional": janelas, ícones do desktop, menu Iniciar, save
  os/                  gerenciador de janelas (apps.ts = tamanhos/ícones, useWindowManager, ManagedWindow)
  screens/             conteúdo de cada janela: Welcome, Help, Shop, Glossary, Game, Results, Credits...
  ui/                  componentes Win2000: Window, Button, ProgressBar, Tabs, Desktop, StartMenu, Icon, SpriteSheet...
  styles/win2k.css     tema (bevels, title bars, taskbar)
  game/
    types.ts           contratos: EnemyDef, WeaponDef, StatModifierDef, Stats...
    config.ts          números globais (duração, stats base, curva de XP, ganho de KB)
    maps/              1 arquivo por mapa (ondas, chefe, fundo, música) + index.ts
    music/             sequenciador chiptune (player.ts) + músicas em graus da escala (songs.ts)
    waves.ts           tipo WaveDef
    stats.ts           base -> upgrades da loja -> itens da run
    save.ts            localStorage
    audio.ts           bipes WebAudio procedurais
    sprites.ts         pixel art em texto (paleta + linhas), cache em canvas, flash de dano
    enemies/           <id>.ts (dados/comportamento) + <id>.sprite.ts (pixel art) + index.ts (registro)
    weapons/           1 arquivo por arma + index.ts (registro)
    items/passives.ts  itens passivos da run
    shop/upgrades.ts   upgrades permanentes da loja
    engine/            World (estado), Engine (loop), input, spawner, levelUp, renderer
```

## Adicionando conteúdo

| Quero adicionar… | Onde |
|---|---|
| Mapa | `game/maps/<id>.ts` com `defineMap({...})` (ondas, chefe, `drawBackground`, música), listar em `maps/index.ts`. |
| Música | Nova entrada em `game/music/songs.ts` (melodia em graus da escala, 16 passos por compasso). |
| Inimigo | `game/enemies/<id>.ts` com `defineEnemy({...})` + `<id>.sprite.ts` com `defineSprite({...})`, listar em `enemies/index.ts`. Comece com `status: 'concept'` pra iterar no Glossary (só em dev); troque pra `'active'` e use o id nas ondas de um mapa. Chefes: `boss: true`. |
| Janela/app | Id + tamanho em `os/apps.ts`, conteúdo no `renderApp` do `App.tsx`, atalho em ícone do desktop e/ou menu Iniciar. |
| Arma | `game/weapons/<id>.ts` com `defineWeapon({...})`, listar em `weapons/index.ts`. Aparece sozinha no level-up e no Help. |
| Item da run | Nova entrada em `game/items/passives.ts`. |
| Upgrade da loja | Nova entrada em `game/shop/upgrades.ts`. |
| Ícone | Novo nome em `IconName` (`types.ts`) + desenho em `ui/Icon.tsx`. |
