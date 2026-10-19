# 02 · Design de jogo

## Gênero e loop

Roguelite de ação 2D em plataforma, inspirado em **Dead Cells**:

1. Começa uma **run** com equipamento básico.
2. Atravessa **andares (biomas)** gerados proceduralmente a partir de uma *seed*.
3. Encontra armas, attachments e itens; morre; volta ao início.
4. (A definir) progressão permanente entre runs — ideia: **vale-refeição** como moeda, gasto na Copa.

A seed é exibida no HUD: a mesma seed gera exatamente os mesmos mapas (útil para depurar e para desafios).

## Controles

| Ação | Tecla | Observação |
|---|---|---|
| Mover | **A / D** (ou setas) | |
| Pular | **Espaço** ou **W** | pulo variável, *coyote time*, *buffer*; W também usa a saída (porta/elevador) |
| Agachar / deslizar | **S** | parado = agacha; correndo = desliza |
| Descer de plataforma | **S + Espaço** (ou S + W) | plataformas "one-way" |
| Correr | **Shift** | |
| Câmera lenta | **E** | liga/desliga |
| Mirar | **mouse** | |
| Atirar | **botão esquerdo** | semi/rajada/auto conforme a arma |
| Trocar arma | **roda do mouse** (ou 1 / 2) | |
| Lançar item | **botão direito** ou **G** | *proposta* |
| Trocar item | **Q** | *proposta* |
| Recarregar | **R** | *proposta*; recarrega sozinho ao esvaziar |
| Interagir | **F** | *proposta*; elevador, baús, portas |
| Pausa | **Esc** | |
| Debug | **F3** | FPS, salas, hitboxes, visão e estado da IA |
| God mode | **F4** | debug |
| Criar inimigo / itens no cursor | **F6** / **F7** | debug |
| Congelar / avançar 1 passo | **F8** / **F9** | debug |
| Replay da tentativa | **F10** | debug: repete exatamente o que aconteceu |
| Tela cheia | **F11** | só no .exe |

Os atalhos estão todos em [src/game/input/actions.ts](../src/game/input/actions.ts). O código do jogo só pergunta por **ações** (`jump`, `fire`…), nunca por teclas, então remapear é trivial (tela de remapeamento: futuro).
## Movimento

Valores em [src/game/config.ts](../src/game/config.ts) (`PLAYER_TUNING`).

- Andar 95 px/s · correr 155 px/s · agachado 45 px/s.
- Pulo ≈ 3,5 tiles de altura; soltar o Espaço cedo corta o pulo.
- *Coyote time* 0,1 s; *jump buffer* 0,12 s.
- **Slide**: S em movimento rápido → 235 px/s decaindo por 0,45 s, colisor baixo (passa por vãos de 1 tile). Pular durante o slide mantém o impulso.
- **Slide aéreo**: correr → pular → segurar S no ar mantém a inércia horizontal e, ao tocar o chão, entra direto em slide.

## Combate

- **Hitbox por parte do corpo**, testada nos ossos do rig: cabeça ×2, tronco ×1, braços ×0,75, pernas ×0,6 (`HIT_ZONES` em [config.ts](../src/game/config.ts)). Vale para inimigos e para o jogador.
- **Número de dano** flutuante sobre o ponto atingido; vermelho com `!` na cabeça, cinza nas pernas, vermelho forte quando é você que leva.
- **Ricochete**: bala que atinge a parede num ângulo rasante **menor que 45°** (em relação à superfície) quica; até 2 quiques, perdendo 25% do dano em cada. Munição ricochete quica em qualquer ângulo, até 4 vezes. Bater em quina para a bala.
- **Cobertura**: blocos de 1 tile no chão. Agachado você fica escondido; em pé atira por cima.

### Sensação de tiro e impacto

- **Disparo**: som sintetizado por classe de arma (pistola/SMG/fuzil, abafado com silenciador, mais grave em câmera lenta), clarão no cano, faíscas, fumaça, **cápsula ejetada** que quica no chão, **traçante** da bala e tranco de câmera.
- **Impacto**: faíscas e poeira na parede; "sangue" estilizado no corpo; **knockback** proporcional ao dano; inimigo atingido fica **atordoado** ~0,3 s (para de atirar, correr e socar; mais no headshot); o rig reage (cabeça tomba no headshot, tronco recua).
- **Morte**: o corpo vira **ragdoll** (física verlet) empurrado pelo tiro final; some após ~12 s.
- **Feedback**: marcador na mira ao acertar (laranja no headshot, vermelho na kill), pequena pausa (*hit-stop*) em headshot e kill.

### Jogador

- **Dano recebido**: indicador vermelho na direção de onde veio, borda pulsante com vida < 30%, ~0,35 s de invulnerabilidade (boneco pisca).
- **Esquiva**: iniciar um slide dá ~0,3 s de invulnerabilidade — balas atravessam ("esquiva").
- **Foco** (barra azul): a câmera lenta gasta foco; recarrega devagar sozinho e rápido com headshots e kills.

### Economia

- **Munição de reserva** por arma (`+51` no HUD). Recarregar tira da reserva; sem reserva, clique seco.
- **Drops** dos inimigos (tabela por inimigo): dinheiro (R$ 5 por moeda), vida (+20), munição (+1 pente de cada arma) — atraídos para você quando chega perto. Caixas às vezes também dropam.
- **Armas no chão**: aparece `[F] AK-47`; F pega (até 2 armas) ou troca pela da mão, que fica no chão.

### Cenário reativo

| Prop | Comportamento |
|---|---|
| Caixa | bloqueia passagem, tiro e visão; quebra com tiros/socos/explosões; pode dropar item |
| Porta | 3 tiles; separa salas, bloqueia visão; o Estagiário soca até quebrar |
| Barril explosivo | explode ao quebrar (fere todo mundo, inclusive você) e encadeia outros barris |
| Luminária | atire para derrubar: esmaga quem estiver embaixo |
| Extintor | atire para soltar uma nuvem de fumaça que **bloqueia a visão** dos inimigos por ~7 s |

## Inimigos (IA)

- **Percepção**: veem dentro do alcance (`sightRange`), na direção em que olham (ou bem perto, ou se já alertas), com **linha de visão** (paredes bloqueiam; plataformas não). **Ouvem** tiros do jogador no raio de ruído da arma (o silenciador reduz muito) e explosões. Levar tiro também alerta.
- **Memória**: ficam alertas ~3 s após perder você de vista e vão atrás da última posição conhecida.
- **Atiradores** (Segurança/Glock, Analista de TI/Uzi, Gerente/AK): tempo de reação, mira que acompanha com velocidade limitada (em câmera lenta ficam lentos), erro de mira, rajadas com pausas, recarregam. Causam 50% do dano da arma.
- **Melee** (Estagiário): corre até você, pula obstáculos, prepara o golpe (braço para trás) e soca com knockback.
- **Patrulha**: calmos, andam devagar de um lado para o outro, viram em paredes e beiradas, param de vez em quando.
- **Alerta em grupo**: quem te vê "grita" e alerta quem está a ~140 px.
- **Avanço**: atiradores que te perderam de vista vão até a última posição conhecida.
- **Cobertura**: atiradores procuram um bloco baixo entre eles e você e **se agacham** entre rajadas (o hitbox abaixa junto com o rig).
- **Flashbang** deixa os inimigos cegos e parados; **fumaça** bloqueia a visão.
- Ajustes em `AI` no [config.ts](../src/game/config.ts).

## Escopo atual

**Um cenário só (Becos)**, para facilitar os testes. A saída recarrega o mesmo mapa; morrer mostra "Tentar de novo" (mesma seed). Apartamento, Recepção e Open Space continuam no catálogo, fora da run.
- Não dá para levantar debaixo de teto baixo.

## Câmera lenta (bullet time)

- **E** alterna. O mundo vai a **30%** da velocidade; o jogador a **60%** — ele fica relativamente mais rápido (estilo Max Payne / Wanted).
- Balas usam o tempo do mundo: em câmera lenta você vê os projéteis voando.
- A transição é suave (rampa), e há *hit-stop* em explosões.
- **Aberto:** limite de uso (barra de "foco" que esvazia? recarrega com kills?).

## Armas

Somente armas de fogo, começando pelas básicas. Cada arma é um **dado** em [src/game/content/weapons/catalog.ts](../src/game/content/weapons/catalog.ts).

| Arma | Classe | Modo | Dano | Cad. (tiros/s) | Pente | Recarga |
|---|---|---|---|---|---|---|
| Glock | pistola | semi | 14 | 6 | 17 | 1,1 s |
| Uzi | SMG | auto | 8 | 14 | 32 | 1,4 s |
| PP-Bizon | SMG | auto | 9 | 11 | 64 | 2,2 s |
| AK-47 | fuzil | auto | 22 | 9 | 30 | 1,9 s |

Atributos: dano, cadência, pente, recarga, dispersão, velocidade do projétil, alcance, projéteis por tiro, recuo, ruído.

Próximas candidatas: revólver, escopeta (usa `pellets`), MP5, M4, Desert Eagle.

## Attachments

Cada arma tem **slots** (`muzzle`, `underbarrel`, `magazine`, `ammo`, `conversion`) e cada slot aceita um attachment. Attachments fazem duas coisas:

1. **Modificam números** (`add` aplicado antes de `mul`).
2. **Mudam a jogabilidade** via *behaviors* — o ponto principal do design.

| Attachment | Slot | Efeito |
|---|---|---|
| Silenciador | muzzle | ruído ×0,2, dano ×0,9, `silenced` |
| Compensador | muzzle | recuo ×0,5, dispersão ×0,8 |
| Mira laser | underbarrel | dispersão ×0,6, `laserSight` (linha de mira visível) |
| Carregador estendido | magazine | pente ×1,5, recarga ×1,15 |
| Tambor | magazine | pente ×2,5, recarga ×1,6, cadência ×0,9 |
| Kit de conversão | conversion (só pistola) | vira **automática**, cadência ×2, dispersão ×2 |
| Munição ricochete | ammo | quica 1× na parede, dano ×0,85 |
| Munição perfurante | ammo | atravessa 1 inimigo, velocidade ×1,2 |

Já funcionando no protótipo: modos de tiro, `ricochet`, `pierce`, `laserSight`. Ainda só declarados: `silenced` (precisa de IA que escuta), `knockback`.

## Itens

| Item | Efeito | Pavio | Raio |
|---|---|---|---|
| Granada | explosão: 80 de dano, tremor de câmera, hit-stop | 1,6 s | 56 px |
| Flashbang | atordoa inimigos por 3 s; cega o jogador se estiver perto | 1,2 s | 96 px |

Itens são arremessados na direção da mira, quicam no cenário e explodem ao fim do pavio.

## Geração procedural

Abordagem Dead Cells/Spelunky: **salas feitas à mão, montadas proceduralmente**, mas num jogo **lateral, da esquerda para a direita**.

1. **Layout:** uma fileira de salas lado a lado; a quantidade vem do bioma (`rooms.min/max`). A variedade vem das salas, não do formato do caminho.
2. **Salas:** cada sala recebe um *template* ASCII de 30×17 tiles compatível com as *tags* do bioma. Um bioma pode fixar a primeira e a última sala (`startTemplate` / `endTemplate`) — ex.: a run sempre começa no quarto do Paulo.
3. **Conexões:** portas laterais (linhas 12–15) entre salas vizinhas. (O gerador ainda sabe escavar poços verticais, caso um dia queiramos andares de cima/baixo.)
4. **Marcadores:** `P` (início), `X` (saída, no fim à direita; rótulo definido pelo bioma em `exitLabel`), `E` (inimigo, sorteado do *pool* do bioma; *pool* vazio = bioma pacífico).

Ordem planejada: **Apartamento → Becos → Recepção → Open Space** (hoje a run usa só os Becos — ver "Escopo atual").

Detalhes e regras de autoria em [src/game/procgen/rooms.ts](../src/game/procgen/rooms.ts).

**Próximos passos:** salas laterais opcionais (tesouro, loja, desafio), portas trancadas, salas especiais por bioma, rotas alternativas entre biomas.

## Decisões em aberto

- [ ] Título definitivo.
- [ ] Barra de foco para a câmera lenta (limitada ou livre?).
- [ ] Dano próprio de granadas.
- [ ] Moeda/meta-progressão e o que se desbloqueia.
- [ ] Quantos slots de arma o jogador carrega (hoje: lista livre).
- [ ] Rolar/esquivar (Dead Cells tem): usar o slide como esquiva com invencibilidade?
- [ ] Munição finita por run ou só pente/recarga?
