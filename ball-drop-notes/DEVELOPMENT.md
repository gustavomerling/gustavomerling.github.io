# Ball Drop Notes: ordem de desenvolvimento

Cada etapa entrega cerca de 10% do jogo e termina com algo testável. A próxima etapa só começa depois do seu OK.

Ordem geral: física e câmera primeiro, depois edição de blocos, depois som, e por último os recursos de análise (previsão e metrônomo).

## Etapas

### 1. Bolinha caindo com câmera
- **Entrega:** bolinha cai pela gravidade e a câmera a mantém centralizada, sem fim.
- **Como testar:** abrir a página e ver a bolinha cair indefinidamente, sempre no centro da tela.

### 2. Bloco reto fixo
- **Entrega:** um bloco reto pré-definido no código; a bolinha quica nele.
- **Como testar:** a bolinha bate no bloco e quica para cima.

### 3. Quique e atrito globais
- **Entrega:** coeficiente de quique e atrito globais, configuráveis no código.
- **Como testar:** alterar os valores no código e ver a bolinha quicar mais ou menos, rolar ou deslizar.

### 4. Rastro
- **Entrega:** linha mostrando o caminho da bolinha, com botão para ligar e desligar.
- **Como testar:** ligar o rastro, deixar a bolinha cair e ver a linha. Desligar e ver que ela some.

### 5. Play, pausar e reiniciar
- **Entrega:** botões Play/Pausar e Reiniciar.
- **Como testar:** pausar com a bolinha no ar, despausar e ver que continua. Reiniciar volta à posição inicial.

### 6. Passo a passo
- **Entrega:** avança a simulação um frame por vez quando pausada.
- **Como testar:** pausar e clicar em passo a passo; a bolinha se move um pouco a cada clique.

### 7. Zoom e pan
- **Entrega:** zoom com a roda do mouse e deslocamento arrastando a área vazia.
- **Como testar:** dar zoom in e out e arrastar a tela. A bolinha continua seguida pela câmera ou o pan é liberado, conforme a decisão da etapa.

### 8. Criar bloco
- **Entrega:** arrastar na área de desenho cria um bloco reto.
- **Como testar:** arrastar, soltar e ver o bloco; a bolinha quica nele.

### 9. Apagar bloco
- **Entrega:** clique com o botão direito apaga o bloco.
- **Como testar:** clicar com o botão direito em um bloco e ver que ele some.

### 10. Desfazer (Ctrl+Z)
- **Entrega:** pilha de desfazer para criar e apagar blocos.
- **Como testar:** criar dois blocos, apagar um, dar Ctrl+Z e ver o bloco voltar. Repetir até não haver mais ações.

### 11. Largura do bloco
- **Entrega:** a largura do bloco é editável pelo jogador. Ela define a duração da nota, mas o som ainda não existe.
- **Como testar:** alterar a largura de um bloco existente e ver a mudança na tela.

### 12. Notas nos blocos
- **Entrega:** seletor de nota por bloco, com 3 oitavas (sugestão: 37 notas, de dó a dó). Ainda sem som.
- **Como testar:** escolher notas diferentes nos blocos e ver o nome da nota exibido sobre cada um.

### 13. Som das notas
- **Entrega:** tocar a nota ao colidir, com um timbre fixo.
- **Como testar:** a bolinha bate em blocos com notas diferentes e cada colisão toca a nota certa.

### 14. Volume pela força do impacto
- **Entrega:** quanto mais forte a bolinha bate, mais alto o som.
- **Como testar:** soltar a bolinha de alturas diferentes e perceber o volume maior nas quedas mais fortes.

### 15. Escolha de timbre por simulação
- **Entrega:** seletor de instrumento para a simulação inteira.
- **Como testar:** trocar o timbre e ouvir a mesma trajetória com outro som.

### 16. Decaimento por velocidade
- **Já coberto pela etapa 14:** o volume segue a velocidade do impacto, então quiques seguidos no mesmo bloco ficam mais baixos conforme a bolinha perde velocidade. Testar junto com a etapa 17.
- **Entrega:** tocar o mesmo bloco várias vezes seguidas faz a nota perder volume conforme a velocidade da bolinha cai.
- **Como testar:** deixar a bolinha quicar no mesmo bloco e ouvir o som diminuir.

### 17. Biblioteca de blocos com filtro de escala
- **Entrega:** painel com blocos prontos e filtro por escala musical (ex.: pentatônica, maior, menor).
- **Como testar:** escolher uma escala e ver apenas as notas dela na biblioteca.

### 18. Linha de chegada
- **Entrega:** bloco especial que pausa a simulação quando a bolinha o toca.
- **Como testar:** colocar a linha de chegada no caminho da bolinha e ver a simulação parar ao tocá-la.

### 19. Previsão de trajetória
- **Já feito parcialmente (pedido do usuário):** linha tracejada com o futuro de 10 s, junto com o rastro. Falta mostrar só com a simulação pausada, se for o caso.
- **Entrega:** com a simulação pausada, mostra por onde a bolinha vai continuar, sem alterar o estado.
- **Como testar:** pausar e ver a linha prevista. Despausar e ver que a previsão some e a simulação segue igual.

### 20. Metrônomo na previsão
- **Entrega:** a linha prevista é dividida em marcações de tempo, indicando onde a bolinha deve quicar.
- **Como testar:** ver as marcações na linha prevista e conferir que cada quique cai em uma marcação.

### 21. Salvar e carregar desenho
- **Entrega:** salvar e carregar o desenho. O formato (JSON, URL ou localStorage) é definido antes desta etapa.
- **Como testar:** desenhar, salvar, recarregar a página, carregar e ver o desenho igual.

## Etapas de gameplay e UX

Foco em fazer música com naturalidade: prever, escolher notas, ter ritmo e editar sem atrito.

### 22. Previsão ao editar
- **Entrega:** com a simulação pausada, a linha prevista aparece mesmo com o rastro desligado, e acompanha cada bloco movido.
- **Como testar:** desligar o rastro, pausar, mover uma ponta de bloco e ver a previsão mudar na hora.

### 23. Gravar o caminho desenhado
- **Entrega:** arrastar a bolinha com o mouse e gravar a trajetória como uma sequência de blocos.
- **Como testar:** pausar, arrastar a bolinha por um caminho e ver os blocos criados seguirem o gesto.

### 24. Modo de escuta em loop
- **Entrega:** tocar em loop um trecho escolhido, sem reiniciar a queda inteira.
- **Como testar:** escolher um trecho, ligar o loop e ouvir a repetição enquanto ajusta os blocos.

### 25. Ponto de partida ajustável
- **Entrega:** arrastar a bolinha para a posição e altura iniciais antes de começar.
- **Como testar:** mover a bolinha com a simulação pausada, continuar e ver a queda partir do novo ponto.

### 26. Nota sugerida
- **Entrega:** um bloco novo sobe um grau da escala em relação ao último criado. Sem bloco anterior, começa em Dó4. Com música escolhida, a música manda.
- **Como testar:** criar três blocos seguidos e ver as notas subirem pela escala escolhida.

### 27. Pincel de nota
- **Entrega:** escolher uma nota e pintar vários blocos com ela de uma vez.
- **Como testar:** selecionar uma nota, clicar em vários blocos e ver todos mudarem.

### 28. Herdar a nota do vizinho
- **Entrega:** um bloco novo começa com a nota do bloco criado antes, em vez de uma nota fixa.
- **Como testar:** criar blocos sem música e ver cada um começar com a nota do anterior.

### 29. Transposição
- **Entrega:** deslocar a nota de todos os blocos juntos, em semitons ou oitavas.
- **Como testar:** transpor a melodia para cima e para baixo e ver todas as notas se moverem igual.

### 30. Teclado como piano
- **Entrega:** teclas mapeadas às notas da escala para tocar uma nota sem desenhar nada.
- **Como testar:** apertar uma tecla e ouvir a nota correspondente.

### 31. Encaixe da largura no ritmo
- **Entrega:** ao criar ou esticar um bloco, o comprimento encaixa em frações de batida (1/4 de tempo). Pode ser desligado pelo botão Encaixe.
- **Como testar:** esticar um bloco com o encaixe ligado e ver o comprimento saltar em passos iguais. Desligar e ver a largura livre.

### 32. Alinhar ao metrônomo
- **Entrega:** ao soltar um bloco, ajustar a posição para que a bolinha quique no tempo.
- **Como testar:** criar blocos com o metrônomo ligado e conferir que os quiques caem nas batidas.

### 33. Batida sobre o bloco
- **Entrega:** marcas de tempo desenhadas na própria pista, não só na previsão.
- **Como testar:** ver as marcas sobre o trajeto da bolinha, alinhadas ao BPM.

### 34. Pontuação de harmonia
- **Entrega:** indicador suave dizendo se as notas consecutivas estão na escala e se o intervalo soa bem. Sem placar.
- **Como testar:** montar uma sequência fora da escala e outra dentro, e ver o indicador diferente.

### 35. Destaque da melodia tocada
- **Entrega:** a nota atual e a seguinte aparecem em destaque enquanto a bolinha cai.
- **Como testar:** ouvir a queda e ver o bloco ativo destacado.

### 36. Visualização do som
- **Entrega:** o bloco pulsa ou muda de brilho ao tocar, com intensidade pelo impacto.
- **Como testar:** deixar a bolinha quicar e ver o bloco reagir, mais forte nos impactos fortes.

### 37. Recompensa sonora
- **Entrega:** quando a sequência fica na escala ou repete um padrão, um acorde curto toca como prêmio.
- **Como testar:** montar uma sequência de notas da escala e ouvir o acorde ao completar o padrão.

### 38. Editar sem pausar
- **Entrega:** criar blocos, selecionar e mover pontas com a bolinha rodando.
- **Como testar:** com a simulação rodando, criar um bloco e esticar outro, e ver a bolinha reagir sem parar.

### 39. Rebobinar
- **Entrega:** voltar alguns segundos da queda para revisar um trecho.
- **Como testar:** deixar cair, rebobinar 5 s e ver a bolinha voltar àquele ponto.

### 40. Versões salvas
- **Entrega:** guardar estados do desenho que você marcou como bons, para comparar depois.
- **Como testar:** salvar uma versão, mudar o desenho e voltar à versão salva.

### 41. Ajustar sem perder o trecho
- **Entrega:** ao mudar um bloco, manter a bolinha no mesmo instante da simulação para ouvir o efeito direto.
- **Como testar:** mudar a nota de um bloco no meio da queda e ouvir o efeito no mesmo instante.

### 42. Modelos rítmicos prontos
- **Entrega:** padrões de ritmo ou ostinato para encaixar no desenho e depois alterar.
- **Como testar:** inserir um padrão e ver os blocos criados com as larguras do ritmo.

### 44. Exemplos tocáveis
- **Entrega:** biblioteca de desenhos de exemplo para ouvir e modificar.
- **Como testar:** abrir um exemplo pelo menu e ver o desenho carregar e tocar.

## Propostas pendentes

- **Inclinar bloco** (sugerido pelo usuário): girar o bloco para ver para onde a bolinha segue. Encaixa melhor depois da etapa 8 (criar bloco). Precisa de ordem definida.

- **Músicas de domínio público pré-configuradas** (ideia do usuário): desenhos de blocos prontos, com notas e posições de músicas em domínio público, para o jogador carregar e ouvir. Depende da etapa 21 (salvar e carregar).

## Status

- Etapas 1 a 21 concluídas, cada uma validada pelo usuário.
- Etapas 22 a 31 e 33 a 44 implementadas, aguardando validação do usuário. Parcial: 35 destaca só o bloco tocado agora, não o próximo. Pendente: 32 (alinhar ao metrônomo).
- Visual: cinco agentes reescreveram o CSS em src/styles/ (toolbar, controls, selection, panels) e src/index.css (tokens e base).
- Decisões que estavam em aberto, resolvidas durante o desenvolvimento:
  - Formato de salvamento: JSON baixado e aberto pelo próprio jogo (etapa 21).
  - Pan: só com a simulação pausada, pelo botão do meio (etapa 7).
  - Oitavas: 3, de Dó3 a Dó6 (etapa 12).
