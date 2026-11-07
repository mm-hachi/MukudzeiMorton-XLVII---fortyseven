# Dekara Designs portfolio

This self-contained portfolio lives beside the existing Dekara Designs store. It does not replace the store's root `index.html` or bundle. On the existing GitHub Pages project it is served from `/Studio/portfolio/`.

## Run and build

From the Studio repository root on Windows:

```powershell
npm --prefix .\portfolio install
npm --prefix .\portfolio run dev
npm --prefix .\portfolio run build
npm --prefix .\portfolio run check
```

The preview server listens on `http://127.0.0.1:4173/portfolio/`. The build writes the prerendered pages and bundled assets into this folder. Commit the generated HTML, `assets/site.js`, generated concept illustrations and sitemap for the existing root Pages workflow to serve them at `/Studio/portfolio/`.

The implementation uses versioned JSON, Node's built-in filesystem APIs, and esbuild with the repository's existing Three.js dependency. There is no heavy UI framework. `assets/site.js` is the small initial bundle; Three.js/OrbitControls and the PDF writer are separate dynamic chunks loaded only when the visitor opens the 3D view or requests an export.

## Structure

- `data/site.json`, `nav.json`, `theme.json`, `seo.json`: identity and global settings.
- `data/pages/`: home, process and about content.
- `data/pricing.json`, `work.json`, `resources.json`: public catalogs.
- `data/products/dekara-pedestal.json`: product options, dimensions and copy.
- `data/schemas/`: JSON Schema starting point for the product record.
- `scripts/build.mjs`: validates core records, creates 16 deterministic SVG finish variants, prerenders pages and bundles browser modules.
- `src/`: small public interaction layer and lazy 3D/PDF modules.
- `assets/downloads/`: original concept drawing, sample cut-list CSV, brief template and a generated ZIP containing those files.
- `drafts/`: local-only, ignored by Git and never read by the production build.

## Data and visibility

Every public content record has a `version` and `status`. The build includes only `Published` records and builds navigation, work cards, resources, sitemap and the command/search index from those records. Do not put hidden content or private draft assets in tracked `data/`: GitHub Pages serves repository files directly. Hidden items belong in ignored `drafts/`; the editor/prepare flow that will maintain this separation is still to be implemented. `npm run build` does not read `drafts/`.

Primary content (pricing, product options, page copy, work and resources) is editable in JSON. Template structure and some interface labels remain code-owned in this first phase; this is not yet a complete block builder. For a new product, copy the product data shape, set a unique slug, provide three option groups and four gallery views, and add its static route/template mapping in `scripts/build.mjs`. Add work/resources/pricing records to their corresponding JSON files. The current generator has one reusable detailed product page and generic work-detail pages.

## Checks and performance

`npm run check` rebuilds, measures gzip size of the initial JavaScript and CSS against 80 KB/40 KB limits, verifies expected pages and local links, and runs `check:leaks`. Three.js and the PDF writer are intentionally excluded from the initial JS entry. Non-published records in `drafts/data/`, if present, are compared with generated public files and indexes.

This check is not Lighthouse CI and does not establish LCP, INP, CLS, TBT, cross-browser behavior or a Lighthouse score. No Lighthouse result is claimed. Run a Lighthouse audit after deploying the final owner assets and configured endpoint. Performance budgets in the brief remain targets, not measured outcomes.

## Deployment

The existing Studio Pages action publishes the repository root, so it now builds this folder from JSON before uploading the complete site. The portfolio is available at `/Studio/portfolio/`; the root storefront remains the root site. Checkout still enables LFS for the pre-existing demo, but this portfolio uses no LFS-backed asset. `data/site.json` currently uses that project URL; update `baseUrl` and canonical settings if publishing elsewhere.

## Honest limits

The Dekara Pedestal and its original SVGs are concept artwork, not a real item or a production render. Its browser-generated GLB is an interactive concept model. AR is not production-ready until owner-created model assets and a pre-built USDZ are supplied. Quotes and cut lists are marked concept-only and are not manufacturing instructions. The contact form has no endpoint or verified email configured yet; it reports that rather than pretending to send. Owner photo, identity, case study and verified sample deliverables remain TODOs.

The owner-only admin, complete schema-generated editor, media manager, review/prepare UI, ZIP fallback, stale-draft conflict handling and local-only draft workflow are not implemented in this initial phase. See `ADMIN.md` and `CONTENT_TODO.md`.
