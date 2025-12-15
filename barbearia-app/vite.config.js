import { defineConfig } from 'vite' //
import react from '@vitejs/plugin-react' //

// https://vite.dev/config/ //
export default defineConfig({
  plugins: [react()], //
  // Adiciona a configuração de build para o Service Worker
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        // Adiciona o Service Worker como um entry point separado
        'service-worker': './src/service-worker.js', 
      }
    }
  }
})