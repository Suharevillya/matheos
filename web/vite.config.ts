import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // ponytail: silent update on next load; the spec's update prompt can come later
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Matheos',
        short_name: 'Matheos',
        description: 'Plain-text calculation documents for structural engineers',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#fbfbfa',
        theme_color: '#1f5fbf',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        // Chromium installed PWA: open .mth files from the file manager (docs/spec/pwa.md)
        ...({ file_handlers: [{ action: './', accept: { 'text/plain': ['.mth'] } }] } as object),
      },
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], maximumFileSizeToCacheInBytes: 6_000_000 },
    }),
  ],
  base: './',
  server: { fs: { allow: ['..'] } },
  build: { assetsInlineLimit: 0 },
});
