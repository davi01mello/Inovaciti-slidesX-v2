import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // O shader do login entra por import() dinâmico, então o Vite só o descobre
    // tarde. Pré-bundlar aqui evita o reload de "new dependency optimized" no
    // meio da sessão e o caso do dev server antigo servindo um import quebrado.
    include: ['@paper-design/shaders-react'],
  },
  server: {
    proxy: {
      // Backend (citi-slides-api) roda separado -- ver api/README.md.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
