# Walking Simulator

Simulação 2D em que o jogador **monta uma criatura** (esqueleto + músculos) e um
**algoritmo de aprendizado** descobre, por tentativa e erro, como ela aprende a andar.

Stack: **Vite + React + TypeScript**. Sem dependências de física ou ML externas:
a física e a rede neural são implementadas no próprio projeto, para que o
comportamento seja previsível e fácil de estudar.

> Documentação de desenvolvimento e o passo a passo em 10 etapas estão em
> [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Ideia do jogo

1. O jogador desenha o **torso** (o corpo principal).
2. Coloca **juntas** (pontos de articulação).
3. Coloca **membros** (braços e pernas) ligados às juntas.
4. Adiciona **juntas nos membros** (cotovelo, joelho...).
5. Divide os membros em **mais partes** (coxa, canela, pé...).
6. Liga **músculos** entre partes dos membros e o torso.
7. Aperta "Treinar": a criatura começa a se mexer de forma aleatória e,
   geração após geração, o cérebro (rede neural) aprende a andar.

### Regra de simetria

Tudo que o jogador desenha de **membros** é espelhado automaticamente:
cada perna/braço existe em **dois exemplares**, um "na frente" e um "atrás".
Os dois exemplares têm a mesma forma, mas são **independentes**: cada um tem
os próprios músculos na física e o próprio sinal do cérebro, então as patas
da frente e de trás podem alternar o passo. O exemplar de trás é desenhado
apagado e por baixo do torso, para dar sensação de profundidade.
O torso não é espelhado.

### Exemplos

A página abre com um **quadrúpede** (ou a última criatura salva no navegador):
torso com diagonais e cabeça, uma perna dianteira e uma traseira de 3 segmentos
(espelhadas, 4 patas no total) e 4 músculos por perna. O botão **Exemplos** abre
uma galeria com outras criaturas prontas (mesinha, dino, sapo, lagarta, aranha...),
cada uma com a própria pele.

---

## Conceitos principais

| Conceito | Descrição |
|----------|-----------|
| **Ponto (junta)** | Posição 2D com massa e velocidade. Integrada com Verlet. |
| **Osso** | Restrição de distância fixa entre dois pontos. Mantém o tamanho do membro. |
| **Torso** | Conjunto de pontos e ossos que forma o corpo central. |
| **Membro** | Cadeia de ossos ligados por juntas, com um lado "frente" e um "trás". |
| **Músculo** | Mola entre dois pontos cujo comprimento de repouso muda com o tempo (atuador). |
| **Cérebro** | Rede neural pequena: lê sensores e decide a contração de cada músculo. |
| **Fitness** | Pontuação da criatura: distância percorrida para a direita, multiplicada pelo tempo em pé (cair ou capotar o torso conta como queda), menos esforço. |
| **Geração** | Conjunto de criaturas simuladas em paralelo. As melhores geram a próxima. |

---

## Escopo

### Dentro do escopo
- Editor 2D para montar a criatura (torso, juntas, membros, músculos).
- Física 2D simples (gravidade, chão, colisão básica entre pontos).
- Treinamento com **neuroevolução** (algoritmo genético sobre os pesos da rede).
- Visualização do melhor indivíduo, gráfico de fitness, salvar/carregar criaturas.

### Implementado
- Editor com ferramentas Torso, Membro, Subdividir, Rotacionar e Músculo, desfazer e limpar.
- Simulação com cérebro aleatório e treino por neuroevolução num Web Worker.
- Treino: pausar, recomeçar, replay do melhor em 1×/5×/20×, gráfico de fitness e marcas de distância no chão.
- Criatura e último cérebro treinado salvos sozinhos no `localStorage` (Simular usa o cérebro; Treinar continua dele); exportar e importar JSON; galeria de exemplos; ajuda e atalhos de teclado.
- Modo **pele** (animal com padrão, olho e cenário com paralaxe) ou **esqueleto** (ossos e músculos).
- Terrenos: plano, morros, escada e irregular.
- Física com atrito de Coulomb e músculos que respondem aos poucos (movimento suave).
- Testes com `vitest` e testes headless de física e evolução.

### Fora do escopo (por enquanto)
- Multiplayer e contas de usuário.
- Física 3D.
- Aprendizado por gradiente (backpropagation): a criatura não tem função de erro
  diferenciável, então a evolução é a abordagem mais simples e robusta.
- Gráficos de alta fidelidade (pixel art ou sprites): começa com formas geométricas.

---

## Estrutura de pastas

```
walking-simulator/
├─ README.md              # este arquivo: visão do jogo
├─ DEVELOPMENT.md         # arquitetura, decisões e passo a passo (10 etapas)
├─ index.html
├─ vite.config.ts
├─ package.json
├─ tsconfig*.json
└─ src/
   ├─ main.tsx            # ponto de entrada do React
   ├─ App.tsx             # alterna entre editor e simulação
   ├─ styles.css
   ├─ physics/            # pontos, ossos, músculos, chão, integrador Verlet
   ├─ brain/              # rede neural (MLP), sensores e controlador
   ├─ evolution/          # episódio/fitness, população, Web Worker
   ├─ editor/             # editor, modelo da criatura, exemplo, salvar/carregar, ajuda
   ├─ train/              # tela de treino (gráfico e replay)
   ├─ render/             # desenho do mundo no canvas, com camadas de profundidade
   ├─ components/ui/      # componentes shadcn/ui
   └─ utils/              # matemática vetorial, RNG com semente
```

---

## Como rodar

```bash
cd walking-simulator
npm install
npm run dev      # desenvolvimento
npm test         # testes (vitest)
npm run headless             # física e cérebros aleatórios, sem navegador
npm run headless:evolution   # 30 gerações de evolução, sem navegador
npm run build    # gera dist/ (commitado para GitHub Pages)
```

Publicação: o `vite.config.ts` usa `base: '/walking-simulator/dist'`, no mesmo
padrão de `ball-drop-notes`.
