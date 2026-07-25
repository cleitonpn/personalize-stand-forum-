import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base = caminho do repositório no GitHub Pages (só no build de produção)
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/personalize-stand-forum-/' : '/',
  server: { host: true },
}))
