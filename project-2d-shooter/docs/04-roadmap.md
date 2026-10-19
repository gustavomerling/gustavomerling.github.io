# 04 · Roadmap

Escalar em fatias pequenas, cada uma jogável e testada.

## ✅ Fase 0 — Infraestrutura (atual)

- [x] Vite + React + TypeScript, build para `.exe` portátil (Electron)
- [x] Motor: loop de passo fixo, relógio com câmera lenta, ECS, input por ações, renderer pixel-perfect, câmera, colisão de tiles
- [x] Conteúdo data-driven: 4 armas, 8 attachments, 2 itens, 4 inimigos, 3 biomas
- [x] Geração procedural determinística por seed (layout + templates de sala)
- [x] Abertura, menu, opções (volume, tela cheia, escala, debug), pausa, HUD
- [x] Sala de testes wireframe jogável: andar, correr, agachar, deslizar, pular, câmera lenta, atirar, trocar arma, recarregar, granada, flashbang, elevador para o próximo andar
- [x] Testes unitários + smoke test em Electron
- [x] Personagens com rig (cabeça, tronco, braços e pernas articulados) animado proceduralmente com IK — wireframe em caixas, para jogador e inimigos

## Fase 1 — Combate de verdade

- [x] IA dos inimigos (visão + audição + memória), por `brain` (`melee`, `shooter`, `tank`)
- [x] Inimigos atiram e socam; dano no jogador; morte e "tentar de novo"
- [x] Ruído dos tiros alerta inimigos (`noise`, `silenced`)
- [x] Hitbox por parte do corpo, números de dano, ricochete por ângulo
- [x] Escopo reduzido a 1 cenário (Becos) com coberturas
- [x] Patrulha, alerta em grupo, avanço, cobertura com agachamento
- [x] Sensação de tiro: som, clarão, fumaça, cápsulas, traçante; partículas de impacto
- [x] Knockback + atordoamento nos inimigos, reação do rig, ragdoll, hit-stop, marcador de acerto
- [x] Dano no jogador: direção, vinheta, i-frames; esquiva no slide; barra de foco
- [x] Munição de reserva, drops (vida/dinheiro/munição/arma), troca de arma
- [x] Caixas, portas, barris explosivos, luminária que cai, extintor/fumaça
- [x] Ferramentas de debug: god, spawn, congelar/passo, hitboxes/visão, replay determinístico
- [ ] Flanqueio de verdade (inimigos contornando por plataformas), inimigos se escondendo atrás de portas
- [ ] Granadas inimigas; inimigos reagindo a barris/fumaça
- [ ] Barra de foco da câmera lenta (decisão em aberto)

## Fase 2 — Loop roguelite

- [ ] Drops: armas e attachments no chão, troca de attachments
- [ ] Estado do jogador persiste entre andares
- [ ] Tela de morte com resumo e seed
- [ ] Moeda e meta-progressão (Copa como hub)
- [ ] Salas especiais (tesouro, loja, desafio) e ramificações

## Fase 3 — Arte e som

- [ ] Arte do Paulo e dos 4 inimigos sobre o rig (peças por osso); reações de dano e morte (ragdoll?)
- [ ] Tilesets por bioma; fundos parallax desenhados
- [ ] SFX reais e trilha; filtro de áudio na câmera lenta
- [ ] Abertura animada com a história da lasanha

## Fase 4 — Conteúdo e polimento

- [ ] Mais armas/attachments/itens; biomas TI, RH, Diretoria; chefes
- [ ] Remapeamento de teclas, suporte a controle
- [ ] Ícone e metadados do `.exe`, instalador opcional, assinatura
