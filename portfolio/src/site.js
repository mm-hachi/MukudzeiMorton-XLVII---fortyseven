const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeText = (value) => String(value ?? '');

const menuButton = $('.menu-toggle');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  $('#primary-nav')?.classList.toggle('is-open', open);
});

const savedTheme = localStorage.getItem('portfolio-theme');
if (savedTheme === 'light' || savedTheme === 'dark') document.documentElement.dataset.theme = savedTheme;
$('.theme-toggle')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('portfolio-theme', next);
});

$$('[data-work-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.workFilter;
    $$('[data-work-filter]').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    $$('[data-work-card]').forEach((card) => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
  });
});

const currencySelect = $('#currency-select');
const updatePrices = () => {
  const selected = $('option:checked', currencySelect);
  if (!selected) return;
  const multiplier = Number(selected.dataset.multiplier);
  const symbol = selected.dataset.symbol;
  $$('[data-price-low]').forEach((node) => {
    const low = Number(node.dataset.priceLow) * multiplier;
    const high = Number(node.dataset.priceHigh) * multiplier;
    const number = (value) => Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
    node.textContent = `${symbol}${number(low)}–${symbol}${number(high)}`;
  });
  localStorage.setItem('portfolio-currency', selected.value);
};
if (currencySelect) {
  const previous = localStorage.getItem('portfolio-currency');
  if (previous && [...currencySelect.options].some((option) => option.value === previous)) currencySelect.value = previous;
  currencySelect.addEventListener('change', updatePrices);
  updatePrices();
}

const resourceSearch = $('[data-resource-search]');
const resourceFilters = $$('[data-resource-filter]');
const filterResources = () => {
  const term = resourceSearch?.value.trim().toLowerCase() || '';
  const type = $('[data-resource-filter="type"]')?.value || '';
  const discipline = $('[data-resource-filter="discipline"]')?.value || '';
  $$('[data-resource-card]').forEach((card) => {
    card.hidden = (term && !card.dataset.search.includes(term)) ||
      (type && card.dataset.type !== type) ||
      (discipline && card.dataset.discipline !== discipline);
  });
};
resourceSearch?.addEventListener('input', filterResources);
resourceFilters.forEach((select) => select.addEventListener('change', filterResources));

const productScript = $('#product-data');
if (productScript) {
  const product = JSON.parse(productScript.textContent);
  const selected = Object.fromEntries(product.optionGroups.map((group) => [group.id, group.default]));
  const hero = $('[data-hero-image]');
  const galleryMain = $('[data-gallery-main]');
  const galleryView = $('.viewer-wrap');
  const canvas = $('.product-canvas');
  let viewer;
  let galleryMode = 'front';
  const getOption = (groupId, optionId) =>
    product.optionGroups.find((group) => group.id === groupId)?.options.find((option) => option.id === optionId);
  const activeVariant = () => product.variants.find((variant) =>
    variant.cabinet === selected.cabinet && variant.timber === selected.timber && variant.handle === selected.handle
  ) || product.variants[0];
  const price = () => product.basePrice + product.optionGroups.reduce((total, group) =>
    total + (getOption(group.id, selected[group.id])?.price || 0), 0);
  const updateProduct = () => {
    const variant = activeVariant();
    const src = `../../${variant.path}`;
    if (hero) hero.src = src;
    if (galleryMain) galleryMain.src = src.replace('-1200.svg', `-1200-${galleryMode}.svg`);
    $$('[data-gallery-view]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.galleryView === galleryMode);
    });
    $$('[data-option-group]').forEach((button) => {
      const active = selected[button.dataset.optionGroup] === button.dataset.optionValue;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
    product.optionGroups.forEach((group) => {
      const option = getOption(group.id, selected[group.id]);
      const label = $(`[data-selected-label="${group.id}"]`);
      if (label && option) label.textContent = option.label.toUpperCase();
    });
    const priceNode = $('[data-product-price]');
    if (priceNode) priceNode.textContent = `${product.currency} ${price().toLocaleString('en-US')}`;
    viewer?.update({
      cabinet: getOption('cabinet', selected.cabinet).color,
      timber: getOption('timber', selected.timber).color,
      handle: getOption('handle', selected.handle).color
    });
    const params = new URLSearchParams();
    params.set('v', product.optionGroups.map((group) => selected[group.id]).join('.'));
    history.replaceState(null, '', `${location.pathname}${location.search}#${params}`);
  };
  const configFromHash = () => {
    const value = new URLSearchParams(location.hash.slice(1)).get('v');
    if (!value) return;
    const ids = value.split('.');
    product.optionGroups.forEach((group, index) => {
      if (group.options.some((option) => option.id === ids[index])) selected[group.id] = ids[index];
    });
  };
  configFromHash();
  updateProduct();
  $$('[data-option-group]').forEach((button) => {
    button.addEventListener('click', () => {
      selected[button.dataset.optionGroup] = button.dataset.optionValue;
      updateProduct();
    });
  });
  $$('[data-gallery-view]').forEach((button) => {
    button.addEventListener('click', () => {
      galleryMode = button.dataset.galleryView;
      if (galleryMain) galleryMain.alt = `${product.name}, ${button.getAttribute('aria-label')}, selected finish combination`;
      updateProduct();
    });
  });
  const startViewer = async () => {
    $('#gallery')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    galleryMode = 'front';
    if (galleryMain) galleryMain.hidden = true;
    if (galleryView) galleryView.hidden = false;
    galleryView?.classList.add('is-active');
    try {
      if (!viewer) {
        const module = await import('./product-viewer.js');
        viewer = module.mountViewer(canvas, {
          cabinet: getOption('cabinet', selected.cabinet).color,
          timber: getOption('timber', selected.timber).color,
          handle: getOption('handle', selected.handle).color
        });
      }
      viewer.update({
        cabinet: getOption('cabinet', selected.cabinet).color,
        timber: getOption('timber', selected.timber).color,
        handle: getOption('handle', selected.handle).color
      });
    } catch (error) {
      if (galleryMain) galleryMain.hidden = false;
      if (galleryView) galleryView.hidden = true;
      console.error('Could not start the 3D concept viewer.', error);
      alert('The 3D concept viewer could not start on this device. The product images are still available.');
    }
  };
  $$('.jump-3d, .open-3d').forEach((button) => button.addEventListener('click', startViewer));
  $('.dimension-toggle')?.addEventListener('click', (event) => {
    const overlay = $('.dimension-overlay');
    const show = overlay?.hidden;
    if (overlay) overlay.hidden = !show;
    event.currentTarget.textContent = show ? 'Hide dimensions' : 'Show dimensions';
  });
  const downloadModel = async () => {
    if (!viewer) await startViewer();
    if (!viewer) return;
    const status = $('.export-status');
    status.textContent = 'Preparing the concept GLB…';
    try {
      const blob = await viewer.exportGLB();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'dekara-pedestal-concept.glb';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      status.textContent = 'Concept GLB prepared. It is not a production or AR-certified model.';
    } catch (error) {
      console.error('Could not prepare the concept GLB.', error);
      status.textContent = 'The GLB could not be prepared. Please try again.';
    }
  };
  $('.model-download')?.addEventListener('click', downloadModel);
  $('.screenshot-model')?.addEventListener('click', async () => {
    if (!viewer) await startViewer();
    if (!viewer) return;
    const status = $('.export-status');
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const blob = await new Promise((resolve, reject) => canvas.toBlob((result) =>
        result ? resolve(result) : reject(new Error('The model screenshot could not be created.')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dekara-pedestal-concept.png';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      status.textContent = 'Concept screenshot prepared.';
    } catch (error) {
      console.error('Could not capture the 3D concept.', error);
      status.textContent = 'The screenshot could not be created. Please try again.';
    }
  });
  $('[data-add-brief]')?.addEventListener('click', () => {
    const configuration = product.optionGroups.map((group) =>
      `${group.label}: ${getOption(group.id, selected[group.id]).label}`
    ).join('\n');
    const brief = `${product.name}\n${configuration}\nIndicative concept price: ${product.currency} ${price().toLocaleString('en-US')}\nConfiguration: ${location.href}`;
    sessionStorage.setItem('portfolio-project-brief', brief);
    location.href = `${document.body.dataset.siteRoot}contact/#brief`;
  });
  const openArNotice = async () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'ar-dialog';
    dialog.innerHTML = `<form method="dialog"><button class="dialog-close" aria-label="Close">×</button></form><p class="eyebrow">AR concept handoff</p><h2>Try the model on a compatible device.</h2><p>This concept can be exported as a GLB. A pre-built USDZ is still needed for iOS Quick Look.</p><p class="micro-note">TODO: Add an owner-created, optimized GLB and pre-built USDZ before describing this as production-ready AR.</p><button class="button" type="button" data-download-ar>Prepare concept GLB</button>`;
    document.body.append(dialog);
    dialog.showModal();
    $('[data-download-ar]', dialog).addEventListener('click', async () => {
      await startViewer();
      await downloadModel();
      dialog.close();
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
  };
  $$('.jump-ar, .open-ar').forEach((button) => button.addEventListener('click', openArNotice));
  $('.save-config')?.addEventListener('click', async () => {
    const status = $('.share-status');
    try {
      await navigator.clipboard.writeText(location.href);
      status.textContent = 'Shareable configuration link copied.';
    } catch {
      status.textContent = `Copy this configuration link: ${location.href}`;
    }
  });
  $$('[data-export]').forEach((button) => button.addEventListener('click', async () => {
    const status = $('.export-status');
    status.textContent = 'Preparing a concept-only PDF…';
    try {
      const { downloadPdf } = await import('./pdf-export.js');
      downloadPdf({
        product: product.name,
        type: button.dataset.export,
        options: product.optionGroups.map((group) => `${group.label}: ${getOption(group.id, selected[group.id]).label}`),
        price: `${product.currency} ${price().toLocaleString('en-US')}`,
        dimensions: product.dimensions.cm
      });
      status.textContent = 'Concept PDF prepared. It is not a production document.';
    } catch (error) {
      console.error('Could not prepare the concept PDF.', error);
      status.textContent = 'The PDF could not be prepared. Please try again.';
    }
  }));
  const subnav = $('.product-subnav');
  if (subnav && 'IntersectionObserver' in window) {
    const anchors = $$('a[href^="#"]', subnav);
    const sections = anchors.map((anchor) => $(anchor.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        anchors.forEach((anchor) => {
          if (anchor.getAttribute('href') === `#${entry.target.id}`) anchor.setAttribute('aria-current', 'location');
          else anchor.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-20% 0px -65% 0px' });
    sections.forEach((section) => observer.observe(section));
  }
}

const contactForm = $('[data-contact-form]');
if (contactForm) {
  const savedBrief = sessionStorage.getItem('portfolio-project-brief');
  if (savedBrief) {
    $('[name="brief"]', contactForm).value = `${savedBrief}\n\n`;
    sessionStorage.removeItem('portfolio-project-brief');
  }
}
contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = $('[data-form-status]', contactForm);
  if (!contactForm.reportValidity()) return;
  if (contactForm.elements.website.value) return;
  const formData = new FormData(contactForm);
  const values = Object.fromEntries(formData.entries());
  if (!values.name.trim() || !values.brief.trim()) {
    status.textContent = 'Add your name and a short project brief.';
    return;
  }
  const endpoint = document.body.dataset.formEndpoint;
  const email = document.body.dataset.contactEmail;
  const mailto = () => {
    const subject = encodeURIComponent(`Project enquiry: ${values.package || 'new project'}`);
    const body = encodeURIComponent(Object.entries(values)
      .filter(([key, value]) => key !== 'website' && value)
      .map(([key, value]) => `${key}: ${value}`).join('\n'));
    return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  };
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`The form service returned ${response.status}.`);
      status.textContent = 'Thanks. Your brief was sent.';
      contactForm.reset();
    } catch (error) {
      console.error('Contact form submission failed.', error);
      if (email) {
        status.textContent = 'The form service failed. Opening the configured email fallback.';
        location.href = mailto();
      } else {
        status.textContent = 'The form could not be sent, and no email fallback is configured.';
      }
    }
  } else if (email) {
    location.href = mailto();
    status.textContent = 'Your email app should open with the brief. Review it before sending.';
  } else {
    status.textContent = 'The enquiry is ready, but no verified email or form endpoint is configured yet.';
  }
});

$$('[data-booking-url]').forEach((button) => {
  button.addEventListener('click', () => {
    const slot = $('.booking-slot');
    const url = button.dataset.bookingUrl;
    if (!url) {
      slot.hidden = false;
      slot.textContent = 'TODO: Add the owner’s booking URL.';
      return;
    }
    let booking;
    try {
      booking = new URL(url);
    } catch {
      slot.hidden = false;
      slot.textContent = 'The configured booking URL is invalid.';
      return;
    }
    if (booking.protocol !== 'https:') {
      slot.hidden = false;
      slot.textContent = 'The booking URL must use HTTPS.';
      return;
    }
    const frame = document.createElement('iframe');
    frame.title = 'Booking calendar';
    frame.loading = 'lazy';
    frame.src = booking.href;
    slot.replaceChildren(frame);
    slot.hidden = false;
    button.disabled = true;
  });
});

$$('[data-prefill]').forEach((button) => button.addEventListener('click', () => {
  const field = $('[name="brief"]');
  if (field) field.value = `${escapeText(button.dataset.prefill)}\n\n`;
}));

const pageHash = location.hash;
if (pageHash.startsWith('#v=')) history.replaceState(null, '', `${location.pathname}${location.search}${pageHash}`);

const openCommandPalette = async () => {
  let items;
  try {
    const response = await fetch(`${document.body.dataset.siteRoot}assets/public-index.json`);
    if (!response.ok) throw new Error(`Search index request returned ${response.status}.`);
    items = (await response.json()).items;
  } catch (error) {
    console.error('Could not load the public search index.', error);
    return;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'command-dialog';
  const form = document.createElement('form');
  form.method = 'dialog';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search pages, work and resources';
  input.setAttribute('aria-label', 'Search the portfolio');
  const close = document.createElement('button');
  close.type = 'submit';
  close.className = 'dialog-close';
  close.setAttribute('aria-label', 'Close search');
  close.textContent = '×';
  const list = document.createElement('div');
  list.className = 'command-results';
  form.append(input, close);
  dialog.append(form, list);
  const renderResults = () => {
    const query = input.value.trim().toLowerCase();
    list.replaceChildren();
    for (const item of items.filter((entry) => !query || entry.title.toLowerCase().includes(query)).slice(0, 12)) {
      const link = document.createElement('a');
      link.href = `${document.body.dataset.siteRoot}${item.href}`;
      link.textContent = item.title;
      list.append(link);
    }
    if (!list.childElementCount) list.textContent = 'No matching pages or resources.';
  };
  input.addEventListener('input', renderResults);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  renderResults();
  input.focus();
};
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openCommandPalette();
  }
});
