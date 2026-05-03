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
      includeAssets: ['favicon.ico'],
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
        // ICONS LEFT EMPTY ON PURPOSE — needs a 512x512 PNG source.
        // To add: drop public/icon-source.png (512x512), run
        //   npx @vite-pwa/assets-generator --preset minimal-2023 public/icon-source.png
        // then add the generated icons to this array. Until then,
        // Lighthouse complains but the SW still works and the app is
        // still installable on most browsers via the address-bar menu.
        icons: [],
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
