import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // vite-plugin-pwa doesn't serve the manifest/service worker in dev
      // mode by default — enable it so "Add to Home Screen" is testable
      // against the dev server, not just a production build.
      devOptions: {
        enabled: true,
      },
      // Precache build assets only — never add runtime caching rules for
      // /api or /sanctum here, or authenticated responses (invoices,
      // payments) risk being served stale from the cache.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//],
      },
      includeAssets: ['icons/favicon-32.png'],
      manifest: {
        name: 'BasSekolah.my',
        short_name: 'BasSekolah',
        description: "Track your child's school bus, pay bills, and manage enrollment.",
        theme_color: '#ffce1b',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/parent/dashboard',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
