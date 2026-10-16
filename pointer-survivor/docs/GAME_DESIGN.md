# Pointer Survivor — Game Design

> Roguelite de sobrevivência (à la Vampire Survivors) onde o jogador é o **ponteiro do mouse** dentro
> de um computador com Windows 2000 sendo invadido.
> Idioma do jogo: **inglês** (combina com a estética). Idioma deste documento: português.

Deploy: `https://gustavomerling.github.io/pointer-survivor/dist/` (estático, GitHub Pages).

Versão atual: **0.3**: 3 mapas com chefe, fundo e música próprios; 7 armas; 12 itens; 14 monstros;
glossário com descoberta; Ctrl+Alt+Del.

---

## 1. Visão

Vampire Survivors sem mapa gigante: a arena é **a própria janela**. Inimigos entram pelas bordas, o
ponteiro desvia e as armas disparam sozinhas. A graça está na mira: **o ponteiro aponta pra onde é
arrastado**, e a arma inicial atira pra onde ele aponta. Fugir de costas significa atirar pro lado
errado (o Right Click existe pra isso).

Pilares:

1. **Uma mão só**: mover é tudo. Armas disparam sozinhas.
2. **Mirar com o movimento**: direção do arrasto = direção do tiro.
3. **Nostalgia Win2000**: toda UI é janela, botão chanfrado, barra de título em degradê, taskbar.
4. **Componentizado**: mapa, inimigo, arma, item e upgrade são módulos isolados registrados num índice.

---

## 2. Stack e restrições

| Item | Escolha |
|---|---|
| Build | Vite, `base: '/pointer-survivor/dist/'`, `dist/` commitado |
| UI | React + TypeScript (janelas, HUD, diálogos) |
| Jogo | TypeScript puro + Canvas 2D (sem React no loop) |
| Som | WebAudio procedural: efeitos (`audio.ts`) e música (`music/`), sem arquivos |
| Persistência | `localStorage` (`pointer-survivor:save:v1`), com try/catch |
| Navegação | estado no React (sem router) |

O React conversa com o motor por `EngineEvents` (`onHud`, `onLevelUp`, `onEnd`, `onDiscover`,
`onBoss`) e por métodos (`setPaused`, `choose`, `forfeit`, `resize`, `triggerTaskManager`).

Em `npm run dev`, a partida em andamento fica em `window.__engine` (ex.: `__engine.world.time = 239`
pula pro chefe).

---

## 3. Controles

| Entrada | Ação |
|---|---|
| Mouse | O ponteiro persegue o mouse real e gira pra direção do movimento. Um círculo branco translúcido marca onde o mouse está. |
| Toque | Arrastar o dedo. |
| WASD / setas | Movimento por teclado. |
| Esc / P | Pausa. |
| Espaço / Delete | Ctrl+Alt+Del (quando o medidor está cheio). |
| 1 / 2 / 3 | Escolhe opção de level-up. |

- O heading gira até 14 rad/s em direção à velocidade; parado, mantém a última direção.
- Left Click tem **homing leve** (3 rad/s, cone de ±0.6 rad, alcance 220).

---

## 4. Mapas

Cada mapa é um **drive** na janela My Computer. Vencer o chefe libera o próximo.

| # | Mapa | Path | Fundo | Música | Chefe (4:00) |
|---|---|---|---|---|---|
| 1 | Desktop | `C:\` | Azul do desktop + marca d'água | *Teal Wallpaper*: Lá menor, 132 bpm | Blue Screen |
| 2 | World Wide Web | `http://` | Homepage de 1999: céu estrelado, letreiro rolando, faixa "em construção", contador de visitas | *Under Construction*: Ré maior, 150 bpm | Error 404 |
| 3 | System32 | `C:\WINNT\System32` | Terminal: hex dump verde rolando, scanlines, prompt piscando | *Kernel Panic*: Mi frígio, 112 bpm | Y2K Bug |

- Quando o chefe chega, a música troca pro tema de chefe *Fatal Exception* (Dó menor harmônico, 168 bpm).
- **A run termina ao matar o chefe** (vitória) ou quando o HP chega a 0. Ao morrer o chefe, a tela é limpa e há 1.6s de "volta da vitória".
- As ondas continuam depois que o chefe chega, mais espaçadas.
- Arena: sem scroll. O formato acompanha a janela, mas a **área é constante** (400k unidades²).

Contrato `MapDef` (`game/maps/<id>.ts`): `waves`, `boss: { id, at }`, `music`, `unlockAfter`, `tier`
(multiplica KB) e `drawBackground(ctx, w, h, t)`.

### Ondas

Cada mapa lista as suas. Formato: `{ from, to, interval, batch, mix: { id: peso }, hpScale }`.

| Mapa | 0:00 | 0:30 | 1:00–1:30 | 2:00–2:30 | 3:00+ | HP × |
|---|---|---|---|---|---|---|
| Desktop | bug | +virus | +popup | +hourglass | mais de tudo | 1 → 2.1 |
| Web | cookie, spam mail | +popup | +banner ad | mais de tudo | | 1.2 → 2.6 |
| System32 | worm, bug | +virus, corrupted | +trojan, hourglass | mais de tudo | | 1.6 → 3.5 |

Limite de 260 inimigos vivos.

---

## 5. Loop de uma run

1. Escolhe o mapa em My Computer.
2. Começa com **Left Click** nível 1; stats = base + loja.
3. Inimigos soltam **bits** (XP). Raro: **floppy** (1.5% × sorte) e **coração** (0.7% × sorte, cura 25).
4. XP enche → **Level Up**: 3 opções (nova arma/item ou nível). Limite de **5 armas e 5 itens**. Tudo maxado → consumíveis.
5. 4:00 → aviso + chefe. Matar o chefe = vitória.
6. KB = `(kills×0.2 + segundos/4 + nível×3 + floppies×10) × (1 + 0.4×(tier−1)) + 120×tier se venceu`, × `greed`.

Curva de XP: `4 + (nível−1)×3 + (nível−1)^1.5`.

### Ctrl+Alt+Del (Task Manager)

- Cada kill enche 1/80 do medidor (botão na barra do jogo).
- Cheio: **Espaço** ou clique → abre o "Task Manager" sobre a arena, listando os inimigos como processos `bug.exe (11) — Not Responding` e dando *End Process* em todos.
- Mata todo inimigo comum e apaga as balas inimigas. Chefes aparecem como **Access Denied** e perdem só 10% do HP.

### Balanceamento (simulação headless, v0.3)

Bot que orbita o centro, foge do inimigo mais próximo e pega opções aleatórias:

| Cenário | Resultado típico |
|---|---|
| Desktop, sem loja | morre entre 1:00 e 2:30, às vezes vence (chega ao chefe ~50%) |
| Web, loja pela metade | vence ~2 de 3 |
| System32, loja cheia | vence; chefe leva 1–3 min |

Loja completa custa ~4.300 KB. Uma vitória rende ~200–1.000 (Desktop) até ~3.000+ (System32).

---

## 6. Stats

Calculados em `stats.ts`: **base → loja → itens da run**.

| Stat | Base | Efeito |
|---|---|---|
| maxHp | 100 | Vida máxima |
| regen | 0 | HP/s |
| moveSpeed | 230 | px/s |
| damage | 1 | multiplicador de dano |
| cooldown | 1 | multiplicador de recarga (menor = mais rápido) |
| projectileSpeed | 1 | multiplicador |
| area | 1 | tamanho de projéteis/auras/órbitas/explosões |
| magnet | 60 | raio de atração de pickups |
| armor | 0 | dano reduzido por golpe (mínimo 1) |
| greed | 1 | multiplicador de KB |
| amount | 0 | +projéteis / órbitas / explosões / ondas em toda arma |
| growth | 1 | multiplicador de XP |
| luck | 1 | multiplicador de chance de floppy e coração |
| invuln | 0.6 | segundos de invencibilidade após levar dano |

---

## 7. Armas

Contrato `WeaponDef<S>`: `create()`, `update(state, level, world, dt)`, `draw?()`, `levelText(level)`.
Toda arma que dispara várias coisas soma `stats.amount`.

| Arma | Ideia | Máx |
|---|---|---|
| **Left Click** (inicial) | Atira na direção do heading, com homing leve. Ganha cliques em leque e perfuração. | 8 |
| **Right Click** | Leque de cliques **pra trás**: cobre a fuga. | 6 |
| **Double Click** | Duas explosões rápidas em cima dos inimigos mais próximos. | 6 |
| **Selection Box** | Retângulo tracejado ("marching ants") em volta do ponteiro; dano a cada 0.5s. | 6 |
| **Desktop Icons** | Pastas orbitando o ponteiro, com knockback forte. | 6 |
| **Drag & Drop** | Arquivos bumerangue: vão até o inimigo e voltam, perfurando tudo nas duas passagens. | 6 |
| **Scroll Wheel** | Onda de choque que sai do ponteiro e empurra tudo pra longe. | 6 |

Ideias futuras: **Ctrl+Z** (volta 2s no tempo), **Caps Lock** (dano dobrado por 5s), **Print Screen**
(congela a tela), evoluções (arma máx + item específico).

---

## 8. Itens da run

| Item | Efeito / nível | Máx |
|---|---|---|
| RAM Stick | +20 max HP | 5 |
| Turbo Button | −8% recarga | 5 |
| Clean Mouse Ball | +10% velocidade | 5 |
| Large Fonts | +12% área | 5 |
| Defragmenter | +0.4 HP/s | 5 |
| Firewall | −1 dano recebido | 3 |
| High DPI | +30% alcance de pickup | 3 |
| DirectX 7 | +10% dano e velocidade de projétil | 5 |
| Dual Monitor | +1 projétil/órbita/explosão em toda arma | 2 |
| Browser Cache | +12% XP | 5 |
| Lucky Clip Art | +30% drops de floppy e coração | 3 |
| Screensaver | +0.2s de invencibilidade | 3 |

---

## 9. Loja (Control Panel)

Upgrades permanentes. "Uninstall all" devolve 100% do gasto.

| Upgrade | Efeito / nível | Máx | Custo (n → n+1) |
|---|---|---|---|
| Extra RAM | +15 max HP | 5 | 30 + 30n |
| CPU Upgrade | +10% dano | 5 | 40 + 40n |
| Overclock BIOS | −5% recarga | 5 | 50 + 50n |
| Optical Mouse | +6% velocidade | 5 | 30 + 25n |
| Drag Distance | +25% alcance de pickup | 3 | 25 + 25n |
| ScanDisk | +0.2 HP/s | 3 | 60 + 60n |
| Shareware License | +10% KB | 5 | 50 + 50n |
| Front-Side Bus | +6% XP | 5 | 40 + 45n |
| Lucky Mousepad | +15% drops | 3 | 35 + 40n |

---

## 10. Monstros

| Monstro | Mapa | HP | Vel. | Dano | XP | Comportamento |
|---|---|---|---|---|---|---|
| **Bug** | Desktop, System32 | 10 | 70 | 5 | 1 | Persegue em linha reta. Enxame. |
| **Virus** | Desktop, System32 | 22 | 62 | 9 | 2 | Zig-zag. |
| **Pop-up Ad** | Desktop, Web | 45 | 38 | 12 | 4 | Lento, 60% resistente a knockback. |
| **Hourglass** | Desktop 2:00+, System32 | 30 | 45 | 5 | 3 | Ao encostar, deixa o ponteiro **lento por 2s** (⌛ aparece no cursor). |
| **Spam Mail** | Web | 20 | 55 | 8 | 2 | Ao morrer, vira 2 **Spam**. |
| **Spam** | Web | 7 | 90 | 4 | 1 | Mini, rápido. |
| **Tracking Cookie** | Web | 12 | 95 | 5 | 1 | Rápido e errático. |
| **Banner Ad** | Web 1:30+ | 70 | 30 | 12 | 6 | Pisca e dá um bote no ponteiro a cada ~3s. |
| **Worm** | System32 | 18 | 88 | 7 | 2 | Serpenteia em grupos. |
| **Trojan Horse** | System32 1:30+ | 90 | 32 | 14 | 6 | Ao morrer, solta 4 bugs. |
| **Corrupted File** | System32 | 30 | 50 | 10 | 3 | Teleporta pra perto do ponteiro a cada 3–5s. |

### Chefes

Entram pela borda mais longe do jogador, têm barra de vida no topo e não sofrem knockback.

| Chefe | HP | Ataques |
|---|---|---|
| **Blue Screen** (Desktop) | 3.000 | Leque de 5 códigos hex mirado; anel de 16 a cada 6s; abaixo de 50% chama 6 bugs a cada 8s. |
| **Error 404** (Web) | 5.000 | Faíscas marcam onde vai aparecer → teleporta perto do jogador → anel de "?" (10, ou 14 ferido); encaminha 3 Spam Mail a cada 7s. |
| **Y2K Bug** (System32) | 6.000 | Espiral contínua de 0s e 1s; a cada 4s treme, mira e investe; solta ampulhetas a cada 10s. O relógio no casco vai de 99 a 00. |

Hooks de inimigo: `behavior`, `onTouch` (após dano de contato), `onDeath`, `boss`. Ataques usam
`world.fireBullet / fireRing / fireAimed`; reforços usam `world.spawnAround`.

### Pixel art

Sprites são texto (`<id>.sprite.ts`): cada caractere é um pixel da paleta; `.` é transparente.
Desenhados olhando pra direita e espelhados ao andar pra esquerda (`flip: false` desliga, como no
Y2K, pra não inverter os dígitos). 1 pixel = 2 unidades do jogo (chefes usam `pixel: 3`). O flash de
dano é uma silhueta branca gerada automaticamente.

---

## 11. Glossário e descoberta

O **Glossary** tem 3 abas: **Monsters**, **Weapons** e **Items**.

- Tudo começa como **File Not Found** (`Cannot find 'C:\Glossary\Monsters\entry07.dat'`).
- Monstro: desbloqueia ao **aparecer** numa run. Arma/item: ao ser **oferecido** num level-up (ou pego).
- A primeira descoberta mostra "New glossary entry!" acima do ponteiro, com um som.
- Contador "Found X of 33 entries" na barra de status e por aba.
- Monstros: preview ao vivo (zoom, andar, hitbox, tamanho vs. ponteiro, flash), folha de sprite (frames ampliados + paleta), lore e ficha.
- Armas: ícone, descrição e o que cada nível adiciona. Itens: efeito por nível e máximo.
- **Só em `npm run dev`**: monstros `status: 'concept'` aparecem como bancada de design, e há o checkbox "Reveal all (dev)".

Fluxo de design de um monstro: criar `<id>.ts` + `<id>.sprite.ts` com `status: 'concept'` → iterar no
glossário (dev) → `status: 'active'` e colocar o id no `mix` de uma onda do mapa.

---

## 12. Desktop e janelas

Depois do boot tudo vive num **desktop funcional** (`src/os/`): janelas se sobrepõem, ganham foco,
arrastam, minimizam pra taskbar, maximizam e fecham. Uma instância por app. A run pausa quando a
janela do jogo perde o foco.

| Janela | Metáfora Win2000 |
|---|---|
| Boot | Splash preto com barra de progresso, "Built on Click Technology" |
| Welcome | Janela inicial + System Properties (recordes) |
| My Computer | Seleção de mapa: cada mapa é um drive; bloqueados dizem "The device is not ready" |
| Credits | Caixa "About" com créditos rolando (menu Iniciar → Credits…) |
| Help | Abas: Basics, Controls, Maps & Bosses, Ctrl+Alt+Del, Shop. Armas/itens/monstros ficam de fora de propósito (são descobertos no glossário) |
| Control Panel | Loja |
| Glossary | Descoberta + bancada de design |
| pointer.exe | Jogo maximizado; HUD com HP, nível, Ctrl+Alt+Del, contagem do chefe e tempo |
| Level Up | "New components were found. Choose one to install" |
| Fim | Vitória: "It is now safe to turn off your computer." / Derrota: "This program has performed an illegal operation…" |
| Run Report | Estatísticas, KB, aviso de drive novo liberado, "Change map" |

Bandeja da taskbar: KB, música liga/desliga (♪), efeitos liga/desliga, relógio.

---

## 13. Roadmap

- [x] Desktop com janelas, menu Iniciar e créditos
- [x] Monstros em pixel art
- [x] 3 mapas com fundo, música e chefe
- [x] Glossário de monstros, armas e itens com descoberta
- [x] Ctrl+Alt+Del
- [ ] Evoluções de arma (arma máx + item específico → versão evoluída)
- [ ] Reroll / skip / banish no level-up
- [ ] Baús (dropados por elites)
- [ ] Ponteiros jogáveis com stats diferentes (mão, I-beam, ampulheta)
- [ ] Editor de pixel art dentro do glossário
- [ ] Pixel art pra pickups, projéteis e ícones de arma
- [ ] Tela de configurações (volume, screen shake, números de dano)
- [ ] Música também no desktop/menus
