import { defineConfig } from 'vite';
import { resolve } from 'path';

// Configuration for bundling electron modules
export default defineConfig({
  build: {
    lib: {
      entry: {
        main: 'src/main.ts',
        preload: 'src/preload.ts',
        scheduler: 'src/electron/scheduler.ts',
        storage: 'src/electron/storage.ts',
        assistant: 'src/electron/assistant.ts',
        'assistant-script': 'src/electron/assistant-script.ts',
        'assistant-preload': 'src/electron/assistant-preload.ts'
      },
      formats: ['cjs']
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-squirrel-startup',
        'node-cron',
        'electron-store',
        'yaml',
        'xml2js',
        'sound-play',
        'child_process',
        'path',
        'fs',
        'fs/promises',
        'os',
        'util'
      ],
      output: {
        dir: '.vite/build',
        format: 'cjs',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        manualChunks: undefined,
        inlineDynamicImports: false
      }
    },
    outDir: '.vite/build',
    emptyOutDir: true,
    target: 'node18'
  },
  resolve: {
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext']
  }
});