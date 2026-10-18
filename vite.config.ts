import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['better-sqlite3', 'electron'],
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
              '@main': resolve(__dirname, 'src/main'),
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
          },
        },
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: 'dist/renderer',
  },
})
