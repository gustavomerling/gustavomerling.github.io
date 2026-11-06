# Car Game

Jogo de carro em 3D, em terceira pessoa, com foco em **gráficos de alto nível** e
**física realista**, na linha do BeamNG.drive: o carro é um sistema físico
completo (suspensão, pneus, motor, freios, direção), e não uma animação.

Stack: **Vite + React + TypeScript + Three.js**. Publicado no GitHub Pages em
`/car-game/dist/`.

> Status: **hello world** (passo 0 do [DEVELOPMENT.md](DEVELOPMENT.md)). Cena com
> chão, sol, ambiente HDR e um carro-placeholder de caixas e cilindros.

---

## 1. Pilares

| # | Pilar | O que significa aqui |
|---|-------|----------------------|
| 1 | Física de veículo | Cada roda tem suspensão, força de contato e atrito de pneu. Peso se transfere em freadas, curvas e aceleração. |
| 2 | Pneus realistas | Atrito longitudinal e lateral com curva de escorregamento (modelo tipo Pacejka simplificado). Derrapagem e perda de tração emergem da física. |
| 3 | Gráficos de alto nível | PBR, reflexos de ambiente, sombras suaves, pintura com verniz (clearcoat), pós-processamento e marcas de pneu. |
| 4 | Mundo para dirigir | Estradas, relevo e cenário para testar o carro. |
| 5 | Sensação de velocidade | Câmera, som do motor e efeitos que acompanham a física, sem exagero. |

### Escopo fora da primeira versão

- Deformação de chassi estilo *soft-body* do BeamNG (muito pesado para o browser; ver decisões em aberto).
- Multiplayer, IA de tráfego e danos visuais detalhados.

---

## 2. Requisitos funcionais

### RF1. Carro
- Carro com chassi rígido, quatro rodas independentes e massa, centro de massa e inércia configuráveis.
- Parâmetros em um único arquivo de dados (massa, rigidez e amortecimento da suspensão, raio da roda, motor, caixa, freios).

### RF2. Suspensão
- Molas e amortecedores em cada roda, com curso limitado e rolagem da carroceria em curvas.
- Peso se transfere entre eixos ao acelerar e frear.

### RF3. Pneus
- Força longitudinal (tração e frenagem) e lateral (curvas) dependentes do escorregamento.
- Diferença de aderência entre tipos de superfície (asfalto, terra, areia).

### RF4. Motor, transmissão e freios
- Curva de torque simplificada, marchas manuais ou automáticas, freio de mão.
- Freios com força por roda e ABS opcional.

### RF5. Direção e controles
- Direção com limite de esterçamento que diminui com a velocidade.
- Acelerador, freio, embreagem/marchas e freio de mão no teclado e no gamepad.

### RF6. Câmera
- Câmera de perseguição suave, com atraso proporcional à aceleração.
- Alternância entre câmera de perseguição, interior e livre.

### RF7. Mundo
- Pista de teste plana e depois estradas com curvas, subidas e descidas.
- Superfícies com aderência diferente.

### RF8. Gráficos
- Iluminação física com ambiente HDR, sombras suaves e reflexos na pintura.
- Pós-processamento (bloom leve, tone mapping, correção de cor).
- Marcas de pneu e poeira/faíscas leves vinculadas à física.

### RF9. HUD e debug
- Velocímetro, marcha, RPM e painel de debug (força em cada roda, escorregamento, FPS).

### RF10. Áudio (fase posterior)
- Som do motor ligado ao RPM e à carga, ruído de pneu ao derrapar.

---

## 3. Requisitos não funcionais

- **Desempenho:** 60 FPS em notebook comum com a cena de teste. Física em passo fixo (ex.: 120 Hz), desacoplada do render.
- **Estabilidade:** o carro não explode nem atravessa o chão em batidas e saltos normais.
- **Compatibilidade:** Chrome e Edge recentes, com WebGL2. Safari na medida do possível.
- **Código:** módulos separados (`physics`, `vehicle`, `render`, `world`, `input`, `hud`). Parâmetros de física fora da lógica.
- **Build:** `npm run dev` para desenvolvimento; `npm run build` gera `dist/`, que é commitado.

---

## 4. Decisões em aberto

| Tema | Padrão proposto | Alternativa |
|------|-----------------|-------------|
| Motor de física | **Rapier** (WASM), que já tem controlador de veículo com raycast, combinado com a própria curva de pneu | Física própria em TypeScript, mais controle e mais trabalho |
| Realismo do carro | Rígido com suspensão e pneus físicos (fidelidade alta, custo baixo) | Soft-body tipo BeamNG (muito mais pesado) |
| Mundo inicial | Pista plana com marcações | Mapa com relevo gerado |
| Controles | Teclado primeiro, gamepad depois | Gamepad desde o início |

Padrões acima valem até você decidir o contrário.

---

## 5. Referências

- BeamNG.drive: referência de realismo de veículo.
- Modelo de pneu Pacejka "Magic Formula": base da curva de atrito.
- Rapier (`@dimforge/rapier3d-compat`), usado no sibling `human-in-the-loop`.
