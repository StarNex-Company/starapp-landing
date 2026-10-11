import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const baseSegment = (process.env.STARAPP_BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '');
const base = baseSegment ? `/${baseSegment}/` : '/';
const apiOrigin = process.env.STARAPP_API_ORIGIN ?? 'https://starapp-world-stage.bold-crab-5018.chatgpt.site';
const siteOrigin = process.env.STARAPP_SITE_ORIGIN ?? 'https://starapp.starnex.company';
const siteUrl = new URL(base, siteOrigin).href;

for (const [name, value] of [['STARAPP_API_ORIGIN', apiOrigin], ['STARAPP_SITE_ORIGIN', siteOrigin]]) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, a path, or query parameters.`);
  }
}

export default defineConfig({
  root: fromRoot('./github-pages/'),
  base,
  publicDir: fromRoot('./public/'),
  plugins: [
    react(),
    // Older phones (iOS Safari 12+, Android Chrome 64+, Samsung Internet) get syntax lowered and missing APIs
    // polyfilled; browsers without module support load a separate legacy bundle.
    legacy({
      targets: ['defaults', 'iOS >= 10', 'Safari >= 10', 'Chrome >= 49', 'Firefox >= 52', 'Samsung >= 5', 'not IE 11'],
      modernTargets: ['iOS >= 12', 'Safari >= 12', 'Chrome >= 64', 'Edge >= 79', 'Firefox >= 67', 'Samsung >= 9'],
      modernPolyfills: true,
    }),
    {
      name: 'starapp-pages-metadata',
      transformIndexHtml(html) {
        return html.replaceAll('__STARAPP_SITE_URL__', siteUrl).replaceAll('__STARAPP_BASE_URL__', base);
      },
    },
  ],
  resolve: { alias: { '@': projectRoot } },
  define: {
    __STARAPP_BASE_PATH__: JSON.stringify(base),
    __STARAPP_API_ORIGIN__: JSON.stringify(apiOrigin.replace(/\/+$/, '')),
  },
  build: {
    // Lower modern CSS (oklch, color-mix, nesting) for the same older Safari versions.
    cssTarget: ['safari12', 'ios12', 'chrome64', 'edge79', 'firefox67'],
    outDir: fromRoot('./dist-pages/'),
    emptyOutDir: true,
    rollupOptions: {
      input: { home: fromRoot('./github-pages/index.html'), privacy: fromRoot('./github-pages/privacy/index.html') },
    },
  },
});
