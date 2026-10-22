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
- **Impulso no ar**: velocidade acima da normal (pulo do slide, walljump, soltar o Shift no ar) só se perde devagar (`airOverspeedDrag`); apertar para o outro lado ainda freia na hora, e soltar as teclas em velocidade normal para rápido.
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
- **Dispersão** (`GUNPLAY` no config): cada tiro abre o cone pelo `recoil` da arma, até +6°; ele só fecha quando a arma já poderia atirar de novo. Segurar o gatilho ou clicar no limite abre o cone; ritmar os tiros mantém a precisão.
- **Gatilho**: um clique até 0,12 s antes da arma estar pronta ainda dispara. A última bala do pente já começa a recarga. Atirar durante a recarga com balas no pente a interrompe: pente só antes de sair da arma; escopeta a qualquer momento, ficando com os cartuchos já colocados.
- **Feedback**: marcador na mira ao acertar (laranja no headshot, vermelho na kill), coice da arma no rig. Sem efeitos de partícula nem som nesta fase.

## Câmera lenta (bullet time)

**E** alterna. O mundo vai a **30%** da velocidade, o jogador a **60%**. Gasta a barra de **foco**, que recarrega devagar sozinha e rápido com headshots e kills.

## Modos

Escolhidos no menu principal ([content/modes/catalog.ts](../src/game/content/modes/catalog.ts)).

- **Jogar** (campanha): o loop descrito acima, com estagiários, seguranças, analistas, zeladores, auditores e gerentes.
- **Modo zumbi**: chegar à saída com a horda atrás. Pontuação: kills, headshots e tempo.
  - Os zumbis da fase são os do pool do modo (zumbi, corredor, inchado), no lugar do pool do bioma. Ficam parados até **notar** o jogador (dentro do `sightRange`, através de paredes), **ouvir um tiro** ou levar um; daí em diante nunca perdem a pista. Atirar acorda a vizinhança: o silenciador vale ouro.
  - **Ondas** ([systems/horde.ts](../src/game/systems/horde.ts), valores em `horde` no [catálogo de modos](../src/game/content/modes/catalog.ts)): respiro (nada nasce; os 3 s finais são o aviso) e **surto** (grupos chegam um zumbi por vez, a cada 0,5 s). Primeiro surto aos 8 s.
  - **Intensidade** 0..1 = metade tempo vivo (4 min para o máximo), metade progresso até a saída. Ela move tudo: respiro 10→6 s, surto 10→18 s, grupo a cada 3,2→1,8 s com 1→3 zumbis, teto de 7→16 caçando perto, e o sorteio puxa mais corredores e inchados (no máximo 4 corredores e 2 inchados por vez).
  - **Nascimento justo**: no chão, atrás do jogador (na frente só se atrás não couber), **fora da câmera** (a faixa de 260–420 u começa na borda da tela se ela for mais larga), longe de outro zumbi e **com rota** até o jogador.
  - **Reciclagem**: zumbi a mais de 640 u para trás, ou parado 6 s sem progresso, some quando fora da tela (não conta kill) e libera o teto.
  - **Munição finita**: cada arma começa com 2 pentes de reserva; cada kill devolve 30% de um pente a todas as armas (teto de 5 pentes). Tiro no corpo gasta bala sem render nada.

## Zumbis

Os três são melee (o mesmo cérebro do estagiário) com `omniscient`: sentem o jogador **através de paredes**, dentro do `sightRange`, como se farejassem. Seguem uma rota pelo mapa ([pathing/navgraph.ts](../src/game/pathing/navgraph.ts)): andam, pulam degraus e vãos, descem de bordas e **sobem escadas** (vão até a escada, sobem e saem para o lado do andar de cima; descer é cair pelo vão da escada). Levar um tiro na escada faz soltar e cair. Sem rota possível, param de vez quando o alvo está exatamente acima/abaixo (em vez de girar no lugar). Os valores estão em [content/enemies/catalog.ts](../src/game/content/enemies/catalog.ts).

- **Só a cabeça mata**: tiros no corpo, braços ou pernas nunca levam a vida abaixo de 1; um headshot mata na hora.
- **Pernas**: um tiro nas pernas derruba o zumbi. O colisor abaixa e ele passa a se arrastar (45% da velocidade), sem pular nem subir.

| Zumbi | Vida | Velocidade | Alcance de percepção |
|---|---|---|---|
| Zumbi | 35 | 38 | 230 |
| Corredor | 22 | 55 (arrancada 145) | 300 |
| Inchado | 120 | 28 | 200 |

**Papéis** (`zombie` em cada inimigo do catálogo; regras comuns em `ZOMBIE`, [systems/zombies.ts](../src/game/systems/zombies.ts)):

- **Zumbi — agarra.** Para na sua frente com os braços armados (0,5 s): recuar, chutar, deslizar ou acertar qualquer tiro cancela. Se pega, **prende** (não anda nem pula) e morde em 0,85 s (22). Para escapar: apertar **A/D/Espaço 3 vezes**, ou acertar o zumbi (qualquer tiro ou chute o faz soltar). Só um agarra por vez; os outros arranham (8). Depois de soltar ou ser mordido, 0,6 s sem novo agarrão.
- **Corredor — arrancada.** Anda devagar até te ver no mesmo andar a até 150 u: **para e se arma por 0,45 s** (a deixa para virar e mirar) e dispara a 145 u/s por até 1,6 s (anda mais que você andando, menos que correndo). Arranha forte (14), não agarra. Recarga da arrancada 3,5 s.
- **Inchado — estoura.** Lento, agarra mais tempo (1 s, 5 apertos para escapar, mordida 32). Ao morrer **estoura**: mata os zumbis num raio de 44 u (contam como kills, inclusive outro inchado, em cadeia) e tira 25 do jogador a até 40 u. Matar de longe no meio do grupo é uma ferramenta; matar agarrado custa caro.
- **Rastejante** (perna atingida): rasteja pela rota (sem pulos nem escadas), ataca devagar (×1,5), só belisca (6) e nunca agarra.
- **Fila, não pilha**: zumbis no mesmo andar andando um contra o outro desaceleram e param a ~6 u, formando uma fila legível em vez de um bloco com todas as cabeças no mesmo ponto.

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
- **Atiradores**: sem visão, seguem a mesma rota dos zumbis até a última posição conhecida (escadas e pulos incluídos), em vez de andar reto. Tempo de reação, mira com giro limitado (lentos em câmera lenta), erro de mira, rajadas com pausa, agacham atrás de degraus de 1 tile entre rajadas. Causam 50% do dano da arma.
- **Jogo limpo**: atiradores só disparam de dentro da tela; fora dela andam até entrar, e o tempo de reação só conta depois. O erro de mira começa em 2× e assenta em ~1,2 s com você à vista (perder a visão zera).
- **Tanque** (gerente): não se esconde, avança devagar entre as rajadas e tem *poise* 20: tiros no corpo abaixo disso não o atordoam (headshot sempre atordoa), então não dá para travá-lo com a Uzi.
- **Melee**: corre até você, pula obstáculos, prepara o soco (braço para trás) e bate com *knockback*.
- **Patrulha** quando calmos; **alerta em grupo** num raio de ~140 u.

Ajustes em `AI` no [config.ts](../src/game/config.ts).

## Armas e attachments

Armas são dados em [content/weapons/catalog.ts](../src/game/content/weapons/catalog.ts): Glock (semi), Uzi, PP-Bizon e AK-47 (auto). O jogador começa com Glock e Uzi.

Attachments ([content/attachments/catalog.ts](../src/game/content/attachments/catalog.ts)) mudam números (`add` antes de `mul`) e comportamentos: silenciador (menos ruído), compensador, mira laser (linha visível), carregador estendido, tambor, kit de conversão (pistola automática), munição ricochete e perfurante.

## Mapa

**Chunks feitos à mão, montados proceduralmente**, numa fileira da esquerda para a direita ([procgen/level.ts](../src/game/procgen/level.ts)).

1. **Ritmo**: prédio, beco, prédio, beco… (um beco sempre fica entre dois prédios), de 5 a 7 chunks. Nunca o mesmo chunk duas vezes no mesmo mapa (enquanto houver opção). O primeiro e o último prédio são fixos (`startTemplate` / `endTemplate`).
2. **Espelho**: cada chunk do meio tem 50% de chance de vir espelhado (escadas e buracos trocam de lado), o que dobra as rotas sem sair da grade (`mirrorChance` no bioma).
3. **Prédios**: quatro andares na grade, ligados por escadas, buracos na laje e plataformas intermediárias. Parede de fundo com janelas por onde se vê o céu. Os andares de cima se ligam aos vizinhos pelas janelas laterais. O "Prédio 5" corta o térreo com uma escadaria de degraus de 1 tile (sobe com o vault, andando) que leva ao 2º andar; volta-se ao térreo pela escada de mão do outro lado. Espelhado, o caminho é o inverso: escada de mão para subir, escadaria para descer.
4. **Becos** (`outdoor`): abertos para o céu entre duas fachadas. "Vão" tem um poço que só se sobe com walljump. "Passarela" tem uma passarela no 3º andar ligando as janelas das fachadas; atiradores lá em cima cobrem o chão, que tem um degrau e uma barricada de 2 tiles como cobertura.
5. **Marcadores** no template: `P` (início), `X` (saída), `E` (candidato a inimigo), `W` (janela), `H` (escada).
6. **Encontros** (`encounters` no bioma): os `E` são candidatos. A fração preenchida sobe ao longo do mapa (35% na primeira sala com inimigos → 75% na última; uns 18 a 24 inimigos por mapa), com pelo menos 2 por sala e espalhada pelos andares. Nada a menos de 4 tiles da parede esquerda da sala (por onde se entra, pela porta ou pela janela). No *pool*, `from` atrasa os pesados: auditor a partir de 25% do mapa, gerente a partir de 50%.

Regras de autoria em [procgen/rooms.ts](../src/game/procgen/rooms.ts) e os chunks em [procgen/chunks/alley.ts](../src/game/procgen/chunks/alley.ts). Os testes garantem que toda superfície de cada chunk é alcançável, que um bot jogando com as teclas segue a rota até a saída em todo chunk (normal e espelhado), e uma varredura de 150 seeds ([procgen/sweep.test.ts](../src/game/procgen/sweep.test.ts)): saída alcançável com o pulo do jogador, nenhum lugar alcançável sem volta (*softlock*), todo inimigo em chão firme e com rota para a saída, rampa de dificuldade e determinismo.

## Decisões em aberto

- [ ] Tema, nome e direção de arte.
- [ ] Munição finita? Drops?
- [ ] Limite da câmera lenta (a barra de foco fica?).
- [ ] Quantas armas o jogador carrega.
- [ ] Loop roguelite e meta-progressão.
