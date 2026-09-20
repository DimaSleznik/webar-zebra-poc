import { defineConfig } from 'vite'

// base './' — чтобы сборка работала из подпапки GitHub Pages
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
})
