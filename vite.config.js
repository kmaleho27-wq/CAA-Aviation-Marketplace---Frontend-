import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // registerType=autoUpdate: new SW takes effect on next page load
      // without prompting. For an early-stage solo project, faster
      // iteration > controlled rollouts. Switch to 'prompt' once you
      // have real users and want a "new version available" UX.
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icon.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-512-maskable.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Naluka — Aviation Marketplace',
        short_name: 'Naluka',
        description:
          'Verified aviation parts, personnel, and compliance with escrow + audit trail.',
        theme_color: '#0F1A33',
        background_color: '#0F1A33',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        // SVG for modern browsers (Chrome 87+, Safari 16.4+, Firefox
        // 113+). PNG fallbacks for iOS Safari "Add to Home Screen" and
        // older Android — generated from the SVG by:
        //   node scripts/generate-pwa-icons.mjs   (or `npm run icons`)
        icons: [
          { src: '/icon.svg',              sizes: 'any',     type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg',              sizes: 'any',     type: 'image/svg+xml', purpose: 'maskable' },
          { src: '/icon-192.png',          sizes: '192x192', type: 'image/png',     purpose: 'any' },
          { src: '/icon-512.png',          sizes: '512x512', type: 'image/png',     purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png',     purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the static shell so cold visits while offline still
        // serve the marketing landing.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'naluka-assets',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'naluka-fonts',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Don't intercept Supabase API or Edge Functions — they must
        // hit the network so RLS, JWTs, and live data work correctly.
        navigateFallbackDenylist: [/^\/api/, /^\/functions/, /supabase\.co/],
      },
      devOptions: {
        // Build-only PWA. Avoids fighting Vite HMR during dev.
        enabled: false,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
