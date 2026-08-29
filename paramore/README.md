# Paramore

Site em desenvolvimento, com base no projeto [yuna](../yuna/). Front-end only.

Publicado em `gustavomerling.github.io/paramore/dist/`.

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** 4 (via `@tailwindcss/postcss`, sem `tailwind.config.js`)
- **oxlint**

Sem shadcn/ui — o estilo é customizado e os tokens de marca vivem em
[src/index.css](src/index.css).

## Scripts

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # typecheck + gera ./dist (commitado para o GitHub Pages)
npm run preview  # preview do build em /paramore/dist/
npm run lint
```

## Deploy

O `base` do Vite é `/paramore/dist/` e o `dist/` é commitado — o GitHub Pages
serve os arquivos estáticos direto da pasta. Após alterações: `npm run build` e
commite o `dist/`.