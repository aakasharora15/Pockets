import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['fonts/Involve-VF.ttf', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Pockets',
        short_name: 'Pockets',
        description: 'Track your own spending, and share a Pocket with the people you live with. In any currency.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#05080F',
        theme_color: '#0A2A55',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ttf,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', sourcemap: true },
});
