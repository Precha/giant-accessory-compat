# Clickable Product Photo Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every product photo on the site clickable, opening a shared lightbox popup with an enlarged photo, product name, and SKU, closable via an X button, backdrop click, or Escape key.

**Architecture:** A single hidden lightbox `<div>` added once to `index.html`, populated and shown/hidden by three small functions in `js/app.js` (`openLightbox`, `closeLightbox`, `setupLightbox`). Every place a product `<img>` is currently created (`productCard`, `kickstandCard`, `renderProductDetail`) gets one new `click` listener that calls `openLightbox`. New `.lightbox-*` CSS rules plus a `cursor: pointer` + hover affordance on the existing `.card-image`/`.detail-image` rules.

**Tech Stack:** Vanilla DOM/CSS, no new dependencies. No automated tests for this task (DOM/click behavior, consistent with the project's existing strategy) — verified via a real browser (Playwright) pass.

**Spec:** `docs/superpowers/specs/2026-06-30-image-lightbox-design.md`

---

## Task 1: Lightbox markup + CSS

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add the lightbox markup to `index.html`**

Insert this block right after the closing `</main>` tag and before the `<script type="module" src="js/app.js"></script>` line:

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

The full file should read exactly:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fender / Rack / Kickstand Compatibility</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="app-header">
  <h1>Fender / Rack / Kickstand Compatibility</h1>
  <button id="langToggle" class="lang-toggle">中文</button>
  <div class="legend" id="legend"></div>
</header>

<nav class="mode-tabs" id="modeTabs">
  <button class="mode-tab active" data-mode="by-model" data-i18n="byModel">By Model</button>
  <button class="mode-tab" data-mode="by-product" data-i18n="byProduct">By Product</button>
</nav>

<main>
  <section id="byModelView" class="view">
    <div class="search-field">
      <label for="modelSearch" data-i18n="selectModel">Select bike model</label>
      <input type="text" id="modelSearch" placeholder="Search bike model..."
             data-i18n-placeholder="modelSearchPlaceholder" autocomplete="off">
      <ul id="modelOptions" class="option-list" hidden></ul>
    </div>
    <div class="show-all-toggle">
      <label>
        <input type="checkbox" id="byModelShowAll">
        <span data-i18n="showAll">Show all (incl. not compatible)</span>
      </label>
    </div>
    <div class="results-grid" id="byModelResults" hidden>
      <div class="result-column">
        <h2 data-i18n="compatibleFenders">Compatible Fenders</h2>
        <div class="card-list" id="fenderResults"></div>
      </div>
      <div class="result-column">
        <h2 data-i18n="compatibleRacks">Compatible Racks</h2>
        <div class="card-list" id="rackResults"></div>
      </div>
      <div class="result-column">
        <h2 data-i18n="possibleKickstands">Possible Kickstands</h2>
        <div class="card-list" id="kickstandResults"></div>
      </div>
    </div>
  </section>

  <section id="byProductView" class="view" hidden>
    <nav class="category-tabs" id="categoryTabs">
      <button class="category-tab active" data-category="fenders">Fender</button>
      <button class="category-tab" data-category="racks">Rack</button>
      <button class="category-tab" data-category="kickstands">Kickstand</button>
    </nav>
    <div class="product-layout">
      <div class="product-list-pane">
        <input type="text" id="productSearch" placeholder="Search product name or SKU..."
               data-i18n-placeholder="productSearchPlaceholder" autocomplete="off">
        <ul class="option-list" id="productOptions"></ul>
      </div>
      <div class="product-detail-pane" id="productDetail">
        <p class="empty-hint" data-i18n="selectProduct">Select a product from the left</p>
      </div>
    </div>
  </section>
</main>

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

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add `cursor: pointer` to the two existing image rules in `css/style.css`**

Find this line:
```css
.card-image { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }
```
Replace with:
```css
.card-image { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; cursor: pointer; }
```

Find this line:
```css
.detail-image { max-width: 220px; max-height: 220px; object-fit: contain; display: block; margin-bottom: 1rem; }
```
Replace with:
```css
.detail-image { max-width: 220px; max-height: 220px; object-fit: contain; display: block; margin-bottom: 1rem; cursor: pointer; }
```

- [ ] **Step 3: Append the lightbox + hover CSS to the end of `css/style.css`**

The file currently ends with:
```css
.empty-hint { color: #888; font-size: 0.9rem; }
```

Append this after it:

```css

.card-image:hover, .detail-image:hover { opacity: 0.85; }

.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lightbox-image { max-width: 100%; max-height: 70vh; object-fit: contain; }

.lightbox-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem 0.5rem;
}

.lightbox-caption { margin-top: 1rem; text-align: center; }
.lightbox-title { font-weight: 600; }
.lightbox-sku { font-size: 0.85rem; color: #666; }
```

- [ ] **Step 4: Verify structurally**

Run: `grep -c "lightbox" index.html`
Expected: at least `7` (the overlay div, content div, close button id+class, image id+class, caption/title/sku divs — multiple `lightbox` substring occurrences)

Run: `grep -c "lightbox" css/style.css`
Expected: at least `7` (one selector line per rule: `.lightbox-overlay`, `.lightbox-content`, `.lightbox-image`, `.lightbox-close`, `.lightbox-caption`, `.lightbox-title`, `.lightbox-sku` — the rule bodies themselves don't repeat the word "lightbox", just the selector line for each)

Run: `grep -o '\.lightbox-[a-z]*' css/style.css | sort -u`
Expected exactly these 7 distinct class names, one per line: `.lightbox-caption`, `.lightbox-close`, `.lightbox-content`, `.lightbox-image`, `.lightbox-overlay`, `.lightbox-sku`, `.lightbox-title`

- [ ] **Step 5: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add index.html css/style.css
git commit -m "$(cat <<'EOF'
Add lightbox markup and styles for clickable product photos

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire up the lightbox in `js/app.js`

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Replace `js/app.js` with the lightbox-wired version**

Write the full file at `js/app.js`:

```js
import { findKickstandMatches } from './matching.mjs';
import { t, getLang, setLang } from './i18n.mjs';

const STATUS_SYMBOL = { yes: '○', no: 'X', accessory: '–' };
const STATUS_CLASS = { yes: 'status-yes', no: 'status-no', accessory: 'status-accessory' };

let DATA = null;
let STATUS_LABEL = null;
let refreshByModel = () => {};   // replaced by setupByModelView; called on language switch
let refreshByProduct = () => {}; // replaced by setupByProductView; called on language switch

async function loadData() {
  const res = await fetch('data/data.json');
  if (!res.ok) throw new Error(`failed to load data.json: ${res.status}`);
  return res.json();
}

// Image paths in data.json are relative to data/data.json's own directory
// (e.g. "images/fender/530000050.jpeg"), not to the page root.
function imagePath(relPath) {
  return `data/${relPath}`;
}

function renderLegend() {
  STATUS_LABEL = {
    yes: `${STATUS_SYMBOL.yes} ${t('statusYes')}`,
    no: `${STATUS_SYMBOL.no} ${t('statusNo')}`,
    accessory: `${STATUS_SYMBOL.accessory} ${t('statusAccessory')}`,
  };
  const el = document.getElementById('legend');
  el.innerHTML = `
    <span class="legend-item status-yes">${STATUS_LABEL.yes}</span>
    <span class="legend-item status-no">${STATUS_LABEL.no}</span>
    <span class="legend-item status-accessory">${STATUS_LABEL.accessory}</span>
  `;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en';
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.textContent = getLang() === 'en' ? '中文' : 'EN';
}

function setupLangToggle() {
  const btn = document.getElementById('langToggle');
  btn.addEventListener('click', () => {
    const next = getLang() === 'en' ? 'zh' : 'en';
    setLang(next);
    applyI18n();
    renderLegend();
    refreshByModel();
    refreshByProduct();
  });
}

function setupModeTabs() {
  const tabs = document.querySelectorAll('.mode-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((each) => each.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      document.getElementById('byModelView').hidden = mode !== 'by-model';
      document.getElementById('byProductView').hidden = mode !== 'by-product';
    });
  });
}

function setupSearchableSelect(inputEl, listEl, items, labelFn, onSelect) {
  function renderOptions(filterText) {
    const filtered = items.filter((item) => labelFn(item).toLowerCase().includes(filterText.toLowerCase()));
    listEl.innerHTML = '';
    filtered.slice(0, 50).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = labelFn(item);
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        inputEl.value = labelFn(item);
        listEl.hidden = true;
        onSelect(item);
      });
      listEl.appendChild(li);
    });
    listEl.hidden = filtered.length === 0;
  }

  inputEl.addEventListener('focus', () => renderOptions(inputEl.value));
  inputEl.addEventListener('input', () => renderOptions(inputEl.value));
  inputEl.addEventListener('blur', () => {
    setTimeout(() => { listEl.hidden = true; }, 100); // focus-loss cleanup after mousedown click-race window
  });
}

function statusBadge(entry) {
  const span = document.createElement('span');
  span.className = `badge ${STATUS_CLASS[entry.status]}`;
  span.textContent = STATUS_LABEL[entry.status];
  return span;
}

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
    if (e.target.id === 'lightboxOverlay') closeLightbox(); // backdrop only, not the content box
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function productCard(product, entry) {
  const card = document.createElement('div');
  card.className = 'card';
  const img = document.createElement('img');
  img.className = 'card-image';
  if (product.image) {
    img.src = imagePath(product.image);
    img.alt = product.name;
    img.addEventListener('click', () => openLightbox(imagePath(product.image), product.name, product.sku));
  } else {
    img.hidden = true;
  }
  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `<div class="card-title">${product.name}</div><div class="card-sku">SKU: ${product.sku}</div>`;
  body.appendChild(statusBadge(entry));
  if (entry.note) {
    const note = document.createElement('div');
    note.className = 'card-note';
    note.textContent = `${t('note')}: ${entry.note}`;
    body.appendChild(note);
  }
  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function renderProductResults(containerEl, products, modelId, showAll) {
  containerEl.innerHTML = '';
  const entries = products
    .map((p) => ({ product: p, entry: DATA.compat[modelId][p.id] }))
    .filter(({ entry }) => showAll || entry.status !== 'no');
  if (entries.length === 0) {
    containerEl.innerHTML = `<p class="empty-hint">${t('noCompatibleItems')}</p>`;
    return;
  }
  entries.forEach(({ product, entry }) => containerEl.appendChild(productCard(product, entry)));
}

function kickstandCard(kickstand, hits) {
  const card = document.createElement('div');
  card.className = 'card';
  const img = document.createElement('img');
  img.className = 'card-image';
  if (kickstand.image) {
    img.src = imagePath(kickstand.image);
    img.alt = kickstand.name;
    img.addEventListener('click', () => openLightbox(imagePath(kickstand.image), kickstand.name, kickstand.sku));
  } else {
    img.hidden = true;
  }
  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `<div class="card-title">${kickstand.name}</div><div class="card-sku">SKU: ${kickstand.sku}</div>`;
  const list = document.createElement('ul');
  list.className = 'hit-list';
  hits.forEach((hit) => {
    const li = document.createElement('li');
    li.textContent = `${hit.type === 'ebike' ? t('ebike') : t('bike')} ${hit.line}`;
    list.appendChild(li);
  });
  body.appendChild(list);
  const warn = document.createElement('div');
  warn.className = 'card-note';
  warn.textContent = t('kickstandDisclaimer');
  body.appendChild(warn);
  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function renderKickstandResults(containerEl, modelName) {
  containerEl.innerHTML = '';
  const matches = findKickstandMatches(modelName, DATA.kickstands);
  if (matches.length === 0) {
    containerEl.innerHTML = `<p class="empty-hint">${t('kickstandNoMatch')}</p>`;
    return;
  }
  matches.forEach(({ kickstand, hits }) => containerEl.appendChild(kickstandCard(kickstand, hits)));
}

function setupByModelView() {
  const input = document.getElementById('modelSearch');
  const list = document.getElementById('modelOptions');
  const showAllCheckbox = document.getElementById('byModelShowAll');
  const resultsEl = document.getElementById('byModelResults');
  let currentModel = null;

  function refresh() {
    if (!currentModel) return;
    renderProductResults(document.getElementById('fenderResults'), DATA.fenders, currentModel.id, showAllCheckbox.checked);
    renderProductResults(document.getElementById('rackResults'), DATA.racks, currentModel.id, showAllCheckbox.checked);
    renderKickstandResults(document.getElementById('kickstandResults'), currentModel.name);
    resultsEl.hidden = false;
  }

  refreshByModel = refresh;

  setupSearchableSelect(
    input,
    list,
    DATA.models,
    (m) => `${m.brand} ${m.name}`,
    (model) => { currentModel = model; refresh(); }
  );
  showAllCheckbox.addEventListener('change', refresh);
}

function textToList(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return `<p class="empty-hint">${t('noData')}</p>`;
  return '<ul class="plain-list">' + lines.map((l) => `<li>${l}</li>`).join('') + '</ul>';
}

function renderProductDetail(category, product) {
  const pane = document.getElementById('productDetail');
  pane.innerHTML = '';

  if (product.image) {
    const img = document.createElement('img');
    img.className = 'detail-image';
    img.src = imagePath(product.image);
    img.alt = product.name;
    img.addEventListener('click', () => openLightbox(imagePath(product.image), product.name, product.sku));
    pane.appendChild(img);
  }

  const header = document.createElement('div');
  header.innerHTML = `<h2>${product.name}</h2><p>SKU: ${product.sku}</p>`;
  pane.appendChild(header);

  if (category === 'kickstands') {
    const bikesBlock = document.createElement('div');
    bikesBlock.innerHTML = `<h3>${t('compatBikes')}</h3>` + textToList(product.compatibleBikesText);
    const ebikesBlock = document.createElement('div');
    ebikesBlock.innerHTML = `<h3>${t('compatEbikes')}</h3>` + textToList(product.compatibleEbikesText);
    pane.appendChild(bikesBlock);
    pane.appendChild(ebikesBlock);
    return;
  }

  const toggleLabel = document.createElement('label');
  toggleLabel.innerHTML = `<input type="checkbox" id="byProductShowAll"> ${t('showAll')}`;
  pane.appendChild(toggleLabel);

  const grouped = document.createElement('div');
  pane.appendChild(grouped);

  function refresh() {
    const showAll = document.getElementById('byProductShowAll').checked;
    grouped.innerHTML = '';
    ['GIANT', 'Liv'].forEach((brand) => {
      const rows = DATA.models
        .filter((m) => m.brand === brand)
        .map((m) => ({ model: m, entry: DATA.compat[m.id][product.id] }))
        .filter(({ entry }) => showAll || entry.status !== 'no');
      if (rows.length === 0) return;
      const section = document.createElement('div');
      section.innerHTML = `<h3>${brand}</h3>`;
      const ul = document.createElement('ul');
      ul.className = 'model-status-list';
      rows.forEach(({ model, entry }) => {
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(`${model.name} `));
        li.appendChild(statusBadge(entry));
        if (entry.note) {
          const note = document.createElement('span');
          note.className = 'card-note';
          note.textContent = ` (${entry.note})`;
          li.appendChild(note);
        }
        ul.appendChild(li);
      });
      section.appendChild(ul);
      grouped.appendChild(section);
    });
  }

  toggleLabel.querySelector('input').addEventListener('change', refresh);
  refresh();
}

function setupByProductView() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  const searchInput = document.getElementById('productSearch');
  const optionsList = document.getElementById('productOptions');
  let currentCategory = 'fenders';
  let currentProduct = null;

  function renderOptions(filterText) {
    const items = DATA[currentCategory].filter((p) =>
      `${p.name} ${p.sku}`.toLowerCase().includes(filterText.toLowerCase())
    );
    optionsList.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.addEventListener('click', () => {
        currentProduct = item;
        renderProductDetail(currentCategory, item);
      });
      optionsList.appendChild(li);
    });
  }

  refreshByProduct = () => {
    if (currentProduct) renderProductDetail(currentCategory, currentProduct);
  };

  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach((each) => each.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      currentProduct = null;
      searchInput.value = '';
      document.getElementById('productDetail').innerHTML = `<p class="empty-hint">${t('selectProduct')}</p>`;
      renderOptions('');
    });
  });

  searchInput.addEventListener('input', () => renderOptions(searchInput.value));
  renderOptions('');
}

async function main() {
  DATA = await loadData();
  applyI18n();
  renderLegend();
  setupModeTabs();
  setupLangToggle();
  setupLightbox();
  setupByModelView();
  setupByProductView();
}

main().catch((err) => {
  document.body.innerHTML = `<p style="color:red;padding:2rem">${t('loadError')}: ${err.message}</p>`;
  console.error(err);
});
```

Key changes vs the previous `app.js`:
- New `openLightbox(src, title, sku)`, `closeLightbox()`, `setupLightbox()` functions, placed between `statusBadge()` and `productCard()`
- `productCard()`: inside the `if (product.image) { ... }` branch, adds `img.addEventListener('click', () => openLightbox(...))`
- `kickstandCard()`: same pattern, inside `if (kickstand.image) { ... }`
- `renderProductDetail()`: same pattern, inside `if (product.image) { ... }`
- `main()`: adds `setupLightbox();` call (placed after `setupLangToggle()`, before `setupByModelView()`)
- Everything else byte-identical to the prior version

- [ ] **Step 2: Verify JS syntax**

Run: `cd "Fender Rack Kickstand compatibility inquiry" && node --check js/app.js && echo "syntax ok"`
Expected: `syntax ok`

- [ ] **Step 3: Run all existing tests to confirm no regressions**

Run: `cd scripts && python3 -m unittest test_extract_data -v 2>&1 | tail -3 && cd .. && node --test js/matching.test.mjs 2>&1 | tail -6 && node --test js/i18n.test.mjs 2>&1 | tail -6`
Expected: `OK` from Python (17 tests), `# pass 4  # fail 0` from matching, `# pass 6  # fail 0` from i18n. (These suites don't test the lightbox — it has no automated tests per the spec — but must still pass unaffected.)

- [ ] **Step 4: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add js/app.js
git commit -m "$(cat <<'EOF'
Wire clickable lightbox into product card and detail images

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Browser verification

**Files:** none (verification only)

This task has no automated test — it's a real-browser pass, consistent with how this project verifies all DOM/click behavior. The controller (not a subagent) performs this task directly using Playwright, since prior real-browser passes in this project have caught integration bugs (broken image paths, a lang-toggle persistence bug, a CSS class collision) that static analysis and code review missed.

- [ ] **Step 1: Start a local server and run a Playwright check covering:**
  - A card image (in 依車型查/By Model results) is clickable, opens the lightbox with the correct enlarged image, product name, and SKU
  - A kickstand card image opens the lightbox correctly too
  - A detail image (in 依產品查/By Product) opens the lightbox correctly
  - The ✕ button closes the lightbox
  - Clicking the dimmed backdrop (outside the white content box) closes the lightbox
  - Pressing Escape closes the lightbox
  - Clicking *inside* the white content box (e.g. on the image itself) does NOT close the lightbox
  - Hovering a clickable image shows `cursor: pointer` (check via computed style, e.g. `getComputedStyle(el).cursor === 'pointer'`)
  - No console or network errors throughout
  - Works correctly in both English and Chinese language modes (toggle language, confirm SKU/name still show correctly — they're untranslated by design, so should be identical text in both modes)

- [ ] **Step 2: Fix forward** any issues found, re-verify, then commit any fixes as a new commit with a clear message.
