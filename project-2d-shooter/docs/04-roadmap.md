# 04 · Roadmap

Escalar em fatias pequenas, cada uma jogável e testada.

## ✅ Base (feito)

- [x] Vite + React + TypeScript, build para `.exe` portátil (Electron)
- [x] Motor: loop de passo fixo, relógio com câmera lenta, ECS, input por ações, renderer vetorial, câmera, colisão de tiles
- [x] Movimento: correr, slide com esquiva, pulo variável, escadas, walljump, wall slide, vault
- [x] Tiro: armas e attachments como dados, hitbox por osso do rig, ricochete, perfuração
- [x] IA: visão, audição, memória, patrulha, alerta em grupo, cobertura, tiro, soco
- [x] Mapa procedural determinístico: prédios de 4 andares na grade + becos, alternados
- [x] Grade de medição visível (F2) e atlas de mapas para dev
- [x] Rig procedural e ragdoll de volta, em formas lisas (cápsulas)
- [x] Janelas laterais ligando os andares de cima de chunks vizinhos
- [x] Skybox básico com parallax (visível nos becos e pelas janelas)
- [x] Tela cheia na largura (sem faixas pretas)
- [x] Debug: overlay, god, spawn, congelar/passo, replay determinístico
- [x] Testes: integridade, alcance de superfícies, travessia por bot, determinismo; smoke em Electron

## ✂️ Simplificação (out/2026)

Removido de propósito para voltar a um canvas em branco: props e móveis, iluminação, partículas, sons, números de dano, tremida de câmera, granadas, drops e dinheiro, pixel art, abertura e tela de opções, o tema antigo (o rig e o ragdoll voltaram depois, sem pixel art). O áudio e os efeitos antigos estão no histórico do git; o cenário interativo (props, luz) nunca chegou a ser commitado.

## Próximo

- [ ] Definir tema, nome e direção de arte
- [ ] Mais chunks na grade (variedade de rotas verticais) — em andamento: Prédio 5 (escadaria), Passarela, chunks espelhados
- [ ] Afinar proporções (altura do andar, tamanho do personagem, alcance do pulo) usando a grade
- [x] Zumbis (inimigos com rota) sobem escadas; o grafo de pulos usa a colisão real (teto baixo, subir encostado na parede)
- [x] Atiradores também usarem escadas e plataformas para flanquear (sem visão, seguem a rota até a última posição conhecida)
- [ ] Decidir munição/drops e o loop roguelite
- [ ] Som e efeitos (quando houver direção de arte)
