import { defineConfig } from 'vite'


export default defineConfig({
  // ... existing config
  server: {
    watch: {
      ignored: [
        'src-tauri/**',
        '**/store.db',
        'data/store.db',
        '**/data/**',
        '**/target/**'
      ]
    }
  }
})