# Frame Calculator 🖼️

Calculadora interativa de venda de quadros com preview visual em tempo real.

## Stack

- **React** 18 - UI
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **JavaScript** - Logic

## Funcionalidades Planejadas

### Fase 1: MVP - Frame Preview
- [x] Setup Vite + React + Tailwind
- [ ] **FramePreview** - Componente visual do quadro
  - Renderizado com <div> e CSS puro
  - Moldura com texturas de madeira (gradients + filtros SVG)
  - Efeito de vidro/película (opacity, backdrop-filter, reflexo)
  - Sombra realista 3D
  - Suporte a múltiplos tamanhos padrão (A4, A3, 20x30cm, 30x40cm, custom)
  - Tipos de madeira: Pinho, Ipê, Mogno, Branco, Preto
  - Atualiza em tempo real conforme mudanças

### Fase 2: Configurador
- [ ] **FrameConfigurator** - Painel de seleção
  - Dropdown de tamanhos
  - Dropdown de madeiras com preview de cor
  - Slider de grossura da moldura (2-10cm)
  - Dropdown de vidro/película (Vidro comum, Vidro UV, Acrílico, Sem vidro)
  - Input numérico de quantidade
  - Botão "Adicionar ao orçamento"

### Fase 3: Orçamento
- [ ] **BudgetList** - Tabela/cards dos itens
  - Lista de quadros adicionados
  - Editar quantidade de cada item
  - Remover itens
  - Cálculo de subtotal por item
  - Total geral
  - Desconto (opcional)

### Fase 4: Lógica de Preços
- [ ] Sistema de preços dinâmico
  - Tabela de preços base por tamanho
  - Adicionais por tipo de madeira
  - Adicionais por vidro/película
  - Grossura da moldura influencia preço
  - Desconto por quantidade

### Fase 5: Polish
- [ ] Responsividade mobile
- [ ] Temas (light/dark)
- [ ] Salvar orçamento (localStorage)
- [ ] Exportar como PDF/imagem
- [ ] Animações sutis

## Setup Local

\\\ash
npm install
npm run dev
\\\

Acessa em \http://localhost:5173\

## Build

\\\ash
npm run build
\\\

Gera em \dist/\ com base URL \/frame-calculator/dist/\ pronto para GitHub Pages.

## Estrutura de Componentes

\\\
src/
├── components/
│   ├── FramePreview.jsx        # Preview visual do quadro
│   ├── FrameConfigurator.jsx   # Painel de seleção
│   ├── BudgetList.jsx          # Tabela de orçamento
│   └── *.css                   # Estilos específicos
├── App.jsx                      # Root component
├── App.css
├── index.css                    # Tailwind + globals
└── main.jsx
\\\

## Próximos Passos

1. ✅ Setup projeto
2. ⏳ Implementar **FramePreview** com texturas de madeira e efeitos
3. ⏳ Implementar **FrameConfigurator** com seletores
4. ⏳ Implementar **BudgetList** com cálculos
5. ⏳ Integrar preços dinâmicos

---

**Estado atual:** Hello World ✨ — Pronto para primeira feature
