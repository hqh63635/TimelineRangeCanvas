import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function resolvePagesBase(mode: string) {
  if (mode !== 'github-pages') {
    return '/'
  }

  const repository = process.env.GITHUB_REPOSITORY
  const repositoryName = repository?.split('/')[1] || 'TimelineRangeCanvas'

  return `/${repositoryName}/`
}

export default defineConfig(({ command, mode }) => {
  const isLibraryBuild = command === 'build' && mode === 'library'

  return {
    plugins: [vue()],
    base: isLibraryBuild ? '/' : resolvePagesBase(mode),
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
