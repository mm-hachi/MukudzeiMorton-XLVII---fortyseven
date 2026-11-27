# Reusable 2D Product Configurator Prompt

Use this document as the master prompt whenever creating a new 2D product configurator for a client. This template is for the customer-facing configurator only.

## Goal

Create a polished, responsive, one-page 2D product configurator that faithfully follows the supplied client reference.

The result must be a working front-end implementation in the target project. All configuration options, pricing, quantity controls, wishlist/search/cart interactions, responsive layouts, and image switching must work without a backend.

Keep the implementation limited to the public product experience.

## Required Inputs

Before starting, collect all of the following. Replace every placeholder in the "Client Delivery Prompt" section below with the exact supplied values.

### 1. Appearance References

- Existing client website URL:
- A screenshot of the desired appearance or page state:
- Brand logo or logo files:
- Brand fonts, or links to approved font sources:
- Core brand colors:
- Preferred layout style, if the screenshot does not establish it:
- Links or labels for header/footer navigation items:

### 2. Product Information

- Product name:
- Product category or breadcrumb labels:
- Short product description or price label:
- Base price:
- Compare-at price, if used:
- Currency and locale:
- Tax/shipping text:
- Rating/review count, if present:
- Available stock or availability text, if required:
- Product URL or canonical route:

### 3. Configuration Options

Provide a complete list of every option and value:

- Option 1 name, for example cabinet colour:
  - Value label:
  - Internal ID:
  - Swatch color, texture, or image:
  - Price adjustment:
- Option 2 name:
- Any additional options:

Include every combination that needs its own image. Do not assume that every combination exists; ask for a complete variant matrix.

### 4. Variant Images

Provide one image for each combination in the variant matrix.

For each image include:

- Full image filename:
- Final destination folder, default: `assets/`
- Option combination represented:
- Recommended output size:
- Transparent or white background:
- Which image is the default/initial variant:

Supplied images must be named or mapped clearly. Example:

```text
cabinet-charcoal|timber-walnut|handle-brass.png
```

If a combination has no dedicated image, state whether the agent should:

- Use the nearest variant image;
- Build a CSS/SVG fallback from the option values; or
- Show a fallback image.

### 5. Functional Scope

Confirm whether the configurator should include:

- Search panel:
- Wishlist:
- Cart count and add-to-cart feedback:
- Quantity controls:
- Breadcrumb navigation:
- Existing-site header/footer:
- Social or account icons:
- `No` for any features that should not be copied.

If add-to-cart or checkout integration is required, provide the target endpoint, ecommerce platform, SDK/API, and authentication requirements.

### 6. Technical Requirements

- Target stack:
- Existing project path:
- Entry file:
- Browser support:
- Preferred image format:
- Hosting/deployment constraints:
- Analytics or tracking requirements:
- Any accessibility requirements above the baseline:

## One-Shot Implementation Instructions

### Phase 1: Extract the Existing Design

1. Inspect the supplied screenshot and live client site.
2. Reproduce the recognizable layout, typography, spacing, colors, borders, shadows, header, navigation, and component proportions.
3. Treat the screenshot as the visual target and the live site as a source for brand assets and interaction conventions.
4. Do not copy unrelated pages or invent products, labels, prices, or options.
5. Use the supplied logo and color values instead of placeholder branding.

### Phase 2: Build the Configurator

1. Build a semantic, accessible product page with a two-column desktop layout and a focused single-column mobile layout.
2. Place the product image on the left and the configuration controls on the right.
3. Add an order summary/purchase bar that remains practical on both desktop and mobile.
4. Generate swatch controls from the supplied option data rather than hard-coding unrelated values.
5. Make all variants update:
   - Main product image;
   - Summary image;
   - Selected option labels;
   - Active swatch state;
   - Price;
   - Compare-at price and savings label;
   - Accessible image alt text;
   - Variant summary text.
6. Name internal option values in a consistent slug format, for example `charcoal`, `walnut`, or `matte-black`.
7. Use an explicit variant key format and map it to each supplied image.
8. Preload or gracefully fall back if an image fails to load.

### Phase 3: Interactions

Implement only the interactions included in the confirmed functional scope:

- Swatch selection;
- Quantity increment/decrement with a minimum quantity of one;
- Cart count updates;
- Temporary add-to-cart confirmation;
- Wishlist toggle;
- Search panel open/submit behavior;
- Responsive navigation behavior;
- Keyboard focus and `aria-*` state updates.

Do not create fake checkout, account, or backend behavior unless explicitly requested.

### Phase 4: Visual Quality

Match the reference closely at both desktop and mobile sizes.

- Preserve hierarchy and whitespace.
- Use the supplied brand fonts or sensible fallbacks.
- Keep text readable against each swatch and surface.
- Avoid oversized, distorted, blurred, or incorrectly cropped product images.
- Use `object-fit: contain` for product photography.
- Use a neutral, low-contrast background unless the reference specifies otherwise.
- Respect `prefers-reduced-motion`.
- Use no decorative UI that conflicts with the client brand.

### Phase 5: Accessibility

- Use semantic HTML and valid labels.
- Pair visible option headings with `aria-labelledby`.
- Use button `aria-pressed` state for selection controls.
- Ensure keyboard-visible focus.
- Provide descriptive image alt text that updates with the configuration.
- Add a live region for price or cart feedback where appropriate.
- Keep touch targets practical on mobile.
- Do not rely on color alone to communicate selection.

### Phase 6: Validation

Before completion:

1. Test every supplied option combination.
2. Test every image path and fallback.
3. Verify price and variant text calculations.
4. Test desktop, tablet, and mobile widths.
5. Test keyboard navigation and screen-reader state labels.
6. Test search, wishlist, quantity, cart feedback, and any provided integration.
7. Fix missing assets, broken links, console errors, layout overflow, and inaccessible controls.
8. Keep the implementation free of development-only or temporary UI.

## Implementation Rules

- Work from the supplied references; do not substitute a generic ecommerce template.
- Make no unrequested scope additions.
- Keep the solution maintainable and client-neutral.
- Prefer plain HTML/CSS/JavaScript unless the target project requires a framework.
- Keep option data, pricing, and image mappings centralized and easy to update.
- Use no secrets or private data in source files.
- Use no external dependencies unless explicitly approved.
- Preserve existing project conventions and routing.
- Do not silently alter supplied names or prices.
- State explicitly if a required input is missing rather than guessing.

## Repository Delivery

When working inside an existing repository:

1. Inspect package scripts and existing source structure first.
2. Make the smallest coherent change set.
3. Place product assets in the existing assets convention or the new configurator's `assets/` folder.
4. Update direct documentation only where the repository requires it.
5. Run the smallest relevant test/build command.
6. Report changed files and the exact validation performed.

## Final Response Requirements

When implementation is complete, report:

- What was created;
- Any supplied asset or reference details that were mapped;
- What was tested;
- Which required inputs were unavailable, if any;
- Remaining known limitations or integration blockers.

## Client Delivery Prompt

Copy this block into a new chat with the reference materials attached.

```text
Create a working 2D product configurator for CLIENT_NAME in the existing project at PROJECT_PATH.

Use the reusable requirements in CONFIGURATOR_PROMPT_TEMPLATE.md.

## Appearance

- Existing client site: CLIENT_SITE_URL
- Target screenshot: SCREENSHOT_ATTACHMENT_OR_PATH
- Supplied logo and brand assets: LOGO_ASSET_PATHS
- Brand fonts: FONT_NAMES_OR_SOURCES
- Core brand colors: BRAND_COLORS
- Header/navigation labels and links: HEADER_NAV_DATA
- Footer labels and links: FOOTER_DATA
- Breadcrumb labels: BREADCRUMB_DATA

## Product

- Product name: PRODUCT_NAME
- Product/category description: PRODUCT_DESCRIPTION
- Base price: BASE_PRICE_WITH_CURRENCY
- Compare-at price: COMPARE_AT_PRICE_OR_NOT_USED
- Currency/locale: CURRENCY_AND_LOCALE
- Tax/shipping text: TAX_SHIPPING_TEXT
- Rating/review count: RATING_AND_REVIEW_COUNT
- Availability text: AVAILABILITY_TEXT

## Options

Provide the complete option and value matrix below.

1. OPTION_1_NAME
   - VALUE_1_LABEL | VALUE_1_ID | SWATCH_VALUE | PRICE_ADJUSTMENT
   - VALUE_2_LABEL | VALUE_2_ID | SWATCH_VALUE | PRICE_ADJUSTMENT
2. OPTION_2_NAME
   - VALUE_1_LABEL | VALUE_1_ID | SWATCH_VALUE | PRICE_ADJUSTMENT
   - VALUE_2_LABEL | VALUE_2_ID | SWATCH_VALUE | PRICE_ADJUSTMENT
3. ADD_MORE_OPTIONS_AS_NEEDED

Initial/default combination:

- OPTION_1_ID / OPTION_2_ID / ADD_OTHER_IDS

## Variant Images

All required images are attached in VARIANT_IMAGE_FOLDER.

Image mapping:

- VARIANT_KEY_1: IMAGE_FILENAME_1
- VARIANT_KEY_2: IMAGE_FILENAME_2
- Continue for every supplied combination

Default image: DEFAULT_VARIANT_KEY
Missing combinations: MISSING_VARIANT_FALLBACK_RULE
Preferred image format: IMAGE_FORMAT
Output dimensions: IMAGE_DIMENSIONS

## Header and Interactions

- Search: ENABLED_OR_DISABLED
- Wishlist: ENABLED_OR_DISABLED
- Cart count: ENABLED_OR_DISABLED
- Quantity controls: ENABLED_OR_DISABLED
- Add-to-cart behavior: LOCAL_ONLY_OR_ENDPOINT_DETAILS
- Account link: ENABLED_OR_DISABLED
- Existing navigation links: NAV_DATA

## Technical Target

- Framework/stack: TARGET_STACK
- Entry file or route: ENTRY_PATH
- Existing project conventions: PROJECT_CONVENTIONS
- Target browsers: BROWSER_SUPPORT
- Hosting/deployment: HOSTING_CONSTRAINTS
- Analytics: ANALYTICS_REQUIREMENTS
- Accessibility requirements: ADDITIONAL_A11Y_REQUIREMENTS

## Hard Scope Boundary

Match the supplied screenshot and client site closely. If a required image, label, route, price, or behavior is missing, stop and ask for the missing input instead of guessing.

After implementation, test every variant, run the relevant build/test command, inspect responsive behavior, and report changed files plus verification results.
```
