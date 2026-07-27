# Color Palette — Encantalar Identity

Paleta de cores oficial extraída do guia de identidade visual Encantalar.

## Cores Principais

```css
--roxo: #6B2E8C;              /* Logo, H1, títulos de destaque */
--roxo-suave: #9B87F5;        /* Detalhe em gradiente radial */
--verde: #1D7870;             /* Eyebrows, links, botão secundário */
--verde-escuro: #17635C;      /* Texto sobre fundo claro / hover */
--escuro: #0F172A;            /* Botão primário, alto contraste */
--escuro-2: #020817;          /* Texto muito escuro */
--whatsapp: #25D366;          /* CTA de contato / WhatsApp */
--lilas-bg: #E5D8F0;          /* Fundos decorativos, blobs */
--lilas-bg-suave: #F5F0F9;    /* Fundo de badges/pills */
--cinza-texto: #4B5563;       /* Parágrafos, texto secundário */
--cinza-claro: #F9FAFB;       /* Fundo de seções alternadas / cards */
--branco: #FFFFFF;            /* Branco puro */
```

## Tailwind Config

```javascript
// tailwind.config.js
colors: {
  roxo: {
    600: '#6B2E8C',
    400: '#9B87F5',
  },
  verde: {
    600: '#1D7870',
    700: '#17635C',
  },
  escuro: {
    900: '#0F172A',
    950: '#020817',
  },
  lilas: {
    100: '#F5F0F9',
    200: '#E5D8F0',
  },
  whatsapp: '#25D366',
  cinza: {
    texto: '#4B5563',
    claro: '#F9FAFB',
  },
}
```

## Tipografia

Três famílias combinadas:

- **Fraunces** (serifada, expressiva) — H2, H3, títulos
- **Plus Jakarta Sans** — H1, marca
- **Inter** — corpo de texto, links, UI

### Escala de Tipografia

| Uso | Família | Tamanho | Weight | Letter-spacing |
|-----|---------|---------|--------|-----------------|
| H1 | Plus Jakarta Sans | 44px | 700 | -1.2px |
| H2 | Fraunces | 38px | 800 | -0.96px |
| H3 | Fraunces | 22px | 800 | -0.48px |
| Eyebrow | Inter | 14px | 600 | - |
| Corpo | Inter | 16px | 400 | - |
| Link | Inter | 14px | 500 | - |

## Componentes

### Botões
- **Border radius**: 10-12px
- **Padding primário**: 16px 24px
- **Padding WhatsApp**: 10px 16px

### Cards
- **Border radius**: 16px
- **Background**: Cinza claríssimo (#F9FAFB)
- **Border**: 1px solid #eee

### Pills/Badges
- **Border radius**: 999px (pill shape)
- **Background**: Lilás suave (#F5F0F9)
- **Cor texto**: Roxo (#6B2E8C)
- **Border**: 1px solid #E5D8F0

---

**Fonte**: Guia de Estilos — Encantalar (encantalar.com.br)
