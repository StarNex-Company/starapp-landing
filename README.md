# StarApp prelaunch website

A standalone marketing website for StarApp, based on the supplied product document and campaign assets. It includes a custom Three.js rendering of the supplied brand mark, responsive product storytelling, an early-access form, and a privacy notice. The separate privacy-removal service remains private pending access configuration. This project is independent of Olympus.

Public frontend: [StarApp on GitHub Pages](https://starapp.starnex.company/). Pushes to `main` automatically publish frontend updates. See [GitHub hosting and updates](docs/GITHUB-HOSTING.md) for the editing guide, local static preview, and the separate backend deployment process.

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

The public signup form sends the visitor's name, email, audience, talent category, and consent version to the existing Google Form configured in `lib/google-form.ts`. An ordinary HTML form POST navigates to Google Forms in the same tab, so Google displays its actual confirmation or validation errors. The site does not infer successful storage from an unreadable cross-origin response. The optional talent field is normalized to `Other`; local validation and a hidden honeypot run before the handoff.

Current responses are managed in the StarApp team's Google Form. This flow does not use D1 deduplication or the legacy signup endpoint's rate limits. Keep the configured form recipient and entry IDs aligned with the live form; a changed required question can prevent acceptance. Email delivery and double opt-in are not configured by this website. Google's confirmation does not prove that an email was sent or ownership was verified. The StarApp team remains responsible for consent-respecting launch communications.

The legacy `POST /api/waitlist` route and `waitlist_entries` table remain for earlier registrations; the current landing-page signup does not call them. That route validates JSON, deduplicates email and audience, and enforces bounded bodies and daily hashed-IP limits. The site owner can inspect existing D1 records through Sites database tools. There is no public registration-list endpoint.

The separate `POST /api/privacy` route records removal requests in `privacy_requests` with a pending status and deduplicates repeated pending requests. Its Sites host remains private, so the public removal form is currently unavailable; the notice discloses this. Enabling that service requires an explicit owner-approved access change and live verification. Once requests can be received, the owner should review them, verify address ownership where appropriate, act on records in the relevant storage service, and mark the request completed. Recording a request does not delete data from Google Forms or D1, and does not send email. The privacy endpoint stores temporary rate-limit digests separately and removes older dates as requests arrive.

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
node --test tests/waitlist.test.mjs tests/google-form.test.mjs
npm run build
```

Before publishing a signup change, verify the actual Google Forms handoff and response, field mapping, client validation, and return navigation. Also check tab/FAQ controls, mobile navigation, reduced motion, viewport sizing, and accessibility. Legacy API/database checks are separate from the public Google Forms signup. QA evidence is checkout-local in ignored `.sites-runtime/qa/`.

Useful references: [Three.js](https://threejs.org/docs/), [W3C form accessibility](https://www.w3.org/WAI/tutorials/forms/), and [Web Vitals](https://web.dev/articles/vitals).

## Hosting and ownership

The tracked hosting manifest is bound to `appgprj_6ac918187b788191ae4afe19d7aeff20`. Preserve that identity when updating. GitHub Pages hosts the public frontend at `https://starapp.starnex.company/`; Google Forms receives current signups. The Sites project retains the legacy APIs and database. Its audience remains private pending explicit owner approval, affecting public privacy requests but not the Google Forms handoff. Changing website access does not create a public database-read endpoint.
