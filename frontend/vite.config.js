import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Configurazione del proxy per lo sviluppo
    proxy: {
      // Reindirizza tutte le chiamate che iniziano con /api
      // al server backend Flask che gira sulla porta 5001.
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
})