import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The base path is passed via --base CLI flag or BASE_URL env var
// GitHub Pages sets it dynamically (e.g. /gravityfit/)
// Normalize: ensure trailing slash (configure-pages outputs e.g. /gravityfit without slash)
const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/');

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base,
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          // Split screens (heaviest modules)
          if (id.includes('/js/screens/')) {
            return 'screens';
          }
          // Keep core + src together (they have circular deps)
          if (id.includes('/js/storage.js') || id.includes('/js/components.js') || id.includes('/src/')) {
            return 'core';
          }
          // Split standalone features
          if (id.includes('/js/bluetooth.js')) {
            return 'bluetooth';
          }
          if (id.includes('/js/gamification.js')) {
            return 'gamification';
          }
          if (id.includes('/js/ai-coach.js')) {
            return 'ai-coach';
          }
          if (id.includes('/js/sync.js')) {
            return 'sync';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@js': '/js',
      '@css': '/css',
      '@screens': '/js/screens',
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      base,
      includeAssets: ['sw.js'],
      manifest: {
        name: 'GravityFit',
        short_name: 'GravityFit',
        description: 'Tu tracker de entrenamiento personal',
        theme_color: '#F5F5F5',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,ico,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-assets',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firebase-sdk',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/html2canvas\.hertzen\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'html2canvas',
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/(api|__)).*/],
      },
    }),
  ],
});
