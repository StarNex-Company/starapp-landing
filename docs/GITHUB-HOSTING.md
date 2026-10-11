# GitHub hosting and updates

Repository: https://github.com/StarNex-Company/starapp-landing

Website: https://starapp.starnex.company/

GitHub Pages serves the landing page, privacy page, images, fonts, and 3D animation. Current signups are submitted to the StarApp team's existing Google Form. The Cloudflare/Sites backend retains earlier signup records and a separate removal-request service. GitHub Pages is static hosting and does not run the database or API routes.

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
| Current signup handoff and Google Form mapping | `app/LandingPage.tsx`, `lib/google-form.ts` |
| Shared email validation and legacy API/storage | `lib/waitlist.ts`, `app/api/`, `db/`, `drizzle/` |

## Preview locally

Install Node.js 22.13 or newer, then:

```sh
npm ci
npm run build:pages
npx vite preview --config vite.pages.config.ts --host 127.0.0.1
```

Open the printed address. Preview signup submissions go to the configured live Google Form in the same tab; use test data only when intentionally verifying storage. Google displays the submission result, and browser Back returns to the landing page.

## Backend updates

Visual and content changes publish automatically from GitHub. Database/API changes must also be deployed to the existing Sites project `appgprj_6ac918187b788191ae4afe19d7aeff20` using its source workflow. A GitHub Pages deployment alone does not update the server.

The legacy signup API and separate privacy API accept the exact site origin `https://starapp.starnex.company`, with no wildcard CORS or browser credentials. The Sites host remains private pending an explicit owner-approved access change, so public privacy submissions are unavailable. Its stored records have no public read endpoint. Deploying source alone does not change the host's audience.

The current signup uses a native HTML form POST to Google Forms and does not depend on Sites access or API CORS. Preserve the existing recipient and entry mapping in `lib/google-form.ts`; verify the live form after changing its questions. Google shows the real confirmation or validation errors. The site does not treat an opaque `no-cors` response as proof of storage. Name, email, role, category, and consent are sent; D1 deduplication and rate limits do not apply to this path.

Email delivery is not connected by this website. An accepted form response does not confirm delivery of email. Privacy requests, once available, require owner review and action in the relevant storage service; they do not delete Google Forms or D1 registrations automatically.

## Custom domain or repository rename

Update `STARAPP_SITE_ORIGIN` and `STARAPP_BASE_PATH` in the workflow, configure the domain in GitHub's Pages settings, and add the new exact origin to the backend allowlist before deploying. For a domain root, use `/` as the base path. Never put API keys or database credentials in `STARAPP_*` build variables; those values become public browser code.

References: [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## QR and sharing flow

The QR opens `https://starapp.starnex.company/?via=qr#waitlist`. This is the prerendered landing page with an early-access anchor, so it needs no redirect service, login, or installed app. QR visitors see a welcome message without automatically opening their keyboard. The same-device button takes them directly to the form. Submitting takes them to Google Forms for the result; browser Back returns to StarApp, where sharing remains available.

Native sharing and copy-link use the matching `?via=share#waitlist` URL. Share-sheet cancellation does not copy anything; clipboard failures reveal a selectable link. The `via` marker selects the welcome treatment only; it does not add analytics or send personal information.

The card offers downloadable PNG and SVG versions. The SVG is preferred for printing. Preserve the white border, square proportions, dark-on-white contrast, and an unobstructed QR surface. Always scan-test at the final printed/displayed size.

Destinations live in `lib/share-config.json`. After changing them, regenerate both assets with `scripts/generate-qr.py` (dependency/setup instructions are in the script), rebuild, and check the decoded destination. Printed QR codes keep their original destination; changing the config cannot update already distributed copies. Keep the existing GitHub URL available or plan redirects before moving domains.

The QR, sharing section, and Google Forms signup are independent of the private Sites audience. The separate removal-request service still needs explicit owner approval for public access. A QR scan alone does not register a visitor, send an email, or guarantee early access.
