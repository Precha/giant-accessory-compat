# Clickable Product Photo Lightbox — Design

Date: 2026-06-30
Feature: Make product photos clickable across the site, opening a popup ("lightbox") showing an enlarged photo with product name and SKU, closable via an X button, backdrop click, or Escape key.

## 1. Scope

Applies to every place a product photo is rendered: `productCard()` and `kickstandCard()` (small 64×64 thumbnails in 依車型查 results) and `renderProductDetail()` (220×220 detail image in 依產品查). Products with no photo (`image: null`, where the `<img>` is currently `hidden`) are unaffected — nothing to click.

## 2. HTML: shared lightbox markup

A single lightbox structure added once to `index.html`, hidden by default, reused for every image click (not one instance per card):

```html
<div id="lightboxOverlay" class="lightbox-overlay" hidden>
  <div class="lightbox-content">
    <button id="lightboxClose" class="lightbox-close" aria-label="Close">✕</button>
    <img id="lightboxImage" class="lightbox-image" src="" alt="">
    <div class="lightbox-caption">
      <div id="lightboxTitle" class="lightbox-title"></div>
      <div id="lightboxSku" class="lightbox-sku"></div>
    </div>
  </div>
</div>
```

Placed in `index.html` right after `</main>` and before the `<script type="module" src="js/app.js">` tag — plain markup, no ordering dependency on the script.

## 3. CSS: `.lightbox-*` rules

- `.lightbox-overlay`: `position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000;` — covers the viewport, dims the page behind it
- `.lightbox-content`: `position: relative; max-width: 90vw; max-height: 90vh; background: #fff; border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center;`
- `.lightbox-image`: `max-width: 100%; max-height: 70vh; object-fit: contain;`
- `.lightbox-close`: `position: absolute; top: 0.5rem; right: 0.5rem; border: none; background: none; font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0.25rem 0.5rem;`
- `.lightbox-caption`: `margin-top: 1rem; text-align: center;`
- `.lightbox-title`: `font-weight: 600;`
- `.lightbox-sku`: `font-size: 0.85rem; color: #666;`
- `[hidden] { display: none !important; }` is already implied by the browser's default UA stylesheet for the `hidden` attribute — no extra rule needed, consistent with how `#byModelResults` etc. already use bare `hidden`.
- Add `.card-image, .detail-image { cursor: pointer; }` only for images that actually have a real `src` (i.e., not the `hidden` ones — since `hidden` images aren't interactive anyway, applying `cursor: pointer` universally to the class is harmless, the attribute hides them regardless). Add a subtle hover affordance: `.card-image:hover, .detail-image:hover { opacity: 0.85; }`

## 4. JS: `js/app.js`

New function, called from all three render sites:

```js
function openLightbox(src, title, sku) {
  document.getElementById('lightboxImage').src = src;
  document.getElementById('lightboxImage').alt = title;
  document.getElementById('lightboxTitle').textContent = title;
  document.getElementById('lightboxSku').textContent = `SKU: ${sku}`;
  document.getElementById('lightboxOverlay').hidden = false;
}

function closeLightbox() {
  document.getElementById('lightboxOverlay').hidden = true;
}

function setupLightbox() {
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'lightboxOverlay') closeLightbox(); // only backdrop, not content box
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}
```

In `productCard()`, `kickstandCard()`, `renderProductDetail()`: wherever `img.src = imagePath(product.image)` is currently set (only inside the `if (product.image) { ... }` branch, since images without a photo are `hidden` and not clickable), add a click listener:

```js
img.addEventListener('click', () => openLightbox(imagePath(product.image), product.name, product.sku));
```

(substituting `kickstand.image`/`kickstand.name`/`kickstand.sku` in `kickstandCard()`)

`main()` gains one more setup call: `setupLightbox();`

## 5. Closing behavior

Three ways to close, all standard lightbox UX: clicking the ✕ button, clicking the dimmed backdrop (but not the white content box itself — checked via `e.target.id === 'lightboxOverlay'`), or pressing Escape. The Escape listener is attached once at module scope (not per-open), since `closeLightbox()` is a no-op if the overlay is already hidden (setting `hidden = true` on an already-hidden element does nothing harmful).

## 6. i18n

No new translatable strings — SKU/product name are never translated (consistent with existing site-wide rule), and the only UI chrome is the ✕ button (a universal symbol, not language-specific, like the existing search-input icons). No changes needed to `js/i18n.mjs`.

## 7. Testing

No automated test for this DOM/click behavior (consistent with the project's existing strategy: pipeline + matching + i18n string logic are unit tested, DOM interaction is verified via a real browser/Playwright pass). Verification: click a card image and a detail image, confirm the lightbox opens with correct enlarged photo + name + SKU; confirm all three close methods work; confirm products without a photo have no click affordance (cursor stays default, no listener attached since the `if (product.image)` branch is skipped); confirm no console errors.

## 8. What is NOT in scope

- No zoom/pan within the lightbox (just a single enlarged static view)
- No "next/previous" navigation between photos
- No lazy-loading or image-optimization changes
- No changes to the underlying image files or `data/data.json`
