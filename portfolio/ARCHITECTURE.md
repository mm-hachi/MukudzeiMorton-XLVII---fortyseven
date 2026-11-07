# Architecture

## Public build

The folder is a static subsite alongside the existing Dekara store. JSON under `data/` is read by `scripts/build.mjs`; Node renders shared HTML shells for home, service, work, product, resource, process, about and contact routes. The generator filters published records before creating cards, navigation, sitemap and `assets/public-index.json`. It never reads `drafts/`.

The build produces clean, nested URLs in this folder and bundles `src/site.js` with esbuild. The public entry handles menus, theme, currency, work/resource filters, the contact facade and product selection. Product selection is encoded in the URL hash so a configuration can be shared.

## Product configurator

`data/products/dekara-pedestal.json` defines option groups, labels, prices, dimensions, features and specifications. The build deterministically maps the 4 cabinet colours × 2 timber options × 2 handles to 16 generated SVG variants. No Timbur image, name, model or logo is reused.

`src/site.js` downloads no 3D code until the visitor chooses 3D or an export. It then imports `src/product-viewer.js`, which creates a simple original procedural cabinet model with Three.js and OrbitControls. The same module exports a concept GLB. This is not a production model, native AR session or iOS Quick Look USDZ.

The quote/cut-list buttons import `src/pdf-export.js` only on request. Their output is marked concept-only, not an offer or manufacturing instruction.

## Current boundaries

This phase does not include static prerendering from arbitrary admin-created page blocks, full JSON-Schema-driven forms, a live same-template admin preview, browser draft persistence, IndexedDB uploads, version conflict handling, review diffs, folder/ZIP prepare, self-hosted model-viewer, prebuilt USDZ, service worker, Lighthouse CI or cross-browser test automation. The root Studio storefront and its source stay unchanged.

The owner-only Workshop is not a security boundary. A future implementation must disclose that it is client-side convenience only; only reviewed local files committed and pushed by the owner can change the public site.
