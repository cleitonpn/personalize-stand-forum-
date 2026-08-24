import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O Studio é servido pela raiz do Firebase Hosting (não é subpasta como o
// protótipo do Fórum no GitHub Pages), então base fica sempre em '/'.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 4500 },
  build: {
    // Os modelos .glb são grandes e o three/firebase já pesam sozinhos;
    // separar em chunks evita um bundle único gigante.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
