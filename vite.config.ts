import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command, mode }) => {
  const isLibraryBuild = command === 'build' && mode === 'library'

  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    build: isLibraryBuild
      ? {
          cssCodeSplit: false,
          lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: 'VueCanvasTimelineRange',
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.umd.cjs'),
          },
          rollupOptions: {
            external: ['vue'],
            output: {
              exports: 'named',
              globals: {
                vue: 'Vue',
              },
            },
          },
          sourcemap: true,
        }
      : {
          outDir: 'demo-dist',
          sourcemap: true,
        },
  }
})
