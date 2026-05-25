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
        theme_color: '#0D0D0D',
        background_color: '#0D0D0D',
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
        globPatterns: ['**/*.{js,css,html,json,svg,ico,png}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-gifs',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
});
