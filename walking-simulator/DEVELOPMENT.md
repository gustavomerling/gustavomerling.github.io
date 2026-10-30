# Desenvolvimento — Walking Simulator

Este documento define a arquitetura, as decisões técnicas e o passo a passo
do desenvolvimento. Cada etapa deve terminar com algo **rodando e verificável**
antes de começar a seguinte.

---

## 1. Decisões técnicas

| Tema | Decisão | Motivo |
|------|---------|--------|
| Build | Vite 8 + React 19 + TypeScript | Mesmo stack de `ball-drop-notes`; setup rápido. |
| Renderização | `<canvas>` 2D puro, com React só para a interface (painéis, botões) | Canvas é mais rápido para centenas de formas por frame; React cuida do resto. |
| Física | Implementação própria com **Verlet** (pontos + restrições de distância) | Controle total; Verlet é estável para corpos articulados e fácil de estender com molas. |
| Músculos | Molas cujo `restLength` oscila conforme a saída do cérebro | Forma mais direta de "contrair" e "relaxar" um membro. |
| Aprendizado | **Neuroevolução** (algoritmo genético nos pesos de um MLP pequeno) | Não há gradiente diferenciável (a fitness depende da simulação). É simples, paralelizável e funciona bem para locomoção. |
| Rede | MLP com 1 camada oculta (~16–32 neurônios), `tanh` | Pequena o bastante para evoluir rápido; `tanh` dá saídas em [-1, 1], que mapeiam direto para contração. |
| Paralelismo | **Web Worker** para simular a população sem travar a interface | Simulação pesada não deve travar o editor. |
| Aleatoriedade | RNG com **semente** (seeded) | Permite reproduzir uma geração e depurar. |
| Estado da criatura | JSON puro, salvo em `localStorage` e exportável | Simples de salvar, versionar e compartilhar. |
| Testes | `vitest` para física, cérebro, evolução e salvar/carregar (lógica pura) | A parte visual é validada manualmente. |
| Interface | shadcn/ui + Tailwind 4 + lucide-react (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`) | Menu do editor com componentes prontos e acessíveis; só a barra de ferramentas usa, o canvas segue puro. |
| Teste headless | `npm run headless` (rolldown + node, sem navegador) | Confere estabilidade da física, efeito dos músculos e determinismo sem abrir a página. |
| Exemplares independentes | Uma saída do cérebro por músculo **do mundo** (cada exemplar de membro tem a sua) | Com um sinal compartilhado, frente e trás ficavam idênticos e a criatura só conseguia pular. Separados, a evolução encontra passos alternados. |
| Suavidade | O cérebro dá um **comando** e a ativação do músculo o persegue (`MUSCLE_RESPONSE` = 0,18 por passo, ~0,1 s); câmera com atraso; desenho interpolado entre passos | Sem isso o movimento dava trancos de um passo para o outro e a câmera tremia; em telas de 120/144 Hz quadros repetiam a mesma pose. |
| Atrito | **Coulomb** (`applyFriction`), uma vez por passo: proporcional a quanto o chão empurrou o ponto (força normal), com regime estático (pé parado não escorrega) e cinético | O atrito antigo tirava 50% da velocidade a cada colisão (até 16 por passo) e nenhum em pontos só encostados; a lagarta aprendeu a "patinar" a 250 px/s. |
| Terreno | Chão como função de altura (`surfaceY`): plano, morros, escada (com colisão de parede nos degraus) e irregular; a criatura nasce numa faixa plana | Variedade de desafios; o treino evolui no terreno escolhido. |
| Sensores de terreno | Inclinação do chão 40 px à frente e altura do corpo acima do chão | Sem eles o cérebro só "sentia" o relevo quando um pé encostava. |
| Cérebro salvo | O último cérebro treinado (criatura + terreno, identificados por hash) fica no `localStorage`; Simular o usa e Treinar continua dele (1/3 da população nasce dele) | Voltar ao editor não joga o treino fora. |
| Modo pele | `render/skin.ts` desenha a criatura sobre a mesma física: faces do torso (triângulos e quadriláteros fechados por ossos), membros em cápsula, cabeça na junta mais à frente, olho, padrão que gira com o corpo, cenário com paralaxe | A física continua sendo de pontos e ossos; a pele é só desenho. |
| Andar de verdade | Pontuação multiplicada por `0,1 + 0,9 × alternância`: conta quantas vezes o **primeiro segmento** (coxa) do exemplar da frente passa à frente do de trás e volta (~1 por segundo por membro vale tudo) | Sem isso a evolução preferia pular/galopar. Medir pelas pontas ou por "pousos alternados" era fácil de enganar arrastando os pés defasados. |
| Aprendizado | Mutação em três escalas (0,2×, 1×, 2,5× sigma, sorteada por filho), relógios de 0,5/1/2 Hz e avaliação em paralelo (sub-workers, um por núcleo) | Com sigma fixo e um só relógio a evolução estacionava cedo; o paralelismo dá mais gerações por minuto. |
| Queda | Torso abaixo de 70% da altura inicial **ou** girado mais de 30° em relação à pose inicial; a distância é multiplicada por `1 - 0,9 × queda` | Com 50% da altura o humano aprendia a andar de joelho. Sem medir a rotação, a evolução aprendia a capotar e se arrastar de costas; com 50° ela ainda andava de nariz no chão. |

### Por que não usar Matter.js ou outra engine?
Engines prontas são ótimas, mas o músculo como mola de repouso variável e a
simetria dos membros exigem acesso ao núcleo da física. Escrever o integrador
(algumas centenas de linhas) mantém isso sob controle e é um ótimo exercício
de aprendizado.

---

## 2. Modelo de dados

```ts
type Vec2 = { x: number; y: number }

type Joint = { id: string; pos: Vec2 }            // ponto da física

type Bone = {                                     // restrição de distância rígida
  id: string
  a: string; b: string                            // ids das juntas
  length: number
}

type Muscle = {                                   // mola controlada pelo cérebro
  id: string
  a: string; b: string
  restLength: number                              // comprimento de repouso base
  contraction: number                             // amplitude de 0 a 1 (fração do repouso)
  strength: number                                // rigidez da mola
}

type Limb = {                                     // membro com espelhamento
  id: string
  chain: string[]                                 // ids das juntas, do torso para a ponta
  mirrored: true                                  // sempre gera "frente" e "trás"
}

type Creature = {
  version: 1
  torso: { joints: Joint[]; bones: Bone[] }
  limbs: Limb[]
  limbBones: Bone[]
  muscles: Muscle[]
}
```

> **Como ficou na implementação** (`src/editor/model.ts`): ids numéricos;
> `Joint = { id, x, y }` (só torso), `Bone = { a, b }` (comprimento tirado da
> posição inicial), `Limb = { id, anchor, points }` (pontos a partir de uma junta
> do torso) e `Muscle = { id, a: JRef, b: JRef, strength, contraction }`, onde
> `JRef = { limb: number | null, i }` aponta para uma junta do torso ou de um
> membro. `toWorld` converte o modelo em física: cada membro vira dois exemplares
> (partículas com `depth` -1 e 1) e cada músculo de membro vira dois músculos.
> O arquivo exportado é esse modelo com `version: 1`.

---

## 3. Passo a passo em 10 etapas

### Etapa 1 — Fundação do projeto
**Objetivo:** projeto rodando com loop de simulação estável.

- Criar o projeto Vite + React + TypeScript em `walking-simulator/`.
- Configurar `base: '/walking-simulator/dist'` para GitHub Pages.
- Criar o componente `Canvas` que ocupa a tela e se redimensiona.
- Implementar um loop com **passo de tempo fixo** (ex.: 60 Hz) desacoplado do
  `requestAnimationFrame`, para que a física não dependa do FPS.
- Criar `utils/vec2.ts` e `utils/rng.ts` (RNG com semente).

**Pronto quando:** a tela mostra um canvas com contador de frames e de passos de física.

---

### Etapa 2 — Motor físico mínimo
**Objetivo:** pontos caem, são sustentados por ossos e colidem com o chão.

- `physics/particle.ts`: pontos com posição atual e anterior (Verlet), gravidade e
  amortecimento.
- `physics/bone.ts`: restrição de distância rígida, resolvida iterativamente
  (ex.: 8 iterações por passo).
- `physics/ground.ts`: chão plano; pontos abaixo dele são empurrados de volta e
  recebem atrito simples.
- Teste de sanidade: um pêndulo de 2 ossos balançando e estabilizando.

**Pronto quando:** um pêndulo fica estável e um "quadrado" de pontos não desmonta sob gravidade.

---

### Etapa 3 — Editor: desenhar o torso
**Objetivo:** o jogador desenha o corpo principal.

- Ferramenta **Torso**: clicar cria juntas; clicar perto de uma junta existente
  liga com um osso.
- Cada novo osso recebe o comprimento da distância inicial (rígido depois).
- Botão de desfazer e de limpar.
- Renderização do editor separada da física (`render/`).
- Modo "Simular" para ver o torso caindo e se sustentando.

**Pronto quando:** consigo desenhar um torso com 4–6 juntas e ver ele cair no chão.

---

### Etapa 4 — Editor: juntas e membros
**Objetivo:** colocar membros presos ao torso, com espelhamento automático.

- Ferramenta **Junta de articulação**: marcar um ponto do torso como ponto de
  encaixe para membros.
- Ferramenta **Membro**: a partir de uma junta de encaixe, desenhar uma cadeia de
  juntas (ex.: ombro → cotovelo → mão).
- Regra de espelhamento: cada membro gera **dois exemplares** (frente e trás),
  com o exemplar de trás com `depth = -1` (desenhado por baixo e mais escuro).
- Os dois exemplares usam **a mesma definição**; a física é independente.

**Pronto quando:** um braço desenhado aparece em dois exemplares, um atrás e um na frente do torso.

---

### Etapa 5 — Editor: mais partes nos membros
**Objetivo:** dividir membros em segmentos (coxa, canela, pé...).

- Ferramenta **Subdividir**: clicar em um osso do membro cria uma nova junta no
  meio (ou em posição escolhida) e divide o osso em dois.
- A subdivisão é aplicada aos **dois exemplares** do membro.
- Limite mínimo de tamanho de osso para evitar ossos degenerados.

**Pronto quando:** uma perna com 3 segmentos (coxa, canela, pé) aparece nos dois lados.

---

### Etapa 6 — Editor: músculos
**Objetivo:** ligar músculos entre partes dos membros e o torso.

- Ferramenta **Músculo**: escolher duas juntas (qualquer combinação de torso e
  membros) e criar uma mola.
- `restLength` inicial = distância atual; `strength` e `contraction` ajustáveis
  no painel lateral.
- Músculos também são espelhados nos dois exemplares do membro.
- Visualização: músculo em cor diferente, com espessura proporcional à força.

**Pronto quando:** a criatura tem músculos ligando quadril ao torso e ao joelho, e eles aparecem nos dois lados.

---

### Etapa 7 — Cérebro: rede neural e sensores
**Objetivo:** cada criatura tem um controlador que transforma sensores em ações.

- `brain/mlp.ts`: MLP com pesos achatados em um `Float32Array`, com `tanh`.
- `brain/sensors.ts`: entradas da criatura:
  - ângulo de cada osso,
  - velocidade de cada junta,
  - contato de cada ponta com o chão (0 ou 1),
  - fase de um relógio senoidal (ajuda a gerar ritmo).
- Saídas: uma por músculo, em [-1, 1], que modula `restLength`.
- Tamanho do vetor de pesos calculado a partir da criatura (entradas/saídas variam).

**Pronto quando:** a criatura se mexe (de forma aleatória) porque o cérebro gera sinais nos músculos.

---

### Etapa 8 — Treinamento: neuroevolução
**Objetivo:** a criatura aprende a andar.

- `evolution/population.ts`: população de N criaturas (ex.: 100), cada uma com
  seu cérebro (pesos).
- **Fitness**: distância horizontal percorrida (principal) menos penalidades
  (cair de cabeça, esforço excessivo, tempo parado).
- **Seleção**: torneio ou elitismo (manter as 10% melhores).
- **Crossover** entre pesos de dois pais e **mutação** gaussiana pequena.
- Simulação em **Web Worker**: cada geração roda em paralelo em uma thread separada.
- Gráfico de fitness por geração (melhor, média).

**Pronto quando:** após algumas dezenas de gerações, o melhor indivíduo anda mais longe que a geração 1.

---

### Etapa 9 — Interface completa
**Objetivo:** o jogador acompanha, controla e guarda o processo.

- Painel de **treino**: começar, pausar, velocidade (1×, 5×, 20×), resetar.
- Visualização do **melhor indivíduo** da geração atual (replay).
- Salvar e carregar criaturas (`localStorage` + exportar/importar JSON).
- Alternar entre **Editor** e **Simulação** sem perder a criatura.
- Tela de ajuda com os controles do editor.

**Pronto quando:** consigo montar, treinar, pausar, salvar e recarregar uma criatura sem recarregar a página.

---

### Etapa 10 — Qualidade, testes e publicação
**Objetivo:** projeto estável, documentado e publicado.

- Testes com `vitest` para `physics/`, `brain/` e `evolution/` (determinismo com semente).
- Revisão de desempenho: medir tempo de um passo de física com 100 criaturas.
- Ajuste fino dos parâmetros padrão (gravidade, iterações, mutação).
- Revisar `README.md` e `DEVELOPMENT.md` com o que foi realmente implementado.
- `npm run build` e commit de `dist/` (padrão do repositório).
- Entrada no `README.md` raiz do repositório, se aplicável.

**Pronto quando:** `npm run build` passa, os testes passam e a página publicada abre em `/walking-simulator/dist/`.

---

## Estado das etapas

| Etapa | Estado |
|-------|--------|
| 1–8 | Concluídas. |
| 9 | Concluída: pausar, recomeçar, velocidade do replay (1×/5×/20×), replay do melhor, salvar automático, exportar/importar JSON, exemplo, ajuda. |
| Depois | Galeria de exemplos, modo pele, terrenos, atrito de Coulomb, músculos suaves, cérebro salvo, painel de treino sobre a cena, atalhos de teclado, layout sem rolagem. |
| 10 | Testes `vitest` (`npm test`), headless, docs revisados e `dist/` gerado. Medição: ~2,7 s por geração de 60 indivíduos no node (quadrúpede, 15 s de episódio). |

---

## 4. Riscos conhecidos

| Risco | Mitigação |
|-------|-----------|
| Criaturas "explodem" (física instável) | Passo fixo pequeno, mais iterações de restrição, limite de velocidade. |
| Evolução presa em um mínimo local (ex.: cair para frente e ficar) | Penalizar queda, manter diversidade (mutação maior em parte da população). |
| Simulação lenta com muitas criaturas | Web Worker + limite de passos por geração; medir na etapa 10. |
| Criatura sem músculos não consegue andar | Validação no editor: avisar quando não há músculos suficientes. |
| Exemplares sincronizados demais | Cada exemplar tem a própria saída do cérebro; os sensores leem os dois lados separadamente. |

---

## 5. Convenções

- Idioma da interface e da documentação: **português**.
- Código e nomes de variáveis: **inglês**, em estilo idiomático de TypeScript.
- Lógica pura (física, rede, evolução) **separada** de React e canvas.
- Nenhuma dependência nova sem registrar o motivo aqui.
- Cada etapa termina com build passando (`npm run build`).
