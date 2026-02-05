import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config
/**
 * Strip `crossorigin` attributes from built HTML.
 * Vite adds these by default for module scripts and preloads, but they break
 * Electron's file:// protocol loading (CORS checks fail on file:// URLs),
 * causing stylesheets and module preloads to silently fail.
 */
const removeCrossOrigin = () => ({
  name: 'remove-crossorigin',
  enforce: 'post',
  transformIndexHtml(html) {
    return html.replace(/ crossorigin/g, '');
  }
});

export default defineConfig({
  plugins: [react(), removeCrossOrigin()],
  root: resolve('src/renderer'),
  base: './',
  css: {
    // Use absolute path so Vite can always locate the config regardless of root
    postcss: resolve(__dirname, 'postcss.config.mjs')
  },
  resolve: {
    alias: {
      // Point '@/...' imports to the src directory to match TypeScript paths
      '@': resolve(__dirname, 'src'),
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