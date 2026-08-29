# Design System: Paramore Brasil (DS-PB)

> **Documentação de Engenharia e Design de Interface**  
> Para Desenvolvedores Front-end, Designers UI/UX e Criadores de Conteúdo  
> Versão: 2.0.0 • Compatível com Tailwind CSS, CSS Custom Properties & React / Next.js / Vue / Astro

---

## 1. Princípios de Design do DS-PB

1. **Fans-First & Imersivo:** A interface deve fazer o visitante sentir a energia visceral dos shows e a profundidade poética da banda.
2. **Arquitetura de "Era-Theming" Dinâmica:** O usuário pode alternar a identidade visual do portal para sua era favorita do Paramore (*All We Know, RIOT!, Brand New Eyes, Self-Titled, After Laughter, This Is Why*) ou usar o tema padrão moderno.
3. **Leitura Editorial de Alta Performance:** Notícias longas, transcrições e traduções de letras devem ter legibilidade impecável, sem poluição visual.
4. **Mobile-First & Responsivo:** 80%+ dos acessos de fãs vêm de smartphones durante shows e lançamentos; a interface mobile deve ser ultra-rápida, tátil e sem atrito.
5. **Acessibilidade Universal (WCAG 2.1 AA+):** Alto contraste, navegação completa por teclado, suporte a leitores de tela e respeito a `prefers-reduced-motion`.

---

## 2. Design Tokens (Fundações)

### 2.1 Sistema de Cores (Color Tokens)

#### Paleta Base Neutra e Superfícies (Dark-First)
```css
:root {
  /* Tons de Fundo e Superfície */
  --color-bg-canvas: #09090B;        /* Fundo geral da página (profundo) */
  --color-bg-surface-1: #121216;     /* Cards, painéis e barras */
  --color-bg-surface-2: #1C1C24;     /* Cards secundários, inputs, hovers */
  --color-bg-surface-3: #282834;     /* Modais, dropdowns e popovers */
  
  /* Linhas e Divisórias */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.18);
  --color-border-focus: #FF5500;
  
  /* Textos e Tipografia */
  --color-text-primary: #F4F4F6;     /* Títulos e corpo principal (98% branco) */
  --color-text-secondary: #A1A1B2;   /* Metadados, subtítulos e legendas */
  --color-text-muted: #6E6E82;       /* Rodapés, placeholders e timestamps */
  --color-text-inverse: #09090B;     /* Texto sobre botões vibrantes */
  
  /* Feedback e Status */
  --color-status-success: #10B981;   /* Ingressos disponíveis, show confirmado */
  --color-status-warning: #F59E0B;   /* Poucos ingressos, rumores */
  --color-status-danger: #EF4444;    /* Esgotado, show cancelado */
  --color-status-info: #3B82F6;      /* Comunicados e avisos */
}
```

#### Tokens Temáticos Dinâmicos ("Era Themes")
Ao aplicar a classe no elemento `<body>` (ex: `<body class="theme-riot">`), as variáveis de destaque mudam instantaneamente:

```css
/* 1. Tema Padrão: Paramore Brasil Modern */
body, body.theme-default {
  --color-accent-primary: #FF5500;       /* Laranja Paramore */
  --color-accent-hover: #FF7733;
  --color-accent-subtle: rgba(255, 85, 0, 0.15);
  --color-accent-glow: rgba(255, 85, 0, 0.4);
  --font-heading: 'Syne', sans-serif;
}

/* 2. Tema: All We Know Is Falling (2005) */
body.theme-awkif {
  --color-accent-primary: #9E1B1B;       /* Vermelho Sofá Desgastado */
  --color-accent-hover: #C22626;
  --color-accent-subtle: rgba(158, 27, 27, 0.2);
  --color-accent-glow: rgba(158, 27, 27, 0.5);
  --font-heading: 'Courier Prime', monospace;
}

/* 3. Tema: RIOT! (2007) */
body.theme-riot {
  --color-accent-primary: #FF6600;       /* Laranja Riot Fogo */
  --color-accent-hover: #FF8533;
  --color-accent-subtle: rgba(255, 102, 0, 0.2);
  --color-accent-glow: rgba(255, 102, 0, 0.6);
  --font-heading: 'Impact', 'Syne', sans-serif;
}

/* 4. Tema: Brand New Eyes (2009) */
body.theme-bne {
  --color-accent-primary: #E5A93C;       /* Amarelo Ocre / Mariposa */
  --color-accent-hover: #F0BC5E;
  --color-accent-subtle: rgba(229, 169, 60, 0.18);
  --color-accent-glow: rgba(229, 169, 60, 0.45);
  --font-heading: 'Neue Helvetica', 'Space Grotesk', sans-serif;
}

/* 5. Tema: Self-Titled (2013) */
body.theme-selftitled {
  --color-accent-primary: #00D8ED;       /* Azul Cyan Elétrico */
  --color-accent-hover: #38E5F6;
  --color-accent-subtle: rgba(0, 216, 237, 0.18);
  --color-accent-glow: rgba(0, 216, 237, 0.5);
  --font-heading: 'Futura', 'Cabinet Grotesk', sans-serif;
}

/* 6. Tema: After Laughter (2017) */
body.theme-afterlaughter {
  --color-accent-primary: #FF6F61;       /* Coral Neon / Memphis */
  --color-accent-hover: #FF8C80;
  --color-accent-subtle: rgba(255, 111, 97, 0.2);
  --color-accent-glow: rgba(255, 111, 97, 0.5);
  --font-heading: 'Syne', sans-serif;
}

/* 7. Tema: This Is Why (2023) */
body.theme-thisiswhy {
  --color-accent-primary: #C04A26;       /* Terracota Rust Analógico */
  --color-accent-hover: #D75B34;
  --color-accent-subtle: rgba(192, 74, 38, 0.2);
  --color-accent-glow: rgba(192, 74, 38, 0.4);
  --font-heading: 'Futura', 'Space Grotesk', sans-serif;
}
```

---

### 2.2 Escala Tipográfica (Typography Scale)

| Token | Tamanho (Desktop) | Tamanho (Mobile) | Line Height | Tracking | Aplicação Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--font-size-display` | 4.5rem (72px) | 2.75rem (44px) | 1.05 | -0.04em | Super títulos de Hero e Anúncios de Álbum |
| `--font-size-h1` | 3.25rem (52px) | 2.25rem (36px) | 1.15 | -0.03em | Títulos de Artigos e Páginas Principais |
| `--font-size-h2` | 2.25rem (36px) | 1.75rem (28px) | 1.25 | -0.02em | Cabeçalhos de Seções e Módulos |
| `--font-size-h3` | 1.5rem (24px) | 1.25rem (20px) | 1.3 | -0.01em | Títulos de Cards de Notícia e Faixas |
| `--font-size-h4` | 1.25rem (20px) | 1.125rem (18px) | 1.4 | 0.00em | Subtítulos de Seções e Widgets |
| `--font-size-body-lg` | 1.125rem (18px) | 1.0rem (16px) | 1.65 | 0.00em | Parágrafos de Introdução e Destaques |
| `--font-size-body-base`| 1.0rem (16px) | 0.9375rem (15px)| 1.6 | 0.00em | Corpo de texto editorial e traduções |
| `--font-size-body-sm` | 0.875rem (14px) | 0.8125rem (13px)| 1.5 | +0.01em | Metadados (Data, Autor, Tags) |
| `--font-size-caption` | 0.75rem (12px) | 0.75rem (12px) | 1.4 | +0.04em | Créditos fotográficos e Badges |

**Font Families Recomendadas (Google Fonts / Abertas):**
- **Headings & Display:** `Syne` (Pesos: 700, 800) ou `Space Grotesk` (Pesos: 600, 700).
- **Body & Editorial:** `Plus Jakarta Sans` ou `Inter` (Pesos: 400, 500, 600).
- **Monospace & Letras:** `JetBrains Mono` ou `Courier Prime` (para setlists, códigos e traduções).

---

### 2.3 Espaçamento, Grid e Layout (Spacing Tokens)

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1.0rem;   /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2.0rem;   /* 32px */
  --space-12: 3.0rem;  /* 48px */
  --space-16: 4.0rem;  /* 64px */
  --space-24: 6.0rem;  /* 96px */

  /* Containers */
  --container-max-width: 1280px;
  --container-editorial-width: 820px; /* Largura ideal para leitura confortável de artigos */
  --container-padding: 1.5rem;        /* 24px mobile / 48px desktop */
}
```

---

### 2.4 Raios de Borda, Sombras e Elevação

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;     /* Padrão para cards e botões */
  --radius-lg: 16px;    /* Padrão para modais e banners */
  --radius-full: 9999px;/* Pílulas de badges e avatares */

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.7);
  --shadow-glow: 0 0 20px var(--color-accent-glow);
  --shadow-punk-offset: 4px 4px 0px #000000; /* Estilo pop-punk decalque */
}
```

---

## 3. Especificação de Componentes de UI

### 3.1 Navbar Global (Header com Seletor de Era)

```
+-----------------------------------------------------------------------------------------+
| [ | \ | PARAMORE BRASIL ]     [Notícias] [Discografia] [Shows] [Fotos] [Traduções]     |
|                               [ 🎨 Mudar Era: RIOT! ▼ ]   [ 🔍 Buscar ]  [ 🇧🇷 Redes ] |
+-----------------------------------------------------------------------------------------+
```

- **Comportamento:** Fixo no topo com `backdrop-filter: blur(16px)` e fundo semitransparente (`rgba(9, 9, 11, 0.85)`).
- **Seletor de Era (Era Switcher):** Menu interativo onde o fã clica em botões estilizados de cada álbum, aplicando a classe do tema dinamicamente e salvando a preferência no `localStorage`.

---

### 3.2 Card de Notícia Editorial (`<NewsCard />`)

```
+-------------------------------------------------------------+
| +---------------------------------------------------------+ |
| |  [ FOTO DE DESTAQUE / LIVE PERFORMANCE ]                | |
| |  [ BADGE: TURNÊ 2026 ]         [ BADGE: 4 MIN LEITURA ] | |
| +---------------------------------------------------------+ |
|   28 de Agosto, 2026 • Por Gabriel Martins                  |
|                                                             |
|   Paramore confirma gravações em estúdio para novo projeto  |
|   Trio se reúne em Nashville para trabalhar nas primeiras...|
|                                                             |
|   [ Ler matéria completa ➔ ]                                |
+-------------------------------------------------------------+
```

- **Micro-interações:** Ao passar o mouse (`:hover`), a imagem sofre leve zoom suave (`scale(1.04)`), o título ganha a cor de destaque da era (`var(--color-accent-primary)`) e a borda do card acende sutilmente.

---

### 3.3 Módulo de Discografia & Tradutor de Letras Lado a Lado (`<LyricsViewer />`)

Um dos maiores diferenciais pedidos pelos fãs do Paramore Brasil é a possibilidade de ler e cantar junto:

```
+-----------------------------------------------------------------------------------------+
| Álbum: This Is Why (2023)  •  Faixa 06: "Crave"  [ ▶ Tocar Prévia Spotify ]            |
+-----------------------------------------------------------------------------------------+
| [ Letra Original (Inglês) ]              | [ Tradução para Português (Brasil) ]          |
|------------------------------------------|----------------------------------------------|
| I can't wait to see what this turns into | Mal posso esperar para ver no que isso vai dar|
| I already know you'll be on my mind      | Já sei que você não vai sair da minha cabeça |
| I'm feeling through the phantom pain     | Estou sentindo através da dor fantasma        |
| Crave, to swallow up time                | O desejo de devorar o tempo                  |
+-----------------------------------------------------------------------------------------+
| 💡 Nota dos Tradutores: A palavra "Crave" aqui simboliza a urgência visceral de Hayley...|
+-----------------------------------------------------------------------------------------+
```

- **Recurso de Acessibilidade:** Botão de alternância rápida entre "Visualização Lado a Lado" (Desktop) e "Abas Alternadas" (Mobile).

---

### 3.4 Rastreador de Shows & Turnê (`<TourTracker />`)

```
+-----------------------------------------------------------------------------------------+
| 🎸 STATUS DE TURNÊ: PRÓXIMA PARADA NO BRASIL                                            |
|                                                                                         |
|  [ 12 DIAS ] : [ 08 HORAS ] : [ 42 MIN ] : [ 15 SEG ]                                  |
|                                                                                         |
|  São Paulo, SP  •  Allianz Parque                                                       |
|  Data: 10 de Outubro de 2026  •  Abertura dos Portões: 16h00                           |
|                                                                                         |
|  [ 🎟 Comprar Ingressos Oficiais ]   [ 📋 Setlist Provável ]   [ 📍 Guia de Fã no Show ]|
+-----------------------------------------------------------------------------------------+
```

---

## 4. Código de Configuração Pronta: Tailwind CSS Config

Para integrar o Design System com Tailwind CSS num projeto Next.js/React/Vite:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-bg-canvas)',
        surface: {
          1: 'var(--color-bg-surface-1)',
          2: 'var(--color-bg-surface-2)',
          3: 'var(--color-bg-surface-3)',
        },
        accent: {
          DEFAULT: 'var(--color-accent-primary)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          glow: 'var(--color-accent-glow)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        }
      },
      fontFamily: {
        display: ['var(--font-heading)', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 25px var(--color-accent-glow)',
        'punk': '4px 4px 0px #000000',
      },
      borderRadius: {
        'card': 'var(--radius-md)',
      }
    },
  },
  plugins: [],
}
```

---

## 5. Diretrizes de Acessibilidade & Performance

1. **Taxa de Contraste:** Todos os textos principais possuem taxa mínima de contraste de `7:1` contra o fundo escuro (superando o requisito `4.5:1` do nível AAA).
2. **Navegação por Teclado:** Todo link, botão ou elemento interativo exibe um anel de foco visível e bem delineado:
   ```css
   :focus-visible {
     outline: 2px solid var(--color-accent-primary);
     outline-offset: 3px;
   }
   ```
3. **Redução de Movimento:** Animações de transição de era ou rotação de discos de vinil são automaticamente desativadas quando o usuário tiver a opção ativa no sistema operacional:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
