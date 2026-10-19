# 01 · Visão criativa

> Título provisório: **LASANHA** — *"alguém comeu a lasanha errada."*

## Premissa

Paródia de **John Wick** ("mataram meu cachorro, quero vingança") com o tom bobo de escritório de **O Procurado (Wanted)**. A vingança é real e sangrenta; o motivo é ridículo.

**Paulo Pavio**, analista de planilhas sênior, deixou na geladeira do escritório a última lasanha que a avó fez antes de se mudar para a praia. O pote tinha um post-it: **"NÃO MEXA — PAULO"**. Domingo, 21h47, em casa, o celular vibra: no grupo do escritório, alguém posta uma foto do pote vazio com a legenda *"melhor lasanha da vida 😋"*.

Paulo era um assassino aposentado ("o cara que você manda pra matar o bicho-papão") e tinha trocado tudo por planilhas, vale-refeição e paz. Agora ele sai do apartamento, atravessa os becos do bairro e entra no prédio da **Sinergia S.A.** até descobrir quem comeu.

## Orientação

Jogo **"pé no chão", da esquerda para a direita**: cada fase é uma sequência lateral de salas, sempre avançando para a direita até a saída (porta, entrada do prédio, elevador…). A run começa no **apartamento do Paulo**.

## Tom

- **Ação a sério, motivo bobo.** Os tiroteios são estilosos e intensos; o humor está nos detalhes: falas dos inimigos, descrições de itens, cenário.
- **Humor de escritório reconhecível:** reunião que podia ser e-mail, impressora atolada, "desliga e liga de novo", crachá, catraca, *happy hour* obrigatório, RH.
- **Sem crueldade gratuita:** o alvo da piada é a cultura corporativa, não pessoas reais.
- Os textos de conteúdo (armas, itens, inimigos) sempre trazem uma linha de piada (`flavor`/`description` nos catálogos).

## Estrutura narrativa (rascunho)

Cada **bioma é um trecho do caminho**, percorrido da esquerda para a direita; a saída fica sempre no fim, à direita.

| Local | Bioma | Ideia | Status |
|---|---|---|---|
| AP 302 | Apartamento | Começo da run. Quarto → corredor → sala → porta. Sem inimigos. | protótipo |
| RUA | Becos | Lixeiras, cercas, escadas de incêndio, carros. | protótipo |
| T | Recepção | Catracas, mármore, recepcionista que "viu tudo". | protótipo |
| 7 | Open Space | Baias, post-its, cheiro de lasanha requentada. | protótipo |
| ? | TI / Data center | Servidores, cabos, analistas armados. | ideia |
| ? | Copa | Hub entre runs? A cena do crime. | ideia |
| ? | RH / Jurídico | Burocracia como obstáculo. | ideia |
| Cobertura | Diretoria | Chefe final: quem comeu a lasanha. | ideia |

**Reviravolta possível (aberta):** quem comeu a lasanha foi o CEO… ou o estagiário… ou o próprio Paulo, sonâmbulo (final secreto).

## Personagens (primeiro elenco)

- **Paulo Pavio** — protagonista. Calado, educado, letal. Camisa social e crachá.
- **Estagiário** — corpo a corpo, rápido, fraco, joga café quente.
- **Segurança** — atirador com Glock. Colete e crachá.
- **Analista de TI** — atirador com Uzi.
- **Gerente de Projetos** — tanque, lento, AK, "marca reunião no meio do tiroteio".

## Direção de arte

- **Pixel art com sprites.** Resolução virtual **480×270** (16:9), ampliada sem suavização (4× em 1080p).
- **Tiles de 16×16.** Personagem com colisor ~10×24 px.
- **Personagens são rigs** (cabeça, tronco, braços e pernas articulados) animados por código, não por frames de sprite. A arte final vai "vestir" os ossos.
- Cada bioma define **paleta** e **camadas de fundo parallax** (dados, não código).
- **Fase atual: wireframe.** Tudo é desenhado com retângulos e linhas para validar jogabilidade antes de investir em arte. O renderizador de sprites/animação já existe no motor ([src/engine/render/sprite.ts](../src/engine/render/sprite.ts)).

## Áudio (futuro)

- Trilha: synthwave/lo-fi de escritório que fica distorcida em câmera lenta.
- Hoje: bipes sintetizados de placeholder (`AudioMixer.beep`).
