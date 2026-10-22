# 05 · Direção de arte

> Base para o passe visual. Fonte única das cores: [`src/game/render/palette.ts`](../src/game/render/palette.ts).

## Estilo: vetor plano refinado

- **Formas lisas e chapadas**, cantos arredondados (cápsulas, discos, polígonos simples). Sem textura, sem gradiente em objetos de jogo (gradiente só no céu).
- **Contorno escuro fino** (`INK.outline`, `LINE.rig` = 0,9 u) em tudo que é personagem, arma, detrito. O cenário não tem contorno: só a borda clara do bloco onde ele encontra o vazio.
- **Sem pixel art.** Resolução nativa, linhas finas, antialias ligado.
- **Grade de medição (F2)** sempre por cima dos tiles e sempre legível; nenhum efeito pode desligá-la ou escondê-la.

## Hierarquia de contraste

1. **Jogabilidade** (mais forte): perigo/telegrafia, projéteis, mira, saída, pickups.
2. **Personagens**: jogador quase branco; inimigos em cores saturadas médias/claras, por família.
3. **Cenário** (mais fraco): fundo escuro e de baixo contraste, céu e prédios distantes quase da mesma luminância.

Regra prática: se um elemento do cenário compete com um personagem ou com uma bala, ele está claro demais.

## Paleta (tokens compartilhados)

| Token | Cor | Uso |
| --- | --- | --- |
| `INK.outline` | `#07080a` | Contorno de tudo |
| `PLAYER.body` | `#f2f2f2` | Jogador (o corpo mais claro da tela) |
| `ENEMY.office.*` | `#7fd1ff` `#ffb347` `#9cff8a` `#c79bff` `#7ef0d6` `#ff6b6b` | Inimigos da cidade |
| `ENEMY.undead.*` | `#8fbf7a` `#d9a56b` `#7f9a6e` | Zumbis (verdes/ocre apagados) |
| `ENEMY.skeleton.*` | `#ddd6c2` `#cfc8b4` | Esqueletos (osso) |
| `TEAM.player.*` | `#fff6a0` / `#eef4ff` | Balas e golpes do jogador (claro, quente) |
| `TEAM.enemy.*` | `#ff7a7a` / `#ff9a8a` | Balas e golpes inimigos (família do vermelho) |
| `DANGER.base` | `#ff3c3c` | **Único** vermelho de perigo: laser, telegrafia, dano, kill |
| `ACCENT.base` | `#ffd23f` | **Único** destaque: saída, pickups, munição |
| `ACCENT.warm` | `#ffb347` | Headshot, destaque secundário |
| `FX.*` | faísca `#ffd27a`, fumaça `#b8bec8`, poeira `#8a7f6e`, sangue `#9e1b1b`/`#c22a2a` | Efeitos |
| `GUN.*` | cinzas, madeira, latão | Armas |
| `GRID.line` | `#a0c8ff` | Grade F2 (alfas 0,1 / 0,22 / 0,4) |

Larguras de linha em `LINE` (unidades de mundo; 1 tile = 16).
As variáveis CSS (`:root` em `src/ui/styles.css`) espelham estes tokens: mudou um, muda o outro.

## Temas por modo

O tema (`Theme`) guarda o clima: céu, cor de fundo, tiles, paredes dos prédios, cor da saída. `THEMES.campaign` é a base; os outros são sobreposições parciais (`defineTheme`).
Escolha: `RunModeDef.theme ?? BiomeDef.theme`, aplicada em `RunScene` com `setTheme(...)`. Renderizadores leem `theme()`.

- **Campanha (`campaign`)** — cidade à noite, azul-arroxeado frio, janelas acesas amarelas, lua. Neutro, convidativo, legível.
- **Zumbi (`zombie`)** — a mesma cidade, mais ameaçadora: céu verde-acinzentado doente, lua pálida, quase nenhuma janela acesa, paredes mais apagadas. O perigo vermelho continua idêntico.
- **Medieval (`castle`)** — entardecer quente (azul → rosa → laranja), montanhas, silhueta de castelo com estandartes, pedra mais clara.

Para um modo novo: adicione um `ThemeId`, escreva só o que muda em um `DeepPartial<Theme>` e registre em `THEMES`.

## Regras para os próximos passos

1. **Só tokens.** Nada de `'#hex'` ou `rgba(...)` literal em renderizadores; crie o token em `palette.ts` (use `rgba(token, alfa)` para fades). Cores de debug (magenta) são a exceção.
2. **Cor de jogo é compartilhada, clima é do tema.** Perigo, aliado/inimigo, saída e grade não mudam entre modos.
3. **Efeitos não escondem telegrafia.** Nada (fumaça, partícula, luz, tremor, vinheta) pode cobrir laser, ponto de ataque, balas inimigas ou a grade F2. Desenhe efeitos atrás deles ou com alfa baixo.
4. **Todo efeito novo tem um interruptor** (flag/config) para desligá-lo e comparar.
5. **Fundo continua baixo contraste.** Luz e cenário novos ficam abaixo dos personagens na hierarquia.
6. **Sem mudar formas sem motivo.** O passe é de acabamento: proporções e colisores ficam como estão.
