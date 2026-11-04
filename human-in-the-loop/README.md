# Human in the Loop

Jogo 3D em primeira pessoa, minimalista, num sandbox de física: o jogador
interage com NPCs que são **ragdolls ativos** — corpos físicos que tentam se
manter em pé, se proteger e reagir ao que veem, em vez de tocar animações prontas.

Stack: **Vite + React + TypeScript + Three.js + Rapier** (física em WASM).
Publicado no GitHub Pages em `/human-in-the-loop/dist/`.

> Status: **etapa 3**, desenvolvimento passo a passo (ver [DEVELOPMENT.md](DEVELOPMENT.md)).
> Concluído: passos 1–18.

---

## 1. Pilares

| # | Pilar | Referência | O que significa aqui |
|---|-------|-----------|----------------------|
| 1 | Ragdoll ativo + IA | Endorphin / Euphoria | O NPC é um ragdoll com motores nas juntas. A IA define uma *pose-alvo* e os motores tentam alcançá-la; a física decide o resultado. Quedas, tropeços e empurrões nunca são animações gravadas. |
| 2 | 3D minimalista | Bonelab / Boneworks | Cenário de blocos cinza-claros, NPCs como manequins de formas simples, uma cor de destaque (laranja) para o que é interativo. Interação física com peso. |
| 3 | Reações sistêmicas | People Playground | Cada parte do corpo tem estado (integridade, dor). Dano afeta o controle dos motores: perna atingida deixa de sustentar peso, braço atingido fica mole. |
| 4 | Primeira pessoa com armas | — | Armas melee (impacto físico) e de tiro (raycast + impulso no ponto atingido). |
| 5 | Construção e mira | — | O jogador posiciona obstáculos (caixas, paredes, rampas) e mira pela alça de mira (*iron sight*: arma vai ao centro da tela, FOV reduz). |
| 6 | Percepção do NPC | — | O NPC tem cone de visão. Se vê a arma apontada para ele, reage: esquiva, se abaixa, procura cobertura ou foge. |

### Estilo visual

- Paleta: fundo/cenário em cinzas quentes (`#d9d6cf`, `#bdb9b0`), destaque laranja (`#e8742c`).
- NPCs: manequins sem rosto, feitos de cápsulas e caixas.
- Dano mostrado por mudança de cor/marcas nas partes do corpo, **sem gore**.

## 2. Arquitetura técnica (proposta)

- **Three.js puro** para cena e loop do jogo, fora do ciclo de render do React
  (o React re-renderizando a cada frame atrapalharia a física).
- **React** só para HUD, menus e painéis de debug.
- **Rapier 3D** (`@dimforge/rapier3d-compat`) para física: corpos rígidos,
  juntas esféricas/revolutas com **motores** (base do ragdoll ativo), raycasts
  para tiros e visão.
- **Passo fixo de física** (60 Hz) e render no ritmo do monitor.
- Controle do ragdoll em camadas:
  1. *Pose-alvo* (de um esqueleto animado invisível ou de poses procedurais).
  2. *Motores PD* nas juntas puxam o ragdoll para a pose; força varia com o
     estado (consciente, ferido, atordoado, mole).
  3. *Equilíbrio*: mantém o centro de massa sobre os pés; se falhar, entra em
     queda controlada (protege a cabeça, apoia as mãos).
- **IA do NPC**: máquina de estados / behavior tree simples
  (`ocioso → alerta → ameaçado → esquiva/fuga/cobertura → caído → levantando`).

Observação: a versão `-compat` do Rapier embute o WASM em base64 (bundle
~5 MB, ~1,9 MB gzip). Funciona sem configuração; se o tamanho incomodar,
dá para trocar pela versão WASM separada mais à frente.

## 3. Controles (rascunho)

| Ação | Tecla |
|------|-------|
| Mover / correr / pular / agachar | WASD / Shift / Espaço / C (Ctrl não: Ctrl+W fecha a aba) |
| Voltar ao início | R |
| Atirar / golpear | Botão esquerdo |
| Mirar (iron sight) | Botão direito |
| Trocar arma | 1–9 / roda do mouse |
| Modo construção (colocar obstáculo) | B |

## 4. Escopo da primeira versão

Objetivo: **um núcleo básico muito bom**. Som, mais conteúdo e mais
possibilidades ficam para expansões depois.

### Decisão: engine/sandbox primeiro, jogo depois

*Decidido em 2026-11-04.* Este projeto é uma **engine e sandbox**: sistemas de
física, ragdoll ativo, IA, armas e construção, para experimentar livremente.
Ele **não tem** objetivo, fases, pontuação nem ciclo de jogo, e isso é
intencional. Um jogo de verdade (por exemplo, uma camada de "testes" com
objetivos) poderá ser construído depois, **em cima** desta base. Até lá, os
passos do plano continuam sendo sistemas.

### Regras fixas

- **Um único NPC por simulação.**
- **O NPC nunca usa armas.** Ele só percebe, reage, se protege e foge.
- O jogador **não pode criar NPCs**. O NPC da simulação pode ser resetado.

### Recursos extras que entram

1. **Ferimentos localizados**: cada membro tem integridade própria. Com a perna ferida, o NPC manca ou rasteja; com o braço ferido, o braço fica pendurado. Ele segura a região atingida.
2. **Tropeço e agarrar**: ao perder o equilíbrio, o NPC dá passos de recuperação e tenta se segurar em paredes, mesas ou no próprio jogador.
3. **Reflexos de proteção**: põe os braços na frente do rosto ao cair ou ao ver um golpe vindo, e vira o corpo para proteger o ponto ferido.
4. **Mãos físicas do jogador**: agarrar o NPC pelo braço ou pela gola, empurrar, arrastar e arremessar objetos. As armas têm peso e inércia (estilo Boneworks).
5. **Menu de spawn e ferramentas sandbox**: gerar armas e objetos (nunca NPCs), com ferramentas de corda, mola, congelar e ímã.

### Fora desta versão

Personalidades, percepção por som, NPCs armados e desarme, comportamento de
grupo, câmera lenta e replay.

Ainda em aberto: a moldura narrativa de **laboratório de testes** (os NPCs são
agentes de IA e o jogador é o "humano no loop" que avalia as reações).

## 5. Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ (commitado para o GitHub Pages)
```

## 6. Ordem de execução

1. ✅ Documentação da ideia + hello world (Three.js + Rapier: caixas caindo, clique solta mais).
2. ✅ Plano de desenvolvimento em 30 passos: [DEVELOPMENT.md](DEVELOPMENT.md).
3. 🔄 Desenvolvimento passo a passo, com teste e aprovação a cada passo.
