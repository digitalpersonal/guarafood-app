import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRUCIAL para Electron: garante caminhos relativos
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});