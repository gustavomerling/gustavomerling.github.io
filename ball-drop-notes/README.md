# Ball Drop Notes

Jogo de física 2D no estilo *Line Rider*: uma bolinha cai, quica e rola sobre blocos que representam **notas musicais**. Cada bloco que a bolinha toca toca a nota correspondente, então a trajetória vira uma melodia.

O jogo é um **sandbox criativo**: não há fases nem objetivos de vitória.

## Conceito

- A bolinha começa parada na origem, com a simulação pausada.
- Ao tocar (Play), ela cai pela gravidade. A câmera acompanha a bolinha com suavidade.
- A bolinha quica nos blocos e cada quique toca a nota do bloco, com volume e brilho pela força do impacto.
- Uma linha de chegada (quadriculada) pausa a simulação com uma comemoração.

## Primeiros passos

Na primeira visita aparece uma tela de boas-vindas com três caminhos:

- **Criar música automática:** abre o painel Compor.
- **Desenhar livremente:** mostra as dicas de desenho.
- **Ouvir um exemplo:** escolhe uma música, gera a pista e já toca.

## Compor (planejar a música)

1. Escolha um **clima** (Alegre, Calmo, Melancólico, Misterioso, Épico, Canção de ninar, Dança, Chuva, Jardim japonês) e o tamanho (2, 4 ou 8 compassos), ou uma **música pronta** de domínio público.
2. O compositor cria uma melodia com motivo, frases e progressão de acordes, termina na tônica e ganha um título. Ela aparece num mini piano-roll.
3. **Ouvir** toca a melodia; **Outra** compõe uma nova. O BPM vem sugerido e pode ser mudado.
4. Escolha o estilo da pista e se terá chegada, e clique em **Gerar pista e tocar**. O gerador usa a física real do jogo para posicionar cada bloco onde a bolinha vai estar no instante exato de cada nota.

## Piano e gravação

O botão **Piano** abre um teclado na tela, tocável com mouse, dedo (arrastar faz glissando) ou com o teclado do computador, sempre ativo:

- **A S D F G H J K L ;** = Dó Ré Mi Fá Sol Lá Si Dó Ré Mi.
- **W E T Y U O P** = sustenidos.
- **Z / X** = oitava abaixo / acima (Dó3, Dó4 ou Dó5).

**Modo fácil:** o botão **Fácil** troca o piano por um xilofone só com as notas de uma escala (Pentatônica maior por padrão, ou qualquer outra). Cada fileira do teclado é uma oitava, subindo pela escala a partir do Dó:

- `A S D F G H J K`: a partir do Dó3 (grave);
- `Q W E R T Y U I`: a partir do Dó4;
- `1 2 3 4 5 6 7 8`: a partir do Dó5 (agudo).

Cada fileira vai do Dó ao Dó seguinte, então o número de teclas acompanha a escala (6 nas pentatônicas, 7 no blues, 8 nas escalas de 7 notas). A mesma coluna é sempre o mesmo grau, e nada do que se tocar soa errado. As fileiras de cima valem com o piano aberto; aí `R` é nota, não o atalho de reiniciar. O modo e a escala ficam lembrados.

O piano também tem timbre e BPM. **Gravar** conta 4 batidas e grava com metrônomo (acento no 1º tempo). Ao parar (botão ou Espaço), a melodia entra no Compor como **Gravada por você**, pronta para ouvir e gerar a pista. Nenhuma nota tocada se perde, e o que você segura é respeitado:

- **Nota segurada:** soa pelo tempo que a tecla ficou pressionada, inclusive por baixo das notas seguintes (um baixo ou pedal enquanto a melodia anda).
- **Acorde:** notas tocadas juntas (até 70 ms de diferença) viram um bloco só, que toca todas. A nota mais aguda é a principal, com o nome no bloco; as outras aparecem como "+ Mi3" ou "+2".

Há duas versões do ritmo:

- **Refinada** (padrão): descobre o tempo em que você realmente tocou e o seu atraso ou adiantamento constante, e escolhe para cada batida a divisão mais simples que explica as notas (semínima, colcheia, tercina ou semicolcheia). A última nota fecha o compasso. O painel mostra o que foi ajustado.
- **Como toquei**: cada nota na semicolcheia mais perto, no tempo do metrônomo.

## Controles

### Barra inferior

Voltar 5 s, Passo, Play/Pausar, Reiniciar, Desfazer, Enquadrar e os painéis **Compor**, **Som**, **Ferramentas** e **Arquivo**, além da ajuda.

### Atalhos

| Tecla | Ação |
|---|---|
| Espaço | Play / Pausar |
| R | Reiniciar |
| . | Passo |
| , | Voltar 5 s |
| 0 | Enquadrar tudo |
| + / − | Zoom |
| Ctrl+Z | Desfazer |
| Delete | Apagar o bloco selecionado |
| Esc | Fecha ajuda, painel ou seleção |
| ? | Ajuda |
| A–L, W–P, Z/X | Piano (veja acima) |

### Mouse e toque

- **Arrastar no vazio:** cria um bloco.
- **Clicar num bloco:** seleciona (cartão com teclado de notas, sugestões de próxima nota, chegada e apagar). Arraste as alças das pontas para mudar o bloco.
- **Botão direito num bloco:** apaga.
- **Arrastar a bolinha:** muda o ponto de partida. Com **Shift**, grava o caminho como blocos.
- **Roda do mouse / pinça com dois dedos:** zoom.
- **Botão do meio / dois dedos arrastando:** move a câmera.

## Blocos

- Cada bloco é uma reta com uma nota, de Dó3 a Dó6. A cor vem da nota.
- A largura define a duração da nota (100 px = 1 s, de 0,15 s a 8 s). Blocos vindos de uma gravação podem ter duração própria e notas de acorde, que são salvas no arquivo. Com o **Encaixe**, o comprimento vai a frações de batida.
- Notas de blocos novos sobem na escala ou repetem a anterior; com uma música aplicada, seguem a ordem da música.

## Som

Tudo sintetizado, com reverb, delay estéreo, compressor e limite de 24 vozes. Instrumentos: Caixinha de música, Marimba, Piano elétrico, Sino, Harpa, Kalimba, Chiptune e Pad suave. A panorâmica segue a posição da bolinha na tela. Sequências bonitas dentro da escala ganham um arpejo de recompensa.

## Previsão e metrônomo

Com a simulação pausada (ou com o rastro ligado), a linha pontilhada mostra os próximos 10 s, com as batidas do metrônomo e os quiques previstos na cor da nota que vão tocar.

## Salvar e abrir

No painel Arquivo: salvar e abrir `ball-drop-notes.json`, versões na sessão e exemplos.

## Física

- Gravidade constante de 1500 px/s².
- Quique global, com restituição de 0,6.
- Atrito global de 0,1 sobre a velocidade tangencial a cada contato.
- O modelo não tem rotação: a bolinha desliza sobre os blocos e não rola de verdade.
- Os passos são subdivididos para que a bolinha não atravesse blocos, mesmo em alta velocidade.

Os valores ficam no objeto `PHYSICS` em `src/App.tsx`.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- Canvas 2D e Web Audio API, sem bibliotecas extras.
- Build estático publicado no GitHub Pages.

## Scripts

```bash
npm install       # instala dependências
npm run dev       # servidor de desenvolvimento
npm run build     # gera o build em dist/
npm run preview   # serve o build localmente
```

## Deploy (GitHub Pages)

A `base` do Vite está configurada como `/ball-drop-notes/dist`, então o build em `dist/` é servido em:

`https://gustavomerling.github.io/ball-drop-notes/dist/`

Por isso o `dist/` é versionado no repositório: rode `npm run build` antes de commitar.

## Ideias para depois

- Inclinar blocos, para ver para onde a bolinha segue.
- Painel de biblioteca de notas, com arrastar para o canvas.
- Timbres de amostra (piano), que pedem arquivos de áudio.

O plano de desenvolvimento e as etapas estão em [DEVELOPMENT.md](DEVELOPMENT.md).
