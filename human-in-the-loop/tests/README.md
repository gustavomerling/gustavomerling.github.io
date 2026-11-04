# Testes de regressão headless do NPC

Roda o NPC (Rapier + `Npc` + `Brain` reais, sem render) em Node e imprime uma
tabela de métricas. Serve para comparar antes/depois de mexer em
`npc/Npc.ts`, `Brain.ts`, `Ragdoll.ts` etc.

```
cd human-in-the-loop
node tests/run.mjs            # todos os cenários (~70 s)
node tests/run.mjs push       # só cenários cujo "grupo nome" contém "push"
node tests/run.mjs --json     # saída em JSON (para diff/script)
```

Requer `npm install` feito na pasta. O script bundla `tests/harness.ts` com
`node_modules/.bin/rolldown` para `tests/.build/` (ignorado pelo git), com um
stub de `document` para as texturas de canvas do boneco. Não altera código de jogo.

## Determinismo

O Three gasta `Math.random` nos ids de cada malha/material; por isso o Sim
ressemeia depois de montar a cena (mudar só o visual não altera a tabela).

`Math.random` é substituído por um PRNG com seed fixa por tentativa, o passo é
fixo (60 Hz) e o Rapier é determinístico: duas execuções dão a tabela idêntica.
Qualquer diferença vem da sua mudança.

## Cenários

Cada um roda N tentativas (variando direção/intensidade). O NPC nasce em (0,0,0),
assenta 1,5 s e os picos são zerados antes do evento. Depois do evento há até
40–50 s para levantar, mais 2 s de calma.

| Grupo | Cenário | Como |
|-------|---------|------|
| stand | em pé 10 s | 3 seeds, sem estímulo |
| push | leve 40 / médio 110 / forte 220 | `npc.push` no peito (40 = tecla F, 110 = G), 6 direções |
| walk | andar 10 m | `brain.walkTo` (sem correr), 3 ângulos |
| walk | contornar esquina | parede em L, caminho rente à quina: `grips` = vezes que agarrou a parede (deve ser 0) |
| run | correr em zigue-zague | 5 pontos a ±3..5 m, `walkTo(run)` em sequência, 25 m |
| getup | queda de bruços / de costas | empurrão de 200..260 na direção, mede levantar |
| armed | tiroteio parado / empurrado no tiroteio | NPC armado x jogador a ~9 m (empurrão de 140 aos 5 s): `shots`, `movingShots` (com o corpo > 0,3 m/s; deve ser 0), `aimErrDeg` (cano x alvo no disparo), `handWobble` (rad/s mirando), `held` (ainda segura a arma) |
| shot | perna (pistola 12, rifle 16), cabeça (pistola, rifle) |
| crawl | pernas feridas: rastejar 20 s | pernas a 15/40 de vida; mede a velocidade (`speedCmS`) |
| cover | agachar 0.5 / 1 parado | mede `headTop`/`chestTop` (calibra `COVER_BODY` em Brain.ts) |
| cover | mureta / parede alta | jogador mirando de 10 m, caixa solta no caminho: `hiddenS` (s com a cabeça escondida), `footMax` (subiu na caixa?), `crateMoved` | impulso no ponto + `npc.hit(..., 'shot')` + `brain.notice`, 4 direções |

## Colunas

- **quedas / taxa**: tentativas em que o estado saiu de `standing` (qualquer
  queda, desmaio ou atordoamento que derrube) / total.
- **levanta**: das que caíram, quantas voltaram a `standing` no tempo-limite.
- **t.lev med/max**: segundos entre sair de `standing` e voltar a `standing`.
  `NUNCA` = não levantou no limite.
- **drift med/max (m)**: distância horizontal da pélvis ao ponto de referência no
  fim (ponto inicial; no walk/run, o alvo final = erro de chegada). Em `shot`
  inclui a fuga da IA (o NPC corre depois de levar tiro), por isso é grande.
- **juntaW max (rad/s)**: maior velocidade angular relativa entre duas partes
  ligadas, em qualquer instante (instabilidade/tremedeira de juntas).
- **v max (m/s)**: maior velocidade linear de qualquer parte.
- **KE max (J)**: pico da energia cinética translacional somada do corpo.
- **extra** do walk/run: `airPct` % do tempo com os dois pés acima de 9 cm,
  `pelvisH` altura média da pélvis andando (em pé parado ≈ 0,98) e `bobCm`
  oscilação dela (o andar antigo ficava com a pélvis a ~1,0 m: "flutuando").
- **extra**: `arriveS` tempo para chegar (walk); `reached` 1 = passou por todos os
  pontos, `totalS` (run); `health` saúde geral 0-100 e `canStand` (shot).

Em pé parado, `juntaW` e `KE` ~0 é o esperado; se subirem, há tremedeira.

## Linha de base (commit b78e773)

```
cenario                            | quedas  | taxa  | levanta  | t.lev med(s) | t.lev max(s) | drift med(m) | drift max(m) | juntaW max(rad/s) | v max(m/s) | KE max(J)
stand: em pe 10 s                  | 0/3     | 0%    | -        | -            | -            | 0.03         | 0.03         | 0.2               | 0.0        | 0
push: empurrao leve (40)           | 0/6     | 0%    | -        | -            | -            | 0.27         | 0.35         | 9.1               | 2.5        | 25
push: empurrao medio (110)         | 6/6     | 100%  | 6/6      | 5.8          | 6.1          | 2.03         | 2.37         | 75.2              | 15.6       | 446
push: empurrao forte (220)         | 6/6     | 100%  | 6/6      | 5.8          | 6.2          | 2.00         | 2.83         | 60.2              | 16.2       | 964
walk: andar 10 m                   | 0/3     | 0%    | -        | -            | -            | 0.06         | 0.08         | 33.5              | 7.7        | 199       | arriveS=7.3
run: correr em zigue-zague         | 0/3     | 0%    | -        | -            | -            | 0.08         | 0.08         | 37.9              | 11.6       | 618       | reached=1.0 totalS=22.8
getup: queda de bruços             | 4/4     | 100%  | 4/4      | 6.0          | 6.1          | 2.57         | 2.78         | 57.7              | 13.3       | 1205
getup: queda de costas             | 4/4     | 100%  | 4/4      | 6.4          | 7.0          | 1.22         | 1.35         | 46.4              | 12.7       | 1247
shot: tiro na perna (pistola)      | 2/4     | 50%   | 2/2      | 5.4          | 5.5          | 59.99        | 87.16        | 41.0              | 12.1       | 600       | health=96.6 canStand=1.0
shot: tiro na perna (rifle)        | 1/4     | 25%   | 1/1      | 6.1          | 6.1          | 69.06        | 87.08        | 36.7              | 11.7       | 578       | health=95.5 canStand=1.0
shot: tiro na cabeca (pistola)     | 4/4     | 100%  | 4/4      | 8.2          | 8.8          | 0.74         | 1.07         | 68.3              | 8.6        | 320       | health=88.8 canStand=1.0
shot: tiro na cabeca (rifle)       | 4/4     | 100%  | 4/4      | 8.1          | 9.3          | 0.75         | 1.04         | 64.3              | 8.9        | 376       | health=85.0 canStand=1.0
```

Observações da linha de base: o empurrão médio (110) já derruba 100%; a
transição leve (40) -> médio (110) é onde mexer em equilíbrio/passos aparece
primeiro (teste também `push` com impulso intermediário editando o cenário).
Os tiros nas pernas fazem o NPC fugir (drift 60-87 m, limite do piso de 100 m).

## Estender

Adicione um item em `SCENARIOS` no `harness.ts` (função `run(seed, trial)` que
devolve `sim.metrics(ref, extra)`). Use sempre `newSim(seed)` para manter o
determinismo; não use `Math.random` fora do PRNG já instalado.
