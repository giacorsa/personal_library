import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001, // Porta su cui Vite ascolta
    proxy: {
      '/api': 'http://127.0.0.1:3000' // Destinazione delle richieste /api
    }
  }
})
