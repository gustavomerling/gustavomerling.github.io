# LASANHA (project-2d-shooter)

Roguelite 2D de tiro em plataforma, estilo Dead Cells, lateral (esquerda → direita), com mapas gerados proceduralmente.
John Wick, mas roubaram sua lasanha da geladeira do escritório. A run começa no apartamento do Paulo.

**Fase atual:** infraestrutura + protótipo *wireframe* jogável.

## Rodando

```bash
npm install

npm run dev           # navegador: http://localhost:5180
npm run dev:desktop   # janela Electron com hot reload (recomendado: F11 funciona como no .exe)

npm run check         # typecheck + testes
npm run build         # check + build web (dist/) + Electron (dist-electron/)
npm run smoke         # abre o build no Electron, joga um pouco sozinho e salva prints em smoke/
npm run dist          # build + gera release/Lasanha-<versão>-portable.exe
```

O `.exe` é **portátil**: um arquivo só, roda sem instalar e sem navegador (traz o próprio Chromium).

## Controles

A/D mover · Shift correr · S agachar/deslizar · Espaço ou W pular (S+Espaço desce da plataforma) ·
E câmera lenta · mouse mira · clique esquerdo atira · roda troca arma · R recarrega ·
clique direito/G lança item · Q troca item · F pega arma do chão · W/F usa a saída · Esc pausa · F11 tela cheia.

Debug: F3 overlay (hitboxes, visão da IA) · F4 god · F6 inimigo no cursor · F7 itens no cursor · F8 congela · F9 avança 1 passo · F10 replay da tentativa.

## Documentação

1. [Visão criativa](docs/01-visao-criativa.md) — premissa, tom, personagens, arte
2. [Design de jogo](docs/02-design-de-jogo.md) — controles, movimento, armas, attachments, itens, procgen, decisões em aberto
3. [Arquitetura](docs/03-arquitetura.md) — stack, camadas, motor, como adicionar conteúdo, testes, Electron
4. [Roadmap](docs/04-roadmap.md)
