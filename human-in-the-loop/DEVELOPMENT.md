# Plano de desenvolvimento

Cada passo termina com algo **jogável e testável**. Fluxo: implemento, faço
`npm run build`, você testa e aprova, e só então sigo para o próximo.
Ao aprovar, o passo é commitado junto com o `dist/`.

Regras fixas (ver [README](README.md#4-escopo-da-primeira-versão)): um NPC por
simulação, o NPC nunca usa armas, o jogador não cria NPCs.

---

## Fase A: Base do mundo e do jogador

| # | Passo | Como testar |
|---|-------|-------------|
| 1 ✅ | **Laboratório e loop**: sala minimalista (piso, paredes, pilares), luz e sombras, loop com passo fixo de física. O hello world é reorganizado em módulos (`world`, `render`, `loop`). | A sala aparece, sem travamentos, e redimensiona com a janela. |
| 2 ✅ | **Câmera FPS**: pointer lock, olhar com o mouse, ajuste de sensibilidade. | Clicar captura o mouse, Esc solta, o olhar é suave. |
| 3 ✅ | **Corpo do jogador**: cápsula com character controller do Rapier. Andar, correr, pular, agachar, subir degraus e rampas. | Não atravessa paredes, sobe a rampa, agacha embaixo de um obstáculo. |
| 4 ✅ | **HUD e debug**: mira central, painel de debug (FPS, mostrar colliders, pausar e avançar a física quadro a quadro, reset). | Cada botão de debug funciona. |
| 5 ✅ | **Obstáculos**: modo construção (B) com prévia fantasma, encaixe na grade, rotação, colocar e remover caixa, parede, rampa e mesa. Objetos dinâmicos podem ser empurrados. | Montar uma barricada e empurrar caixas com o corpo. |

## Fase B: Ragdoll ativo (o coração do jogo)

| # | Passo | Como testar |
|---|-------|-------------|
| 6 ✅ | **Ragdoll passivo**: manequim de ~13 partes (cabeça, tronco, pelve, braços e pernas em 2 segmentos, mãos, pés), juntas com limites anatômicos. | O manequim cai mole de forma crível, sem explodir nem dobrar ao contrário. |
| 7 ✅ | **Visual do manequim e reset**: malhas por parte (cápsulas e caixas, sem rosto), tecla R reseta a simulação. | Visual limpo, e o reset recoloca o NPC em pé. |
| 8 ✅ | **Motores PD**: as juntas seguem uma pose-alvo, com força global ajustável no debug (de mole a rígido). | Variar a força pelo slider: de pano a estátua. |
| 9 ✅ | **Equilíbrio em pé**: o controle mantém o centro de massa sobre os pés e o tronco ereto. | O NPC fica em pé sozinho e aguenta um empurrão leve. |
| 10 ✅ | **Passo de recuperação**: quando o centro de massa sai da base, o NPC dá passos na direção certa para não cair. | Empurrão médio: ele cambaleia e se recupera. |
| 11 ✅ | **Queda controlada**: se não recupera, estende os braços para amortecer e protege a cabeça. *Feito junto: braços ajudando no equilíbrio, volta à postura confortável (arruma os pés) depois de se estabilizar.* | Empurrão forte: cai apoiando as mãos, não como um saco. |
| 12 ✅ | **Levantar**: sequência deitado, sentado, ajoelhado, em pé, guiada por poses, adaptada a quem caiu de bruços ou de costas. *Feito no passo 11: animação scriptada cinemática, apoiada no chão, partindo da pose da queda.* | Depois de cair, ele se levanta sozinho dos dois jeitos. |

## Fase C: Armas do jogador

| # | Passo | Como testar |
|---|-------|-------------|
| 13 ✅ | **Sistema de armas**: modelo da arma na tela, troca por 1–9 e roda do mouse, estrutura de dados das armas. | Trocar entre pistola, rifle e taco. |
| 14 ✅ | **Tiro**: raycast, impulso físico na parte atingida, recuo, cadência, marcas de impacto. | Atirar no braço do NPC empurra o braço; atirar em caixas as move. |
| 15 | **Iron sight**: botão direito leva a arma ao centro, alinha as miras, reduz o FOV e a sensibilidade e mostra a respiração da arma. | A mira alinhada acerta onde aponta. |
| 16 | **Melee**: golpe com arma física, dano e impulso pela velocidade do impacto. | Um golpe forte derruba o NPC; um fraco só o desequilibra. |

## Fase D: Dano e ferimentos

| # | Passo | Como testar |
|---|-------|-------------|
| 17 | **Dano por parte**: integridade e dor por membro; o membro muda de cor ou ganha marcas (sem gore); painel de debug mostra o estado. | Acertar a perna muda só a perna. |
| 18 | **Ferimentos afetam os motores**: perna ferida faz mancar, duas pernas fazem rastejar, braço ferido fica pendurado, tiro na cabeça atordoa (fica mole por um tempo), dano grande deixa inconsciente. | Cada ferimento muda o comportamento físico de forma visível. |

## Fase E: Locomoção e IA

| # | Passo | Como testar |
|---|-------|-------------|
| 19 | **Caminhar procedural**: ciclo de passos gerado por poses-alvo, ainda sob equilíbrio físico; o NPC anda até um ponto. | Clicar num ponto do chão (debug) faz o NPC andar até lá. |
| 20 | **Virar, recuar e correr**: virar no lugar, andar de costas, correr. Empurrões no meio do caminho continuam funcionando. | Mandar o NPC fugir em zigue-zague e empurrar no meio. |
| 21 | **Visão**: cone de visão com teste de linha de visão (raycast). Cone visível no debug. *(A cabeça e o peito já seguem o jogador desde o passo 11.)* | Esconder-se atrás de uma parede faz o NPC perder o jogador. |
| 22 | **Detecção de mira e estados da IA**: percebe a arma apontada para ele (mais forte em iron sight). Estados: ocioso, alerta, ameaçado, esquivando, fugindo, caído, levantando. | O estado atual aparece no debug e muda conforme a mira. |
| 23 | **Esquiva e fuga**: passo lateral ou abaixar ao ser mirado de perto, correr para longe quando ameaçado à distância. | Mirar faz o NPC sair da linha de tiro de forma física. |
| 24 | **Cobertura**: procura um obstáculo (inclusive os colocados pelo jogador) que bloqueie a visão do jogador e se agacha atrás dele. | Colocar uma parede: o NPC corre para trás dela. |

## Fase F: Reflexos e interação física

| # | Passo | Como testar |
|---|-------|-------------|
| 25 | **Reflexos de proteção**: braços na frente do rosto ao ver um golpe ou objeto vindo, vira o corpo para proteger o ponto ferido, segura a região atingida. | Arremessar uma caixa nele: ele se protege. |
| 26 | **Agarrar ao tropeçar**: ao perder o equilíbrio, procura uma parede, mesa ou o jogador por perto e se segura (junta temporária mão-objeto). | Empurrar perto de uma mesa: ele se apoia nela. |
| 27 | **Mãos físicas do jogador**: agarrar objetos e o NPC (braço, gola) com uma junta-mola, arrastar, empurrar, arremessar. | Arrastar o NPC caído pelo braço e arremessar uma caixa. |
| 28 | **Peso e inércia das armas**: arma ligada à mão por mola; armas pesadas atrasam a mira e balançam ao virar. | Rifle pesa mais e é mais lento que a pistola. |

## Fase G: Sandbox e acabamento

| # | Passo | Como testar |
|---|-------|-------------|
| 29 | **Menu de spawn**: catálogo de objetos e armas (sem NPCs), posiciona pela mira, apaga itens. | Criar uma pilha de barris e pegar uma arma do chão. |
| 30 | **Ferramentas sandbox e acabamento**: congelar, corda, mola, ímã. Menu inicial, reset da simulação, ajustes (sensibilidade, qualidade), passada de performance e build final. | Amarrar o NPC numa corda presa no teto; o jogo roda a 60 FPS num notebook comum. |

---

## Riscos técnicos

- **Estabilidade do ragdoll** (passos 6–12): é a parte mais difícil. Por isso
  vem cedo e com ferramentas de debug (força dos motores, pausar e avançar
  quadro a quadro) antes de qualquer IA.
- **Equilíbrio e caminhar** (9, 10, 19): podem exigir uma "força de assistência"
  sutil no tronco, como o Euphoria usa, para parecer humano sem ficar travado.
- **Desempenho**: um NPC só deixa folga, então dá para usar mais iterações de
  física e um passo de simulação menor se for preciso.
