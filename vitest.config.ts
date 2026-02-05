import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/__test__/setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.vite/**',
      'src/electron/**',
      'src/main.ts',
      'src/preload.ts',
      'tasky-mcp-agent/**',
    ],
    globals: true,
  },
});
