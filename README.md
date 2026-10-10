# StarApp prelaunch website

A standalone marketing website for StarApp, based on the supplied product document and campaign assets. It includes a custom Three.js rendering of the supplied brand mark, responsive product storytelling, an early-access list, a privacy notice, and privacy-removal requests. This project is independent of Olympus.

Public frontend: [StarApp on GitHub Pages](https://starnex-company.github.io/starapp-landing/). Pushes to `main` automatically publish frontend updates. See [GitHub hosting and updates](docs/GITHUB-HOSTING.md) for the editing guide, local static preview, and the separate backend deployment process.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

The default development URL is printed by Vinext (normally localhost:5173). Use `npm run dev -- --port 5178 --hostname 127.0.0.1` to choose a port. The portable development profile is stored in ignored `.sites-runtime/`; when cloning outside Sites, run its profile configuration helper if the profile has not yet been configured.

## Database and builds

Cloudflare D1 is declared as `DB` in `.openai/hosting.json`. The database schema is in `db/schema.ts`; committed migrations are in `drizzle/`. Generate a new migration after a schema change with `npm run db:generate`. Never rewrite an applied migration.

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_early_onslaught.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_strange_ego.sql
```

Apply each migration once to a new local database, in order. The local database is separate from hosting. Sites provisions the hosted binding and applies committed migrations during deployment. Publish using the Sites source workflow to preserve the exact pushed source and its build artifact.

## Early-access operations

`POST /api/waitlist` saves an email, audience, talent category, consent version, and signup time. Email and audience are unique together. Duplicate requests return the same success response and do not create another record. The optional talent field is normalized to `Other` by the form. Validation, explicit allowed-origin JSON enforcement, a bounded body, a honeypot, and daily hashed-IP limits are enforced server-side.

Registrations are held in the private `waitlist_entries` database table. The site owner can inspect and export these through the Sites database tools. There is no publicly readable registration endpoint. Email delivery and double opt-in are not configured: signup confirms storage, not an email being sent or ownership verification. The StarApp team remains responsible for consent-respecting launch communications.

`POST /api/privacy` records requests for removal in `privacy_requests`, with a pending status. Repeated pending requests are deduplicated. The owner should review them, verify address ownership where appropriate, act on the request, and mark it completed. Recording a request does not automatically delete records or send an email. Temporary rate-limit digests are stored separately and older dates are removed as requests arrive.

## Design and assets

- The supplied cobalt and white identity is preserved.
- The brand mark was traced to a reusable SVG and extruded into a real Three.js sculpture.
- The scene pauses offscreen, in hidden tabs, under reduced-motion preferences, or with the footer motion toggle. A static brand mark remains available when WebGL fails.
- Optimized WebP variants are under `public/assets/`. Original files in Downloads were not modified.
- Asset provenance and source hashes are in `docs/asset-manifest.json`. `scripts/prepare-assets.py` reproduces optimization and brand tracing from the original source files.
- Campaign metrics, people, rewards, and screens are illustrative. The page does not claim existing users, launched applications, confirmed prizes, or guaranteed opportunities.
- Local Manrope font files avoid a third-party font request.

## Checks

```sh
npx tsc --noEmit --incremental false
node --test tests/waitlist.test.mjs
npm run build
```

Browser verification covers the real local API/database, duplicate submissions, invalid requests, friendly service failures, tab/FAQ controls, mobile navigation, reduced motion, five viewport widths, and accessibility. QA evidence is checkout-local in ignored `.sites-runtime/qa/`.

Useful references: [Three.js](https://threejs.org/docs/), [W3C form accessibility](https://www.w3.org/WAI/tutorials/forms/), and [Web Vitals](https://web.dev/articles/vitals).

## Hosting and ownership

The tracked hosting manifest is bound to `appgprj_6ac918187b788191ae4afe19d7aeff20`. Preserve that identity when updating. GitHub Pages hosts the public frontend; the Sites project hosts its form APIs and database. Public form access requires public backend access, while database records remain private. No custom domain is configured.
