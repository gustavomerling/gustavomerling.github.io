# 02 · Design de jogo

## Loop atual

Começa no primeiro prédio, atravessa prédios e becos para a direita, chega à **saída** no último prédio (W ou F na porta). A saída recarrega o mesmo mapa; morrer mostra "Tentar de novo" (mesma seed). A seed aparece no HUD.

## Controles

| Ação | Tecla | Observação |
|---|---|---|
| Mover | **A / D** (ou setas) | |
| Correr | **Shift** | |
| Pular | **Espaço** (ou W) | pulo variável, *coyote time*, *buffer* |
| Agachar / deslizar | **S** | parado = agacha; correndo = desliza |
| Descer de plataforma | **S + Espaço** | plataformas "one-way" |
| Escada | **W / S** | sobe/desce; A/D fica travado e o corpo centraliza na escada |
| Walljump | **Espaço** no ar junto à parede | segurar contra a parede caindo = *wall slide* |
| Escalar degrau (vault) | andar contra um degrau de 1 tile | automático; 2 tiles exigem pulo |
| Rolamento | automático | queda de mais de 4 tiles termina rolando |
| Câmera lenta | **E** | liga/desliga; gasta foco |
| Mirar / atirar | **mouse** / **botão esquerdo** | semi/rajada/auto conforme a arma |
| Trocar arma | **1-4** (ou roda) | abaixa uma, levanta a outra; ~0,3 s sem atirar |
| Pegar arma do chão | **F** perto dela | mesma arma = pente cheio; inventário cheio (4) = troca pela da mão |
| Chute | **Q** | empurra e atordoa quem está na frente |
| Recarregar | **R** | recarrega sozinho ao esvaziar |
| Usar a saída | **W** ou **F** | |
| Pausa | **Esc** | |
| Grade de medição | **F2** | ligada por padrão; mostra o tile sob o cursor |
| Debug | **F3** | FPS, salas, colisores, visão e estado da IA |
| God mode / inimigo no cursor | **F4** / **F6** | |
| Congelar / avançar 1 passo | **F8** / **F9** | |
| Replay da tentativa | **F10** | repete exatamente o que aconteceu |
| Tela cheia | **F11** | |

Os atalhos ficam em [src/game/input/actions.ts](../src/game/input/actions.ts). O código só pergunta por **ações** (`jump`, `fire`…), nunca por teclas.

## Medidas (a grade)

- **1 tile = 16 unidades.** A tela mostra sempre 270 unidades de altura (≈17 tiles) e a largura que a proporção da janela permitir (480 em 16:9), sem faixas pretas.
- **Chunk** = 30 tiles de largura × 21 de altura (336 unidades: mais alto que a tela, então a câmera acompanha o jogador na vertical).
- **Andar** = 4 tiles de pé-direito + 1 tile de laje. Quatro andares por prédio: lajes nas linhas 5, 10 e 15; chão na linha 20; telhado na linha 0.
- **Porta** entre chunks: as 3 linhas logo acima do chão (17–19), nas duas bordas.
- **Janela lateral** entre chunks, em cada andar de cima: 2 tiles de altura, centrada na parede (1 tile de peitoril, que se sobe com o vault, e 1 de parede em cima). Do outro lado sempre há onde pisar: a laje ou um patamar de 3 tiles.
- **Personagem**: 10×24 unidades em pé (1,5 tile), 14 agachado.
- **Pulo**: ≈ 3,4 tiles de altura. Um andar inteiro (5 tiles) **não** se alcança pulando: precisa de escada, buraco na laje ou plataformas intermediárias.

## Movimento

Valores em [src/game/config.ts](../src/game/config.ts) (`PLAYER_TUNING`).

- Andar 95 u/s · correr 155 u/s · agachado 45 u/s.
- Soltar o Espaço cedo corta o pulo. *Coyote time* 0,1 s; *jump buffer* 0,12 s.
- **Slide**: S em movimento rápido → 235 u/s decaindo por 0,45 s, colisor baixo. Começar um slide dá ~0,3 s de invulnerabilidade (esquiva). Pular durante o slide mantém o impulso; segurar S no ar entra em slide ao pousar.
- **Escadas**: W/S sobem e descem, A/D ignorados; Espaço salta para fora.
- **Walljump**: com parede a ~2 u, Espaço chuta para longe dela (340 u/s para cima, 210 u/s para o lado); 0,16 s sem controle aéreo.
- **Vault**: andar contra um degrau de 1 tile dispara uma subida curta automática.

## Combate

- **Hitbox por osso do rig**: cabeça ×2, tronco ×1, braços ×0,75, pernas ×0,6 (`HIT_ZONES`). Agachado, o hitbox abaixa junto.
- **Ricochete**: bala que bate na parede num ângulo rasante (< 45° da superfície) quica, até 2 vezes, perdendo 25% do dano. Munição ricochete quica em qualquer ângulo.
- **Impacto**: *knockback* proporcional ao dano; inimigo atingido fica atordoado ~0,3 s (mais no headshot) e o rig reage (cabeça tomba, tronco recua).
- **Morte**: o corpo vira **ragdoll** (física verlet) empurrado pelo último golpe; some após ~12 s.
- **Jogador**: ~0,35 s de invulnerabilidade após levar dano (o boneco pisca).
- **Munição**: infinita por enquanto (sem drops); recarregar ainda leva tempo.
- **Feedback**: marcador na mira ao acertar (laranja no headshot, vermelho na kill), coice da arma no rig. Sem efeitos de partícula nem som nesta fase.

## Câmera lenta (bullet time)

**E** alterna. O mundo vai a **30%** da velocidade, o jogador a **60%**. Gasta a barra de **foco**, que recarrega devagar sozinha e rápido com headshots e kills.

## Inimigos (IA)

Placeholders: os nomes vêm do tema antigo e vão mudar.

| Inimigo | Tipo | Vida | Arma |
|---|---|---|---|
| Estagiário | melee | 30 | soco |
| Segurança | atirador | 60 | Glock |
| Analista de TI | atirador | 45 | Uzi |
| Gerente | tanque | 160 | AK-47 |

- **Percepção**: veem dentro do alcance, na direção em que olham (ou bem perto, ou se já alertas), com linha de visão (paredes bloqueiam; plataformas e escadas não). Ouvem os tiros do jogador no raio de ruído da arma. Levar tiro também alerta.
- **Memória**: ficam alertas ~3 s e vão até a última posição conhecida.
- **Atiradores**: tempo de reação, mira com giro limitado (lentos em câmera lenta), erro de mira, rajadas com pausa, agacham atrás de degraus de 1 tile entre rajadas. Causam 50% do dano da arma.
- **Melee**: corre até você, pula obstáculos, prepara o soco (braço para trás) e bate com *knockback*.
- **Patrulha** quando calmos; **alerta em grupo** num raio de ~140 u.

Ajustes em `AI` no [config.ts](../src/game/config.ts).

## Armas e attachments

Armas são dados em [content/weapons/catalog.ts](../src/game/content/weapons/catalog.ts): Glock (semi), Uzi, PP-Bizon e AK-47 (auto). O jogador começa com Glock e Uzi.

Attachments ([content/attachments/catalog.ts](../src/game/content/attachments/catalog.ts)) mudam números (`add` antes de `mul`) e comportamentos: silenciador (menos ruído), compensador, mira laser (linha visível), carregador estendido, tambor, kit de conversão (pistola automática), munição ricochete e perfurante.

## Mapa

**Chunks feitos à mão, montados proceduralmente**, numa fileira da esquerda para a direita ([procgen/level.ts](../src/game/procgen/level.ts)).

1. **Ritmo**: prédio, beco, prédio, beco… (um beco sempre fica entre dois prédios) e nunca o mesmo chunk duas vezes seguidas. O primeiro e o último prédio são fixos (`startTemplate` / `endTemplate`).
2. **Prédios**: quatro andares na grade, ligados por escadas, buracos na laje e plataformas intermediárias. Parede de fundo com janelas por onde se vê o céu. Os andares de cima se ligam aos vizinhos pelas janelas laterais.
3. **Becos** (`outdoor`): abertos para o céu entre duas fachadas. O beco "Vão" tem um poço que só se sobe com walljump.
4. **Marcadores** no template: `P` (início), `X` (saída), `E` (inimigo, sorteado do *pool* do bioma), `W` (janela), `H` (escada).

Regras de autoria em [procgen/rooms.ts](../src/game/procgen/rooms.ts) e os chunks em [procgen/chunks/alley.ts](../src/game/procgen/chunks/alley.ts). Os testes garantem que toda superfície de cada chunk é alcançável e que um bot atravessa o mapa inteiro.

## Decisões em aberto

- [ ] Tema, nome e direção de arte.
- [ ] Munição finita? Drops?
- [ ] Limite da câmera lenta (a barra de foco fica?).
- [ ] Quantas armas o jogador carrega.
- [ ] Loop roguelite e meta-progressão.
