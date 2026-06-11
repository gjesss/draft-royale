import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // logo.png (467KB original) intentionally NOT precached — nothing references it.
      includeAssets: ['logo-192.png', 'logo-512.png'],
      manifest: {
        name: 'Draft Royale',
        short_name: 'DraftRoyale',
        description: 'Fantasy sports draft order game — defend your pick!',
        theme_color: '#0B0E11',
        background_color: '#0B0E11',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: Firebase + React rarely change, so installed
        // PWAs only re-download the small app chunk on each deploy.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
