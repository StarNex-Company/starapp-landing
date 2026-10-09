import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const configFile = fileURLToPath(new URL('../vite.pages.config.ts', import.meta.url));
const ssrDirectory = fileURLToPath(new URL('../.sites-runtime/pages-ssr/', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist-pages/', import.meta.url));
process.chdir(projectRoot);

// Pre-render both public pages at build time; no server is needed on GitHub Pages.
await build({
  configFile,
  publicDir: false,
  build: {
    ssr: fileURLToPath(new URL('./render.tsx', import.meta.url)),
    outDir: ssrDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./render.tsx', import.meta.url)),
      output: { entryFileNames: 'render.mjs' },
    },
  },
});
const { render } = await import(pathToFileURL(`${ssrDirectory}/render.mjs`).href);
await build({ configFile });
for (const [page, file] of [['home', 'index.html'], ['privacy', 'privacy/index.html']]) {
  const path = `${outputDirectory}/${file}`;
  const html = await readFile(path, 'utf8');
  if (!html.includes('<!--starapp-prerender-->')) throw new Error(`Prerender marker is missing in ${file}.`);
  await writeFile(path, html.replace('<!--starapp-prerender-->', () => render(page)));
}
await mkdir(outputDirectory, { recursive: true });
await writeFile(`${outputDirectory}/.nojekyll`, '');
console.log('StarApp GitHub Pages build complete: dist-pages (home and privacy prerendered).');
