import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const baseSegment = (process.env.STARAPP_BASE_PATH ?? '/starapp-landing/').replace(/^\/+|\/+$/g, '');
const base = baseSegment ? `/${baseSegment}/` : '/';
const apiOrigin = process.env.STARAPP_API_ORIGIN ?? 'https://starapp-world-stage.bold-crab-5018.chatgpt.site';
const siteOrigin = process.env.STARAPP_SITE_ORIGIN ?? 'https://starcompanytechng-lab.github.io';
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
    outDir: fromRoot('./dist-pages/'),
    emptyOutDir: true,
    rollupOptions: {
      input: { home: fromRoot('./github-pages/index.html'), privacy: fromRoot('./github-pages/privacy/index.html') },
    },
  },
});
