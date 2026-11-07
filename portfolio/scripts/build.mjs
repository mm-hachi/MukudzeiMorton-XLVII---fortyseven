import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (name) => JSON.parse(await readFile(path.join(root, 'data', name), 'utf8'));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const jsonForHtml = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
const visible = (item) => item?.status === 'Published' &&
  (!item.publishFrom || Date.parse(item.publishFrom) <= Date.now());
const prefix = (depth) => '../'.repeat(depth);
const href = (value, depth) => /^(?:https?:|mailto:|tel:|#|\/)/.test(value)
  ? value
  : `${prefix(depth)}${value}`;
const image = (value, depth) => `${prefix(depth)}${value}`;
const crc32 = (contents) => {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const makeZip = (entries) => {
  const localRecords = [];
  const centralRecords = [];
  let offset = 0;
  for (const [filename, contents] of entries) {
    const name = Buffer.from(filename, 'utf8');
    const data = Buffer.from(contents);
    const checksum = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localRecords.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralRecords.push(central);
    offset += local.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralRecords);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localRecords, centralDirectory, end]);
};

const [site, nav, seo, theme, home, processPage, about, pricing, workData, resourcesData, product] =
  await Promise.all([
    read('site.json'), read('nav.json'), read('seo.json'), read('theme.json'),
    read('pages/home.json'), read('pages/process.json'), read('pages/about.json'),
    read('pricing.json'), read('work.json'), read('resources.json'),
    read('products/dekara-pedestal.json')
  ]);
if (!visible(site)) throw new Error('The site data is not Published.');
for (const [label, value] of Object.entries({ pricing, nav, seo, theme, home, processPage, about, resourcesData, workData, product })) {
  if (!Number.isInteger(value.version) || value.version < 1) throw new Error(`${label} must declare a positive integer version.`);
}
const allowedStatus = new Set(['Published', 'Hidden', 'Unlisted']);
for (const item of [...workData.items, ...resourcesData.items, ...nav.items, ...pricing.tracks.flatMap((track) => track.packages)]) {
  if (!allowedStatus.has(item.status)) throw new Error(`Invalid visibility status for ${item.id || item.title || item.label}.`);
  if (item.status !== 'Published') {
    throw new Error(`Non-published item "${item.id || item.title || item.label}" must stay in ignored drafts/, not deployable data/.`);
  }
}
if (product.gallery.length !== 4) throw new Error('Each product must define exactly four gallery views.');
if (product.optionGroups.length !== 3 || product.optionGroups.some((group) => group.options.length === 0)) {
  throw new Error('The current product template expects three non-empty option groups.');
}

const work = workData.items.filter(visible);
const resources = resourcesData.items.filter(visible);
const menu = nav.items.filter(visible);
const cta = visible(nav.cta) ? nav.cta : null;
const tracks = pricing.tracks.map((track) => ({
  ...track, packages: track.packages.filter(visible)
})).filter((track) => track.packages.length);
if (!visible(product)) throw new Error('The Dekara concept product is not Published.');

const productVariants = [];
for (const cabinet of product.optionGroups[0].options) {
  for (const timber of product.optionGroups[1].options) {
    for (const handle of product.optionGroups[2].options) {
      productVariants.push({
        cabinet: cabinet.id,
        timber: timber.id,
        handle: handle.id,
        path: `assets/renders/dekara-pedestal-${timber.id}-${cabinet.id}-${handle.id}-1200.svg`
      });
    }
  }
}

const svg = ({ cabinet = '#e9e5dd', timber = '#caa878', handle = '#b29a6d', view = 'front' } = {}) => {
  const body = `<g stroke="#383832" stroke-opacity=".16" stroke-width="2">
    <path d="M288 284h224l-10 205H298z" fill="${cabinet}"/>
    <path d="M298 489h204l-17 28H315z" fill="#000" opacity=".08"/>
    <path d="M303 517l-10 84h17l19-84m128 0 18 84h17l-10-84" fill="${timber}"/>
    <path d="M288 284l28-28h221l-25 28z" fill="${timber}"/>
    <path d="M512 284l25-28v205l-25 28z" fill="#000" opacity=".08"/>
    <path d="M350 351h100" stroke="${handle}" stroke-width="12" stroke-linecap="round"/>
    <circle cx="351" cy="351" r="4" fill="${handle}" stroke="none"/>
    <circle cx="449" cy="351" r="4" fill="${handle}" stroke="none"/>
  </g>`;
  const transforms = {
    front: 'translate(0 0)',
    'three-quarter': 'translate(0 0) skewY(-2)',
    open: 'translate(0 0)',
    detail: 'translate(-110 -70) scale(1.34)'
  };
  const extra = view === 'open'
    ? '<path d="M314 375h172v90H314z" fill="#f2eee7" stroke="#383832" stroke-opacity=".16"/><path d="M326 381v77m145-77v77" stroke="#b6ae9f" stroke-width="4"/>'
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 720" role="img" aria-label="Original Dekara Pedestal concept illustration"><defs><radialGradient id="bg"><stop stop-color="#fff"/><stop offset="1" stop-color="#efeee9"/></radialGradient><filter id="shadow" x="-40%" y="-40%" width="180%" height="200%"><feGaussianBlur stdDeviation="17"/></filter></defs><rect width="800" height="720" fill="url(#bg)"/><ellipse cx="400" cy="600" rx="184" ry="28" fill="#222" opacity=".12" filter="url(#shadow)"/><g transform="${transforms[view] || transforms.front}">${body}${extra}</g><path d="M185 625h430" stroke="#b6b4ad" stroke-width="1"/><path d="M185 619v12m430-12v12" stroke="#b6b4ad"/><text x="400" y="654" text-anchor="middle" fill="#78786f" font-family="Arial,sans-serif" font-size="12" letter-spacing="3">DEKARA · CONCEPT STUDY</text></svg>`;
};

const write = async (rel, contents) => {
  const full = path.join(root, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents);
};
const writeAsset = async (rel, contents) => write(rel, contents);
const renderVariantAssets = async () => {
  const out = path.join(root, 'assets', 'renders');
  await mkdir(out, { recursive: true });
  for (const variant of productVariants) {
    const option = product.optionGroups;
    const c = option[0].options.find((item) => item.id === variant.cabinet);
    const t = option[1].options.find((item) => item.id === variant.timber);
    const h = option[2].options.find((item) => item.id === variant.handle);
    const colors = { cabinet: c.color, timber: t.color, handle: h.color };
    const base = `assets/renders/dekara-pedestal-${variant.timber}-${variant.cabinet}-${variant.handle}-1200`;
    await writeAsset(`${base}.svg`, svg(colors));
    for (const gallery of product.gallery) {
      await writeAsset(`${base}-${gallery.view}.svg`, svg({ ...colors, view: gallery.view }));
    }
  }
  const cards = {
    'dekara-pedestal-hero.svg': svg(),
    'studio-modules.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f0efea"/><g fill="#c6b8a4" stroke="#817563"><rect x="175" y="190" width="190" height="130" rx="8"/><rect x="366" y="190" width="170" height="130" rx="8"/><rect x="535" y="190" width="90" height="130" rx="8"/></g><path d="M170 341h463m-430 0v55m350-55v55" stroke="#746754" stroke-width="9"/><text x="400" y="460" text-anchor="middle" fill="#67665f" font-family="Arial" font-size="15" letter-spacing="3">MODULAR CONFIGURATOR · CONCEPT</text></svg>',
    'revit-family.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f0efea"/><path d="M220 310h340M265 310V190h250v120m-215 0v85m180-85v85" fill="none" stroke="#464740" stroke-width="4"/><path d="M220 385h340M220 375v20m340-20v20M590 190v120m-10-120h20m-20 120h20" stroke="#89745d" stroke-width="2"/><text x="400" y="455" text-anchor="middle" fill="#67665f" font-family="Arial" font-size="15" letter-spacing="3">REVIT FAMILY · SAMPLE SCOPE</text></svg>',
    'shop-drawing.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f0efea"/><rect x="158" y="80" width="484" height="350" fill="#fff" stroke="#777" stroke-width="2"/><path d="M203 357h150V190H203zm208 0h175V190H411zm0-167 80-50 97 50m-385 18h150m-150 78h150M432 230h133m-133 40h133" fill="none" stroke="#4e504b" stroke-width="3"/><text x="400" y="465" text-anchor="middle" fill="#67665f" font-family="Arial" font-size="15" letter-spacing="3">JOINERY DRAWING · CONCEPT</text></svg>',
    'ar-model.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#f0efea"/><g fill="#d2c8b7" stroke="#68675e" stroke-width="2"><path d="m400 112 118 68-118 68-118-68z"/><path d="M282 180v144l118 68V248z"/><path d="M518 180v144l-118 68V248z"/></g><path d="M205 120v-42h42m306 0h42v42M205 350v42h42m306 0h42v-42" fill="none" stroke="#8f7356" stroke-width="5"/><text x="400" y="460" text-anchor="middle" fill="#67665f" font-family="Arial" font-size="15" letter-spacing="3">WEB + AR ASSET · SAMPLE</text></svg>',
    'og-cover.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f0efea"/><text x="90" y="240" fill="#191a18" font-family="Georgia,serif" font-size="70">Furniture, from screen to shop floor.</text><text x="96" y="330" fill="#666860" font-family="Arial,sans-serif" font-size="27">3D configurators · Revit/BIM · AR · production drawings</text></svg>'
  };
  for (const [name, content] of Object.entries(cards)) await writeAsset(`assets/renders/${name}`, content);
};

const productData = { ...product, variants: productVariants };
const navHtml = (depth, active) => `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="wordmark" href="${href('', depth)}" aria-label="Dekara Designs portfolio home">Dekara<span> / portfolio</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button><nav id="primary-nav" aria-label="Primary">${menu.map((item) => `<a href="${href(item.href, depth)}"${active === item.href ? ' aria-current="page"' : ''}>${esc(item.label)}</a>`).join('')}${cta ? `<a class="button button-small" href="${href(cta.href, depth)}">${esc(cta.label)}</a>` : ''}</nav><button class="theme-toggle" type="button" aria-label="Toggle colour theme">◐</button></header>`;
const footerHtml = (depth) => `<footer class="site-footer"><div><a class="wordmark" href="${href('', depth)}">Dekara<span> / portfolio</span></a><p>${esc(site.role)}</p></div><div><span class="eyebrow">Location</span><p>${esc(site.location)} · ${esc(site.timezone)}<br>${esc(site.overlap)}</p></div><div><span class="eyebrow">Next step</span><a href="${href('contact/', depth)}">Send a project brief ↗</a></div><p class="copyright">© Dekara Designs · Concept work is clearly labelled.</p></footer>`;
const documentHtml = ({ title, description, canonical, body, depth = 0, active = '' }) => {
  const base = prefix(depth);
  const canonicalUrl = `${site.baseUrl}/${canonical}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        name: site.owner,
        jobTitle: site.role,
        address: { '@type': 'PostalAddress', addressLocality: site.location, addressCountry: 'ZA' }
      },
      {
        '@type': 'ProfessionalService',
        name: 'Furniture 3D, Revit/BIM & AR services',
        description: site.positioning,
        areaServed: 'Worldwide',
        address: { '@type': 'PostalAddress', addressLocality: site.location, addressCountry: 'ZA' }
      },
      ...work.map((item) => ({
        '@type': 'CreativeWork',
        name: item.title,
        description: item.description,
        url: `${site.baseUrl}/${item.href}`,
        genre: item.category,
        isAccessibleForFree: true
      }))
    ]
  };
  return `<!doctype html>
<html lang="en" data-theme="${esc(theme.default)}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}${esc(seo.titleSuffix)}</title>
<meta name="description" content="${esc(description)}"><meta name="robots" content="${esc(seo.robots)}">
<link rel="canonical" href="${esc(canonicalUrl)}"><meta name="theme-color" content="${esc(theme.light.background)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}${esc(seo.titleSuffix)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonicalUrl)}"><meta property="og:image" content="${esc(site.baseUrl + '/' + seo.socialImage)}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonForHtml(jsonLd)}</script>
<link rel="stylesheet" href="${base}assets/site.css"><script type="module" src="${base}assets/site.js"></script>
</head><body data-site-root="${prefix(depth)}" data-form-endpoint="${esc(site.formEndpoint)}" data-contact-email="${esc(site.email)}">${navHtml(depth, active)}<main id="main">${body}</main>${footerHtml(depth)}
</body></html>`;
};
const pageTop = (eyebrow, title, lead) => `<section class="page-top"><div class="container"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="intro">${esc(lead)}</p></div></section>`;
const workCard = (item, depth) => `<article class="work-card"><a href="${href(item.href, depth)}"><img src="${image(item.image, depth)}" alt="" width="800" height="520" loading="lazy" decoding="async"><div class="work-card-copy"><p class="eyebrow">${esc(item.category)}${item.concept ? ' · Concept' : ''}</p><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><span class="text-link">Explore work ↗</span></div></a></article>`;
const packageCard = (pkg) => `<article class="price-card"${pkg.anchor ? ` id="${esc(pkg.anchor)}"` : ''}><div><p class="eyebrow">${esc(pkg.category)}</p><h3>${esc(pkg.name)}</h3><p>${esc(pkg.description)}</p></div><div class="price-row"><strong data-price-low="${pkg.low}" data-price-high="${pkg.high}"></strong><span>${esc(pkg.unit)}</span></div><p class="turnaround">Turnaround · ${esc(pkg.turnaround)}</p><a class="text-link" href="../contact/?package=${encodeURIComponent(pkg.name)}">Discuss this package ↗</a></article>`;

const homeBody = (depth) => `<section class="home-hero container"><div class="hero-copy"><p class="eyebrow">${esc(home.eyebrow)}</p><h1>${esc(home.headline)}</h1><p class="intro">${esc(home.support)}</p><div class="button-row"><a class="button" href="${href('lab/', depth)}">Try the live configurator</a><a class="button button-outline" href="${href('contact/', depth)}">Start a project</a></div><p class="role-line">${esc(site.role)}</p></div><div class="portrait-frame" aria-label="${esc(home.photoAlt)}"><div class="portrait-placeholder"><span>Portrait</span><small>TODO · Add owner photo</small></div><p>${esc(home.photoCaption)}</p></div></section>
<section class="section-block container"><div class="section-heading"><p class="eyebrow">Choose your route</p><h2>Built around the work you need done.</h2></div><div class="audience-grid">${home.audiences.map((item, index) => `<a class="audience-card" href="${href(item.href, depth)}"><span class="index">0${index + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><span class="text-link">Find the right path ↗</span></a>`).join('')}</div></section>
<section class="section-block section-muted"><div class="container"><div class="section-heading"><p class="eyebrow">What I build</p><h2>One production-minded workflow.</h2></div><div class="service-grid">${home.buildCards.map((item) => {const pkg = pricing.tracks.flatMap((track) => track.packages).find((candidate) => candidate.name === item.package);return `<article class="service-card"><p class="eyebrow">${esc(item.category)}</p><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><div class="service-card-bottom"><span>From ${pkg ? `$${pkg.low}` : 'quote'}</span><a href="${href('services/', depth)}">Package details ↗</a></div></article>`;}).join('')}</div></div></section>
<section class="section-block container differentiator"><p class="eyebrow">The useful part</p><h2>AR alone isn't a differentiator.<br><em>AR + configurator + manufacturing output is.</em></h2><div class="flow-diagram"><span>Options</span><b>→</b><span>Quote</span><b>→</b><span>Cut list / drawings</span></div></section>
<section class="section-block live-proof"><div class="container live-proof-inner"><div><p class="eyebrow">Live proof · Dekara Designs</p><h2>Try a finish combination.</h2><p>Change cabinet colour, timber and handle. The illustrated concept and price update immediately.</p><a class="button button-outline" href="${href('lab/', depth)}">Open the configurator</a></div><div class="proof-card"><img src="${image(productVariants[0].path, depth)}" alt="Dekara Pedestal concept illustration" width="800" height="720" loading="lazy" data-preview-image></div></div></section>
<section class="section-block container"><div class="section-heading"><p class="eyebrow">Selected work</p><h2>Show the output, not just the claim.</h2></div><div class="work-grid">${work.slice(0, 3).map((item) => workCard(item, depth)).join('')}</div></section>
<section class="section-block section-dark"><div class="container"><div class="section-heading"><p class="eyebrow">How it works</p><h2>Four steps. Clear handover.</h2></div><div class="steps-grid">${home.steps.map((item, index) => `<article class="step"><span>0${index + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div><div class="button-row"><a class="button button-light" href="${href('process/', depth)}">See the process</a><a class="text-link" href="${href('contact/', depth)}">Send a brief ↗</a></div></div></section>
<section class="section-block container final-cta"><p class="eyebrow">Start with the product and the output</p><h2>Have a range to build?</h2><p>Send the product count, the source files you have and the formats you need.</p><a class="button" href="${href('contact/', depth)}">Send a brief</a></section>`;

const productBody = (depth) => {
  const data = jsonForHtml(productData);
  const defaultVariant = productVariants.find((variant) => {
    const options = product.optionGroups;
    return variant.cabinet === options[0].default && variant.timber === options[1].default && variant.handle === options[2].default;
  }) || productVariants[0];
  const productImage = image(defaultVariant.path, depth);
  const groups = product.optionGroups.map((group) => `<fieldset class="swatch-group" data-group="${esc(group.id)}"><legend>${esc(group.label)}</legend><div class="swatch-row">${group.options.map((option) => `<button type="button" class="swatch" data-option-group="${esc(group.id)}" data-option-value="${esc(option.id)}" aria-label="${esc(option.label)}" aria-pressed="${group.default === option.id}" title="${esc(option.label)}" style="--swatch:${esc(option.color)}"><span></span></button>`).join('')}</div><p class="selected-option" data-selected-label="${esc(group.id)}"></p></fieldset>`).join('');
  const gallery = product.gallery.map((item) => {
    const src = image(`${defaultVariant.path.replace('-1200.svg', `-1200-${item.view}.svg`)}`, depth);
    return `<button type="button" class="gallery-thumb" data-gallery-view="${esc(item.view)}" aria-label="${esc(item.label)}"><img src="${src}" alt="" width="96" height="86" loading="lazy"></button>`;
  }).join('');
  const sections = `<section class="product-hero" data-product-root><div class="product-hero-image"><img data-hero-image src="${productImage}" alt="${esc(product.name)} original concept illustration, shown in selected finishes" width="800" height="720"><span class="concept-ribbon">${esc(product.conceptLabel)}</span></div><div class="product-info-card"><p class="eyebrow">${esc(product.category)}</p><h1>${esc(product.name)}</h1><p class="collection-note">${esc(product.collection)}</p><p>${esc(product.description)}</p><p class="dimensions">${esc(product.dimensions.cm)} <span>${esc(product.dimensions.imperial)}</span></p><div class="swatches">${groups}</div><p class="product-price"><span data-product-price></span><small>Indicative concept price · ${esc(product.currency)}</small></p><div class="button-row"><button type="button" class="button jump-3d">View in 3D</button><button type="button" class="button button-outline jump-ar">View in AR</button></div><div class="button-row export-row"><button class="text-button" type="button" data-add-brief>Add to project brief</button><button class="text-button" type="button" data-export="quote">Download concept quote</button><button class="text-button" type="button" data-export="cut-list">Download concept cut list</button></div><p class="export-status" role="status" aria-live="polite"></p><p class="micro-note">This is an original vector concept, not a finished product render or live store.</p></div></section>
<nav class="product-subnav" aria-label="Product sections"><div class="container"><a href="#gallery">Gallery</a><a href="#features">Features</a><a href="#video">Video</a><a href="#overview">Overview</a><a href="#collection">Collection</a><a href="#specs">Specs &amp; support</a><a class="button button-small" href="${href('contact/', depth)}">Discuss a build</a></div></nav>
<section id="gallery" class="section-block container product-gallery"><div class="gallery-rail">${gallery}<div class="gallery-tools"><button type="button" class="round-tool open-3d" aria-label="Open interactive 3D view" title="Open 3D">3D</button><button type="button" class="round-tool open-ar" aria-label="Open AR and model export options" title="AR and model export">AR</button></div></div><div class="gallery-view"><img data-gallery-main src="${productImage}" alt="${esc(product.name)} selected finish combination" width="800" height="720"><div class="viewer-wrap" hidden><canvas class="product-canvas" aria-label="${esc(product.name)} interactive 3D concept model"></canvas><div class="viewer-actions"><button type="button" class="dimension-toggle">Show dimensions</button><button type="button" class="screenshot-model">Screenshot</button><button type="button" class="model-download">Prepare GLB</button></div><svg class="dimension-overlay" viewBox="0 0 800 720" aria-hidden="true" hidden><path d="M260 585h280m-280-8v16m280-16v16M550 250v280m-8-280h16m-16 280h16" fill="none" stroke="currentColor"/><text x="400" y="615" text-anchor="middle">48 cm</text><text x="575" y="410">62 cm</text></svg></div></div></section>
<section id="features" class="section-block section-muted"><div class="container"><p class="eyebrow">Features</p><h2>Choices connected to useful output.</h2><div class="feature-grid">${product.features.map((feature, index) => `<article><span class="feature-number">0${index + 1}</span><h3>${esc(feature.title)}</h3><p>${esc(feature.text)}</p></article>`).join('')}</div></div></section>
<section id="video" class="section-block container"><p class="eyebrow">Video</p><div class="video-facade"><div><span class="play-icon">▶</span><p>Video walkthrough</p><small>TODO: Add an owner-made, captioned video and poster.</small></div></div></section>
<section id="overview" class="section-block container overview-grid"><div><p class="eyebrow">Overview</p><h2>From a finish choice to a production brief.</h2></div><div><p>${esc(product.notes)}</p><p>The configurator pattern can connect a product's finish options to a live summary, quote request and manufacturing schedule. Each real product needs its own confirmed dimensions, material data and render set.</p><button class="text-button save-config" type="button">Copy shareable configuration link</button><p class="share-status" role="status" aria-live="polite"></p></div></section>
<section id="collection" class="section-block section-dark"><div class="container"><p class="eyebrow">Collection</p><h2>One product is a starting point.</h2><p>Related products can use the same product template and carry their own data, options, images and support files.</p><a class="button button-light" href="${href('work/', depth)}">See related work</a></div></section>
<section id="specs" class="section-block container"><div class="spec-layout"><div><p class="eyebrow">Specs &amp; support</p><h2>Useful detail, clearly labelled.</h2><p>Concept specifications are marked as TODO until the owner confirms the product and manufacturing details.</p><div class="download-list"><a href="${image('assets/downloads/sample-shop-drawing.svg', depth)}" download>Sample drawing sheet <span>SVG · 2 KB</span></a><a href="${image('assets/downloads/sample-cut-list.csv', depth)}" download>Sample cut-list structure <span>CSV · 1 KB</span></a><a href="${image('assets/downloads/portfolio-sample-resources.zip', depth)}" download>Download all sample resources <span>ZIP · concept files</span></a></div></div><dl class="spec-table">${product.specs.map((row) => `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl></div></section>
<div class="mobile-actions" aria-label="Product actions"><button type="button" class="button jump-3d">View in 3D</button><button type="button" class="button button-outline jump-ar">View in AR</button></div>
<script type="application/json" id="product-data">${data}</script>`;
  return pageTop('Live concept · Dekara Designs', product.name, 'A reusable product-page pattern, with a finish configurator, interactive 3D concept and shareable options.') + sections;
};

const pageBodies = [];
pageBodies.push({
  path: 'index.html', canonical: '', title: 'Furniture 3D, BIM & AR specialist',
  description: site.positioning, active: '', body: homeBody(0), depth: 0
});
pageBodies.push({
  path: 'services/index.html', canonical: 'services/', title: 'Services & pricing',
  description: 'Revit families, shop drawings, AR-ready model packs and furniture configurators with indicative pricing.',
  active: 'services/', depth: 1,
  body: pageTop('Services & pricing', 'Clear scope. Practical deliverables.', 'Choose a defined starting point. Prices are indicative; every quote is confirmed in writing.') +
    `<section class="section-block container"><div class="currency-bar"><label for="currency-select">Show prices in</label><select id="currency-select">${pricing.currencies.map((currency) => `<option value="${currency.code}" data-multiplier="${currency.multiplier}" data-symbol="${currency.symbol}"${currency.code === pricing.defaultCurrency ? ' selected' : ''}>${currency.label}</option>`).join('')}</select><p>${esc(pricing.termsNote)}</p></div>${tracks.map((track) => `<section class="pricing-track"><div class="section-heading"><p class="eyebrow">${esc(track.name)}</p><h2>${track.id === 'quick-wins' ? 'Technical outputs' : 'Interactive product experiences'}</h2></div><div class="pricing-grid">${track.packages.map(packageCard).join('')}</div></section>`).join('')}</section>
    <section class="section-block section-muted"><div class="container"><p class="eyebrow">Terms</p><h2>How the quote works.</h2><ul class="plain-list">${pricing.commercialTerms.map((term) => `<li>${esc(term)}</li>`).join('')}</ul><a class="button" href="../contact/">Request a written quote</a></div></section>`
});
pageBodies.push({
  path: 'work/index.html', canonical: 'work/', title: 'Selected work',
  description: 'Furniture 3D configurators, Revit/BIM families, AR model delivery and shop drawing work.',
  active: 'work/', depth: 1,
  body: pageTop('Selected work', 'Work you can inspect.', 'Concept work is labelled. No client names, testimonials or results are invented.') +
    `<section class="section-block container"><div class="filter-row" role="group" aria-label="Filter work"><button class="filter-button is-active" data-work-filter="all" aria-pressed="true">All</button>${['Revit/BIM', 'Shop drawings', 'Configurators', 'AR models'].map((category) => `<button class="filter-button" data-work-filter="${esc(category)}" aria-pressed="false">${esc(category)}</button>`).join('')}</div><div class="work-grid">${work.map((item) => `<div data-work-card data-category="${esc(item.category)}">${workCard(item, 1)}</div>`).join('')}</div></section>`
});
pageBodies.push({
  path: 'work/dekara-designs-configurator/index.html', canonical: 'work/dekara-designs-configurator/', title: 'Dekara Designs finish configurator',
  description: 'Explore a concept finish configurator for the Dekara Pedestal. Change cabinet colour, timber and handle, then inspect the 3D concept.',
  active: 'work/', depth: 2, body: productBody(2)
});
for (const item of work.filter((entry) => entry.id !== 'dekara-configurator')) {
  const depth = 2;
  const demo = item.demoHref ? `<p><a class="text-link" href="${href(item.demoHref, depth)}">Open the Dekara demo ↗</a></p>` : '';
  const body = pageTop(item.category, item.title, item.description) + `<section class="section-block container detail-grid"><img src="${image(item.image, depth)}" alt="" width="800" height="520"><div><p class="eyebrow">${item.concept ? 'Concept item · no client claim' : esc(item.category)}</p><h2>${esc(item.title)}</h2><p>${esc(item.description)}</p><p>TODO: Add owner-created work samples, verified deliverables and approved project context.</p>${demo}<a class="button" href="${href(`contact/?package=${encodeURIComponent(item.title)}`, depth)}">Discuss a similar scope</a></div></section>`;
  pageBodies.push({ path: `work/${item.slug}/index.html`, canonical: `work/${item.slug}/`, title: item.title, description: item.description, active: 'work/', depth, body });
}
pageBodies.push({
  path: 'lab/index.html', canonical: 'lab/', title: 'Configurator Lab',
  description: 'Try the Dekara Designs product finish concept and see a real-time option and price summary.',
  active: 'lab/', depth: 1,
  body: pageTop('Configurator Lab', 'Test the choices, then inspect the model.', 'This demo uses original vector concept artwork and a small programmatic 3D model. It is not a live store.') + `<section class="section-block container"><div class="lab-panel"><div><p class="eyebrow">${esc(product.conceptLabel)}</p><h2>${esc(product.name)}</h2><p>${esc(product.description)}</p><a class="button" href="../work/dekara-designs-configurator/">Open product page</a></div><img src="../assets/renders/dekara-pedestal-oak-chalk-brass-1200.svg" alt="Dekara Pedestal original concept illustration" width="800" height="720"></div></section>`
});
pageBodies.push({
  path: 'resources/index.html', canonical: 'resources/', title: 'Resources',
  description: 'Sample resources and guides for architects, manufacturers and e-commerce teams.',
  active: 'resources/', depth: 1,
  body: pageTop('Resource library', 'Useful files for the next handover.', resourcesData.explainer) + `<section class="section-block container"><div class="resource-filters"><label>Search <input type="search" data-resource-search placeholder="Search resources"></label><label>Type <select data-resource-filter="type"><option value="">All types</option>${[...new Set(resources.map((resource) => resource.type))].map((value) => `<option>${esc(value)}</option>`).join('')}</select></label><label>Discipline <select data-resource-filter="discipline"><option value="">All disciplines</option>${[...new Set(resources.map((resource) => resource.discipline))].map((value) => `<option>${esc(value)}</option>`).join('')}</select></label></div><div class="resource-grid">${resources.map((item) => `<article class="resource-card" data-resource-card data-type="${esc(item.type)}" data-discipline="${esc(item.discipline)}" data-search="${esc(`${item.title} ${item.description} ${item.format} ${item.discipline}`.toLowerCase())}"><p class="eyebrow">${esc(item.discipline)} · ${esc(item.format)}</p><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><span>${esc(item.size)}</span><a class="text-link" href="${href(item.href || 'contact/', 1)}">${item.href ? 'Open / download ↗' : 'Available on request ↗'}</a></article>`).join('')}</div></section>`
});
pageBodies.push({
  path: 'process/index.html', canonical: 'process/', title: 'Process & terms',
  description: processPage.intro, active: 'process/', depth: 1,
  body: pageTop('Process', processPage.title, processPage.intro) + `<section class="section-block container"><div class="steps-grid light-steps">${processPage.steps.map((step, index) => `<article class="step"><span>0${index + 1}</span><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></article>`).join('')}</div><div class="terms-panel"><h2>Working terms</h2><ul class="plain-list">${processPage.terms.map((term) => `<li>${esc(term)}</li>`).join('')}</ul></div><a class="button" href="../contact/">Start a project brief</a></section>`
});
pageBodies.push({
  path: 'about/index.html', canonical: 'about/', title: 'About',
  description: about.intro, active: 'about/', depth: 1,
  body: pageTop('About', about.title, about.intro) + `<section class="section-block container about-grid"><div class="portrait-placeholder"><span>Portrait</span><small>TODO · Add owner photo</small></div><div><p>${esc(site.positioning)}</p><p class="role-line">${esc(site.role)}</p><p>${esc(about.note)}</p><a class="button" href="../work/">Review selected work</a></div></section>`
});
pageBodies.push({
  path: 'contact/index.html', canonical: 'contact/', title: 'Start a project',
  description: 'Send a furniture configurator, BIM, AR or shop drawing project brief.',
  active: '', depth: 1,
  body: pageTop('Contact', 'Start with the product and the output.', 'Share what you make, what files you have and what the customer or workshop needs to receive.') +   `<section class="section-block container contact-grid"><form data-contact-form novalidate><label>Name <input name="name" autocomplete="name" required></label><label>Company <input name="company" autocomplete="organization"></label><label>Role <input name="role"></label><label>Package <select name="package"><option value="">Not sure yet</option>${tracks.flatMap((track) => track.packages).map((pkg) => `<option>${esc(pkg.name)}</option>`).join('')}</select></label><label>Product count <input name="productCount" type="number" min="1"></label><label>Deadline <input name="deadline" type="date"></label><label>Budget range <input name="budget" placeholder="e.g. $1,800–$3,500"></label><label>Reference links <input name="links" type="url" placeholder="https://"></label><label>Source <input name="source" placeholder="How did you find this site?"></label><label class="wide">Brief <textarea name="brief" rows="6" required placeholder="Products, options, source files, outputs and deadlines"></textarea></label><label class="honeypot" aria-hidden="true">Leave this blank <input name="website" tabindex="-1" autocomplete="off"></label><button class="button" type="submit">Prepare enquiry</button><p data-form-status role="status" aria-live="polite"></p></form><aside class="contact-aside"><p class="eyebrow">Based in Johannesburg</p><h2>SAST · ${esc(site.overlap)}</h2><p>Every enquiry is acknowledged within 24 hours. TODO: Add a verified contact email or form endpoint before launch.</p><button class="button button-outline booking-facade" type="button" data-booking-url="${esc(site.bookingUrl)}">Load booking options</button><div class="booking-slot" hidden></div></aside></section>`
});
pageBodies.push({
  path: 'privacy/index.html', canonical: 'privacy/', title: 'Privacy',
  description: 'Plain-language privacy notes for the portfolio website.',
  active: '', depth: 1,
  body: pageTop('Privacy', 'A simple privacy note.', 'This static portfolio does not use tracking cookies or analytics by default.') + `<section class="section-block container"><h2>Forms and local preferences</h2><p>The contact form does not transmit information until a verified endpoint is configured. Theme and currency preferences, when used, are stored in this browser. No third-party chat or analytics scripts are included.</p><p>TODO: Review this notice with the final form provider and privacy requirements before launch.</p></section>`
});
pageBodies.push({
  path: '404.html', canonical: '404.html', title: 'Page not found',
  description: 'The page you requested could not be found.',
  active: '', depth: 0,
  body: pageTop('404', 'That page is not here.', 'The link may have changed. Return to the portfolio or send a project brief.') + `<section class="section-block container"><a class="button" href="./">Back to home</a></section>`
});

for (const entry of pageBodies) {
  await write(entry.path, documentHtml(entry));
}
const resourceGuide = (slug, title, intro, items) => {
  const depth = 2;
  const body = pageTop('Resource guide', title, intro) + `<section class="section-block container"><ul class="plain-list">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><a class="button" href="../../contact/">Ask a question</a></section>`;
  return documentHtml({ title, description: intro, canonical: `resources/${slug}/`, body, depth });
};
await write('resources/configurator-brief/index.html', resourceGuide('configurator-brief', 'How to brief a configurator project', 'A practical checklist for a product configurator scope.', [
  'Product list, variants and option dependencies.',
  'Current CAD files, photographs, drawings and material references.',
  'Price rules, minimums, lead times and regional currencies.',
  'Required outputs: quote, cut list, drawing, Revit content, GLB or USDZ.',
  'Target devices, storefront platform, languages and deadline.',
  'Who approves product data, visuals and final behavior.'
]));
await write('resources/cad-for-web-ar/index.html', resourceGuide('cad-for-web-ar', 'Preparing CAD models for web and AR', 'A first-pass checklist for web and mobile model delivery.', [
  'Remove hidden geometry and simplify parts that do not affect the silhouette.',
  'Apply real-world scale, transforms, pivots and material names.',
  'Use texture dimensions appropriate to the final display size.',
  'Check GLB size, material appearance, loading behavior and mobile performance.',
  'Verify AR placement and provide a pre-built USDZ where iOS Quick Look is required.',
  'Keep a source model and a documented optimized export.'
]));

await renderVariantAssets();
await mkdir(path.join(root, 'assets', 'downloads'), { recursive: true });
await write('assets/downloads/sample-cut-list.csv', 'item,part,qty,material,length_mm,width_mm,thickness_mm\nDekara Pedestal,Side panel,2,TODO,560,320,18\n');
await write('assets/downloads/project-brief-template.txt', 'PRODUCT AND PROJECT BRIEF\n\nProduct list:\nOptions / finishes:\nCAD or reference links:\nRequired outputs:\nPlatforms / devices:\nDeadline:\nBudget range:\nDecision maker:\n');
await write('assets/downloads/sample-shop-drawing.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="white" stroke="#555"/><text x="36" y="48" font-family="Arial" font-size="20">DEKARA PEDESTAL · CONCEPT DRAWING · NOT FOR PRODUCTION</text><path d="M200 390h300V180H200zm370 0h160V180H570zm-370 35h300m-300-8v16m300-16v16M520 180v210m-8-210h16m-16 210h16" fill="none" stroke="#333" stroke-width="3"/><text x="350" y="462" text-anchor="middle" font-family="Arial" font-size="15">48 cm</text><text x="548" y="292" font-family="Arial" font-size="15">62 cm</text></svg>');
const sampleFiles = ['sample-shop-drawing.svg', 'sample-cut-list.csv', 'project-brief-template.txt'];
await writeFile(path.join(root, 'assets', 'downloads', 'portfolio-sample-resources.zip'), makeZip(
  await Promise.all(sampleFiles.map(async (name) => [
    name,
    await readFile(path.join(root, 'assets', 'downloads', name))
  ]))
));

for (const name of await readdir(path.join(root, 'assets'))) {
  if (/^chunk-.*\.js$/.test(name)) await unlink(path.join(root, 'assets', name));
}
try {
  await unlink(path.join(root, 'assets', 'renders', 'case-study.svg'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await bundle({
  entryPoints: [path.join(root, 'src', 'site.js'), path.join(root, 'src', 'product-viewer.js')],
  outdir: path.join(root, 'assets'),
  entryNames: '[name]',
  chunkNames: 'chunk-[name]-[hash]',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  legalComments: 'none'
});

const publishedRoutes = pageBodies.filter((page) => page.canonical !== '404.html')
  .map((page) => `${site.baseUrl}/${page.canonical}`);
await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publishedRoutes.map((url) => `  <url><loc>${esc(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
await write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
await write('assets/public-index.json', `${JSON.stringify({
  version: 1,
  items: [...menu.map((item) => ({ title: item.label, href: item.href })),
    ...work.map((item) => ({ title: item.title, href: item.href })),
    ...resources.map((item) => ({ title: item.title, href: item.href }))]
}, null, 2)}\n`);
console.log(`Built ${pageBodies.length + 2} static pages and ${productVariants.length} original finish variants.`);
