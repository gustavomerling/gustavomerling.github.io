/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
      },
      fontFamily: {
        fraunces: ['Fraunces', 'Georgia', 'serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-1.2px',
        tight: '-0.96px',
        snug: '-0.48px',
      },
    },
  },
  plugins: [],
}
