import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  root: resolve('src/renderer'),
  base: './',
  css: {
    // Use absolute path so Vite can always locate the config regardless of root
    postcss: resolve(__dirname, 'postcss.config.mjs')
  },
  resolve: {
    alias: {
      // Point '@/...' imports to the renderer source directory
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve('src/renderer/index.html'),
      output: {
        manualChunks: {
          // Split out large vendor libs to reduce main bundle size
          react: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
  server: {
    port: 3000
  }
});