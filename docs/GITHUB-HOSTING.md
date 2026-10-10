# GitHub hosting and updates

Repository: https://github.com/starcompanytechng-lab/starapp-landing

Website: https://starcompanytechng-lab.github.io/starapp-landing/

GitHub Pages serves the landing page, privacy page, images, fonts, and 3D animation. The existing Cloudflare/Sites backend stores waitlist registrations and privacy requests. GitHub Pages is static hosting and does not run the database or API routes.

## Make an update

1. Edit the files on a branch and open a pull request, or commit directly to `main` for a small approved update.
2. Pull requests run type checks, form-validation tests, and the static build.
3. A push to `main` automatically builds and publishes the website through `.github/workflows/pages.yml`.
4. Check the repository's **Actions** tab for a green deployment before checking the live URL. A manual rerun is also available through **Run workflow**.

The workflow uses GitHub's built-in token and OpenID Connect; no personal access token is required in repository secrets.

## Where to edit

| Change | Files |
| --- | --- |
| Headlines, sections, FAQ, waitlist text | `app/LandingPage.tsx` |
| Layout, colors, typography, responsive styling | `app/globals.css` |
| QR card, sharing, and downloads | `app/components/ShareSection.tsx` |
| QR and share destinations | `lib/share-config.json`, `scripts/generate-qr.py` |
| 3D brand sculpture | `app/components/BrandScene.tsx` |
| Images | `public/assets/` |
| Privacy notice | `app/privacy/page.tsx` |
| Static document metadata and build | `github-pages/`, `vite.pages.config.ts` |
| Signup validation and storage | `lib/waitlist.ts`, `app/api/`, `db/`, `drizzle/` |

## Preview locally

Install Node.js 22.13 or newer, then:

```sh
npm ci
npm run build:pages
npx vite preview --config vite.pages.config.ts --host 127.0.0.1
```

Open the printed address with `/starapp-landing/` appended. Preview form submissions use the configured live backend; use test data only when intentionally verifying storage.

## Backend updates

Visual and content changes publish automatically from GitHub. Database/API changes must also be deployed to the existing Sites project `appgprj_6ac918187b788191ae4afe19d7aeff20` using its source workflow. A GitHub Pages deployment alone does not update the server.

Both form endpoints accept the exact GitHub Pages origin `https://starcompanytechng-lab.github.io`, with no wildcard CORS or browser credentials. The backend must allow public visitors for the public site's forms to work. Stored registrations and privacy requests remain available only through the owner's database tools, with no public read endpoint.

Email delivery is not connected. A successful form submission confirms database storage, not delivery of a confirmation email. Privacy requests require owner review and do not delete registrations automatically.

## Custom domain or repository rename

Update `STARAPP_SITE_ORIGIN` and `STARAPP_BASE_PATH` in the workflow, configure the domain in GitHub's Pages settings, and add the new exact origin to the backend allowlist before deploying. For a domain root, use `/` as the base path. Never put API keys or database credentials in `STARAPP_*` build variables; those values become public browser code.

References: [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## QR and sharing flow

The QR opens `https://starcompanytechng-lab.github.io/starapp-landing/?via=qr#waitlist`. This is the prerendered landing page with an early-access anchor, so it needs no redirect service, login, or installed app. QR visitors see a welcome message without automatically opening their keyboard. The same-device button takes them directly to the form. Successful signups offer a link back to sharing.

Native sharing and copy-link use the matching `?via=share#waitlist` URL. Share-sheet cancellation does not copy anything; clipboard failures reveal a selectable link. The `via` marker selects the welcome treatment only; it does not add analytics or send personal information.

The card offers downloadable PNG and SVG versions. The SVG is preferred for printing. Preserve the white border, square proportions, dark-on-white contrast, and an unobstructed QR surface. Always scan-test at the final printed/displayed size.

Destinations live in `lib/share-config.json`. After changing them, regenerate both assets with `scripts/generate-qr.py` (dependency/setup instructions are in the script), rebuild, and check the decoded destination. Printed QR codes keep their original destination; changing the config cannot update already distributed copies. Keep the existing GitHub URL available or plan redirects before moving domains.

The QR and sharing section can load publicly while the form service remains private. Public registration still requires the owner to authorize public access to the existing Sites backend. A QR scan alone does not register a visitor, send an email, or guarantee early access.
