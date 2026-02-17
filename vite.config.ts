import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5174,
  },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('he-IL')),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
  plugins: [
    react(),
    basicSsl(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Essential: Prevent the Service Worker from intercepting Firebase Auth paths
        navigateFallbackDenylist: [/^\/__\/auth/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        name: 'RapCap - AI Freestyle Coach',
        short_name: 'RapCap',
        description: 'Master your freestyle rap skills with AI',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
