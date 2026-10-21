# Project Shooter 2D

Shooter 2D de plataforma, lateral (esquerda → direita), com mapas gerados proceduralmente a partir de uma *seed*.

**Fase atual:** canvas em branco. Só o essencial está no jogo: mapa, plataformas, jogador e NPCs (com rig animado e ragdoll), desenhados com formas lisas sobre uma grade visível e um céu simples ao fundo. A direção de arte, o tema e o conteúdo vêm depois (ver [docs/01-visao.md](docs/01-visao.md)).

## Rodando

```bash
npm install

npm run dev           # navegador: http://localhost:5180
npm run dev:desktop   # janela Electron com hot reload (F11 funciona como no .exe)

npm run check         # typecheck + testes
npm run build         # check + build web (dist/) + Electron (dist-electron/)
npm run smoke         # abre o build no Electron, joga um pouco sozinho e salva prints em smoke/
npm run dist          # build + gera release/Project Shooter 2D-<versão>-portable.exe
```

Atlas de mapas (dev): com `npm run dev` aberto, [localhost:5180/tools/atlas.html](http://localhost:5180/tools/atlas.html) desenha o andar inteiro de várias seeds (`?seeds=A,B&scale=2&grid=1`).

## Controles

A/D mover · Shift correr · S agachar/deslizar · Espaço pular (S+Espaço desce da plataforma) ·
no ar junto à parede, Espaço = walljump · andar contra um degrau de 1 tile escala sozinho ·
W/S sobem e descem escadas · E câmera lenta · mouse mira · clique esquerdo atira ·
1-4 ou roda troca arma · R recarrega · F pega arma do chão / usa a saída · Q chute · Esc pausa · F11 tela cheia.

Folha de poses (dev): [localhost:5180/tools/poses.html](http://localhost:5180/tools/poses.html) mostra o rig em todos os estados e com cada arma.

Debug: **F2 grade** · F3 overlay (salas, colisores, visão da IA) · F4 god · F6 inimigo no cursor · F8 congela · F9 avança 1 passo · F10 replay da tentativa.

## Documentação

1. [Visão](docs/01-visao.md): o que está fixo, o que está em aberto
2. [Design de jogo](docs/02-design-de-jogo.md): controles, movimento, combate, inimigos, mapa e grade de andares
3. [Arquitetura](docs/03-arquitetura.md): stack, camadas, motor, pipeline, como adicionar conteúdo, testes
4. [Roadmap](docs/04-roadmap.md)
