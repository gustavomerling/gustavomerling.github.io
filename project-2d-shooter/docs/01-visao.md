# 01 · Visão

> **Project Shooter 2D** (nome de trabalho).

## O que está fixo

- **Shooter 2D de plataforma**, lateral, sempre avançando da esquerda para a direita até a saída.
- **Mapas procedurais**: trechos (*chunks*) feitos à mão, montados por *seed*. A mesma seed gera o mesmo mapa.
- **Movimento rico**: corrida, slide (com esquiva), pulo variável, escadas, walljump e escalada de degraus.
- **Tiro com mira no mouse**, armas como dados, attachments que mudam o jeito de jogar.
- **Câmera lenta** como mecânica central.
- Roda no navegador e como `.exe` portátil (Electron).

## O que está em aberto (canvas em branco)

- **Tema, história e nome.** O projeto começou como uma paródia de escritório; isso foi descartado. Os inimigos e o cenário (prédios e becos) ficam como placeholders genéricos.
- **Direção de arte.** Hoje: formas lisas (personagens como esqueletos de cápsulas), contornos finos, um céu noturno simples e uma grade de medição visível, em resolução nativa (sem pixel art). A ideia é decidir o estilo final quando a jogabilidade e as proporções estiverem firmes.
- **Som e música.** Removidos por enquanto.
- **Cenário interativo** (props, móveis, luz, efeitos de partícula). Removido de propósito para simplificar: voltará quando houver direção de arte.
- **Loop roguelite** (drops, progressão, meta-progressão).

## Por que a grade

Tudo no mundo mede em **tiles de 16 unidades**. Os prédios seguem uma **grade de andares** (4 tiles de pé-direito + 1 de laje) e a grade fica visível no jogo (F2), com a posição do tile sob o cursor. Isso deixa claro o tamanho de cada pulo, a altura de cada andar e o espaço entre plataformas — a base para desenhar fases e, depois, arte.
