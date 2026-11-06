# Plano de desenvolvimento

Cada passo termina com algo **testável**. Fluxo: eu implemento, faço
`npm run build`, você testa e aprova, e só então sigo para o próximo.
Ao aprovar, o passo é commitado junto com o `dist/`.

Requisitos e decisões: ver [README](README.md).

---

## Fase A: Base e cena

| # | Passo | Como testar |
|---|-------|-------------|
| 0 ✅ | **Hello world**: Vite + React + Three.js, cena com chão, sol, ambiente HDR, carro-placeholder e órbita por arrasto. | A cena aparece, o arrasto gira a câmera e a janela redimensiona sem problema. |
| 1 ✅ | **Loop de física**: passo fixo (120 Hz) desacoplado do render, com interpolação visual. Painel de debug mostra FPS e passos por quadro. | Girar a janela ou trocar de aba não muda a velocidade da simulação. |
| 2 ✅ | **Entrada de controles**: teclado (W/A/S/D ou setas, espaço para freio de mão) mapeado para acelerador, direção, freio. Estado visível no debug. | Cada tecla muda o valor certo no painel. |

## Fase B: Física do veículo

| # | Passo | Como testar |
|---|-------|-------------|
| 3 ✅ | **Chassi e chão físico**: carro como corpo rígido com massa e centro de massa, colidindo com o chão. Sem rodas ainda. | O carro cai, assenta no chão e não atravessa. |
| 4 ✅ | **Suspensão**: quatro rodas com raycast e molas/amortecedores. Parâmetros em um arquivo de dados. | Empurrar o carro: ele balança e volta a assentar. |
| 5 ✅ | **Pneus**: força longitudinal e lateral com curva de escorregamento. | Acelerar e frear com tração; em curva, o carro sai de frente sem tração e a derrapagem aparece. |
| 6 ✅ | **Motor e transmissão**: curva de torque simplificada, marchas manuais (Q/E). | Subir de marcha muda o RPM e a aceleração. |
| 7 ✅ | **Freios e ABS opcional**: freio por roda, freio de mão (espaço). | Frear reto para em distância crível; o freio de mão trava as traseiras. |
| 8 ✅ | **Direção**: esterçamento com limite que diminui com a velocidade. | Em alta velocidade o volante responde menos; em baixa, o carro vira fechado. |
| 9 ✅ | **Transferência de peso**: frear inclina o carro para frente, acelerar para trás, curva para o lado externo. | A carroceria rola e arfa de forma visível. |

## Fase C: Câmera e mundo

| # | Passo | Como testar |
|---|-------|-------------|
| 10 | **Câmera de perseguição**: suave, com atraso pela aceleração. Tecla C alterna com câmera livre. | A câmera acompanha sem tremer e a sensação de velocidade aumenta. |
| 11 | **Pista de teste**: área plana com marcações, cones e rampa. | O carro sobe a rampa e faz manobras na pista. |
| 12 | **Superfícies**: asfalto, terra e areia com aderência diferente. | Na areia o carro perde tração e derrapa mais. |
| 13 | **Estradas**: trecho com curvas, subida e descida, gerado a partir de uma lista de pontos. | Dirigir o trecho inteiro sem sair da pista. |

## Fase D: Gráficos

| # | Passo | Como testar |
|---|-------|-------------|
| 14 | **Materiais PBR**: pintura com clearcoat, vidro, borracha, aro metálico. Ambiente HDR de estúdio ou de céu. | Os reflexos da pintura mudam conforme o ângulo e a luz. |
| 15 | **Sombras e iluminação**: sombras suaves, sol com cor e intensidade ajustáveis, ambiente com oclusão. | As sombras das rodas e da carroceria ficam nítidas e sem serrilhado. |
| 16 | **Pós-processamento**: bloom leve, tone mapping e correção de cor. Opção de desligar no debug. | A cena ganha brilho sem estourar as cores. |
| 17 | **Marcas de pneu e poeira**: rastro ao derrapar, poeira na terra e na areia, ambas ligadas à física. | Derrapar deixa rastro; passar na areia levanta poeira. |

## Fase E: HUD e acabamento

| # | Passo | Como testar |
|---|-------|-------------|
| 18 | **HUD**: velocímetro, marcha, RPM e barra de freio. | Os números batem com o que a física calcula. |
| 19 | **Painel de debug**: força em cada roda, escorregamento, centro de massa, colisores. | Cada indicador muda de forma coerente ao dirigir. |
| 20 | **Gamepad**: mapeamento de acelerador, freio, direção e marchas. | Um controle comum dirige o carro sem ajuste. |
| 21 | **Áudio do motor**: som ligado ao RPM e à carga, ruído de pneu ao derrapar. | O som acompanha a aceleração e a derrapagem. |

## Fase F: Polimento

| # | Passo | Como testar |
|---|-------|-------------|
| 22 | **Ajuste fino da física**: revisão dos parâmetros para um carro de rua e um esportivo. | Os dois carros se comportam de forma distinta e crível. |
| 23 | **Build e publicação**: `npm run build`, conferir `/car-game/dist/` no GitHub Pages. | A versão publicada funciona igual à local. |
