// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5500
  },
  base: './',
  resolve: {
    alias: {
      'firebase/app': 'firebase/app',
      'firebase/firestore': 'firebase/firestore'
    }
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'xlsx']
  }
});