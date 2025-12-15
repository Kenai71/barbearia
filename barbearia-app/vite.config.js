import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react' 

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Remove a seção de build customizada que não é mais necessária
  // build: {
  //   rollupOptions: {
  //     input: {
  //       main: './index.html',
  //       'service-worker': './src/service-worker.js', 
  //     }
  //   }
  // }
})