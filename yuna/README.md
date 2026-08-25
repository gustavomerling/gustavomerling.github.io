# Plataforma Yuna

Simulação de plataforma de gestão de conteúdo e cadastro de clientes para a
**Yuna Marketing & Comunicação**. Front-end only — todos os dados são mockados e
persistidos no `localStorage` do navegador.

Publicada em `gustavomerling.github.io/yuna/dist/`.

## Stack

- **Vite** 8 + **React** 19
- **Tailwind CSS** 4 (via `@tailwindcss/postcss`, sem `tailwind.config.js`)
- **shadcn/ui** — componentes em `src/components/ui`
- **Lucide React** — ícones (os de marca ficam em `src/components/social/platform-icons.jsx`,
  porque a v1 do lucide não distribui mais ícones de marca)
- **Zustand** + `persist` — estado e cadastros no `localStorage` (store versionada:
  subir `version` em `useDataStore` faz o seed novo entrar em navegador que já
  tem dados salvos, preservando o que o usuário criou)
- **AOS** — animações de entrada na landing
- **React Router** (`HashRouter`) — deep links funcionam em hospedagem estática
- **Recharts** (via `chart` do shadcn) e **date-fns**
- **oxlint**

## Design tokens

A paleta, as fontes e os logos foram extraídos de `plataforma.pivotlab.com.br`
e vivem em [src/index.css](src/index.css):

| Token | Claro | Escuro |
| --- | --- | --- |
| `--primary` | `#0d3226` verde escuro | `#4fa68a` |
| `--secondary` | `#2d3d4d` azul marinho | `#b0c1d9` |
| `--accent` | `#7b7948` oliva | `#b0a865` |
| `--background` | `#f5f3ec` bege | `#0f1a22` |

Fontes: **Inter Tight** (`font-sans`) na interface, **Instrument Serif**
(`font-display`) nos títulos editoriais e **Petrona** nos números.

Instrument Serif tem eixo x baixo, então todo título usa um ou dois passos
acima do que a escala sans pediria — a escala completa está na tela de design
system.

Os logos são os PNG originais em `public/brand/`. O componente
[Logo](src/components/brand/Logo.jsx) recorta a arte e a repinta com um filtro
SVG (`luminanceToAlpha` + `feFlood`), então o mesmo arquivo serve para fundo
claro e escuro. Em fundo neutro use `ThemedLogo`, que troca de instância por
tema — `feFlood` não aceita custom property.

Convenções de tipografia:

- nenhum `font-black` — peso máximo 600 nos títulos, 700 apenas nos números
- sem títulos em caixa alta
- **piso de 12 px** (`text-xs`) em qualquer texto da interface
- todo número usa a utility `stat` (Petrona 700 + dígitos tabulares), definida
  em `src/index.css`

## Telas

Públicas: landing (`/`), login (`/login`, com senha e "Continuar com o Google"
simulados), recuperação de senha (`/esqueci-minha-senha`) e 404 (qualquer rota
desconhecida).

Autenticadas, sob `/app`: visão geral com gráficos, calendário editorial,
conteúdo, aprovações, clientes, equipe, **design system** e configurações.

A landing usa AOS nas seções e o menu rola por script — em `HashRouter` um
`href="#secao"` viraria rota, então as âncoras são botões com `scrollIntoView`.

O design system (`/app/design-system`) reúne marca, paleta clicável para copiar
tokens, escala tipográfica, escala numérica, raios, sombras e os componentes em
uso. Visível para os papéis internos.

## Papéis

Quatro papéis, trocáveis a qualquer momento pelo menu do usuário no topo — o
seletor no login define apenas o inicial. A navegação e as capacidades saem de
[src/lib/permissions.js](src/lib/permissions.js).

| Papel | Enxerga |
| --- | --- |
| Administração | tudo, incluindo faturamento e equipe |
| Operação | produção, calendário e conteúdo de toda a carteira |
| Comercial | clientes, equipe e faturamento; não edita conteúdo |
| Cliente | apenas a própria conta, com poder de aprovar ou pedir ajuste |

## Simulador de publicação

[PostPreview](src/components/social/PostPreview.jsx) mostra a peça como ela sai
publicada e permite trocar plataforma e formato na hora:

- **Instagram** — feed, carrossel (navegável), stories e reels
- **Facebook** — feed, carrossel, stories e reels
- **LinkedIn** — feed e carrossel (documento paginado)

### Imagens das peças

[Creative](src/components/social/creative.jsx) mostra a imagem da pauta quando
existe e cai no gradiente da paleta quando não existe.

As imagens de demonstração ficam em `public/mock/`, baixadas do
**Openverse** (licenças de uso comercial) e do **picsum.photos**. A autoria e a
licença de cada arquivo estão em
[public/mock/credits.json](public/mock/credits.json).

O upload é local: [readImageFile](src/lib/image.js) redimensiona no canvas para
1080 px no lado maior e guarda a peça como data URL junto com a pauta, no
`localStorage`. O componente de campo é
[ImageUpload](src/components/social/ImageUpload.jsx), disponível na criação e na
edição de pautas, com arrastar e soltar. Como o `localStorage` tem cerca de
5 MB, vale contar umas 20 peças próprias antes de encher.

## Dados

Seed em [src/lib/mock-data.js](src/lib/mock-data.js): 6 clientes, 14 pautas
entre agosto e setembro de 2026, séries de alcance e equipe.

Chaves no `localStorage`: `yuna:auth` (sessão e papel), `yuna:data` (clientes,
pautas e imagens em base64) e `yuna:prefs` (tema, sidebar, notificações).
Configurações → Dados tem o botão de restaurar o seed.

## Scripts

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # gera ./dist (commitado para o GitHub Pages)
npm run preview  # preview do build em /yuna/dist/
npm run lint
```

## Adicionar componentes shadcn

O `components.json` já está configurado (style `new-york`, base color `slate`,
JSX, alias `@/`):

```bash
npx shadcn@latest add drawer command
```

## Deploy

O `base` do Vite é `/yuna/dist/` e o `dist/` é commitado — o GitHub Pages serve
os arquivos estáticos direto da pasta. Após alterações: `npm run build` e
commite o `dist/`.
