import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        'src-tauri/**',
        '**/store.db',
        'data/store.db',
        '**/data/**',
        '**/target/**',
        'public/**/*.html',
        '!public/vite.svg',
        'web-dist-mac/**'
      ]
    }
  },
  publicDir: 'public'
})