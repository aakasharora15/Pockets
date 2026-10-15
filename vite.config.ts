import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

/** Short commit id of this build, shown in Settings › About so a phone's version can be identified. */
function buildId(): string {
  // BUILD_SHA is the commit being deployed (set by the Deploy workflow, which runs after CI).
  const sha = process.env.BUILD_SHA || process.env.GITHUB_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
}

const BUILD = buildId();

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    // version.json says which build is live. It isn't precached, so an installed copy can compare
    // itself with it and refresh if it's fallen behind (see src/lib/freshness.ts).
    {
      name: 'spendr-version-file',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: pkg.version, build: BUILD }) });
      },
    },
    VitePWA({
      // We choose when a downloaded update takes over (see src/main.tsx), so it never reloads mid-use.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon-180.png', 'icons/spendr-icon-dark.svg'],
      manifest: {
        name: 'Spendr',
        short_name: 'Spendr',
        description: 'Track your own spending, and share a Pocket with the people you live with. In any currency.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0C0E',
        theme_color: '#0B0C0E',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // The receipt reader is large and optional: fetched the first time it's used, then cached.
        globIgnores: ['ocr/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'spendr-ocr', expiration: { maxEntries: 10 } },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Libraries change far less often than the app: in their own files, an update only
        // re-downloads Spendr's code. Firebase is most of the start-up weight.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](@firebase|firebase|re2js)[\\/]/.test(id)) return 'firebase';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|@remix-run|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/]@phosphor-icons[\\/]/.test(id)) return 'icons';
          return undefined;
        },
      },
    },
  },
});
