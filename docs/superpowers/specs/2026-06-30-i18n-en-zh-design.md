# i18n English / Chinese Language Toggle — Design

Date: 2026-06-30
Feature: Add English/Chinese language switching to the Fender/Rack/Kickstand compatibility query site, default English.

## 1. Scope

Add a language toggle to the existing static site (`index.html` + `js/app.js`). No backend, no build step, no new npm dependencies — consistent with the project's zero-dependency philosophy. Source data (`data.json`, kickstand text blocks, compat notes) stays English-only; only UI text is translated.

## 2. New File: `js/i18n.mjs`

Single source of truth for all translatable strings. Exports:

- `TRANSLATIONS`: `{ en: {…}, zh: {…} }` — full key/value maps for both languages
- `t(key)`: returns the current language's string for `key`; falls back to `key` itself if missing (never crashes)
- `getLang()`: returns `'en'` or `'zh'`
- `setLang(lang)`: sets the current language and persists it to `localStorage`

Default language: `localStorage.getItem('lang') || 'en'` — English unless the user previously switched.

### Translation keys (full list)

| Key | English | Chinese |
|---|---|---|
| `byModel` | By Model | 依車型查 |
| `byProduct` | By Product | 依產品查 |
| `selectModel` | Select bike model | 選擇車型 |
| `modelSearchPlaceholder` | Search bike model... | 輸入車型名稱搜尋... |
| `showAll` | Show all (incl. not compatible) | 顯示全部(含不適用) |
| `compatibleFenders` | Compatible Fenders | 適用 Fender |
| `compatibleRacks` | Compatible Racks | 適用 Rack |
| `possibleKickstands` | Possible Kickstands | 可能適用的 Kickstand |
| `productSearchPlaceholder` | Search product name or SKU... | 輸入產品名稱或 SKU 搜尋... |
| `selectProduct` | Select a product from the left | 請從左側選擇一個產品 |
| `statusYes` | Compatible | 適用 |
| `statusNo` | Not compatible | 不適用 |
| `statusAccessory` | Accessory only | 僅限配件或特定情況 |
| `note` | Note | 備註 |
| `noCompatibleItems` | No compatible items | 沒有符合的項目 |
| `bike` | [Bike] | [一般車] |
| `ebike` | [E-Bike] | [電動車] |
| `kickstandDisclaimer` | ⚠️ Approximate match by model name — verify the model year in the list above | ⚠️ 依車型名稱粗略比對,請自行核對年份與型號是否相符 |
| `kickstandNoMatch` | No match found. See the Kickstand tab in "By Product" view for the full list. | 未找到相符項目,請參考「依產品查」的 Kickstand 完整列表 |
| `compatBikes` | Compatible bikes | 適用一般車型 |
| `compatEbikes` | Compatible e-bikes | 適用電動車型 |
| `noData` | No data | 無資料 |
| `loadError` | Failed to load data | 載入資料失敗 |

## 3. Changes to `index.html`

- Change `<html lang="zh-Hant">` to `<html lang="en">` (default English; JS updates this on switch)
- Add `data-i18n="<key>"` attributes to every static text element (button labels, section headers `<h2>`, label text, empty-hint `<p>`)
- Add `data-i18n-placeholder="<key>"` to the two search `<input>` elements
- Add a language toggle `<button id="langToggle">中文</button>` in the `.app-header`, right-aligned, showing the OTHER language (what the user would switch to)
- All default textContent stays in English — the page is readable without JS

### Elements that need `data-i18n`

`#modeTabs button[data-mode="by-model"]`, `#modeTabs button[data-mode="by-product"]`, `label[for="modelSearch"]`, `#byModelShowAll`'s label text, the three `<h2>` in `.results-grid`, `#byProductView .category-tabs` already has text content (Fender/Rack/Kickstand — these are brand/product-type names, NOT translated), `#productDetail p.empty-hint`.

Note: the three category-tab labels (Fender / Rack / Kickstand) are product category names shared across both languages — they are NOT translated.

### `data-i18n-placeholder`

`#modelSearch` and `#productSearch`.

## 4. Changes to `js/app.js`

- Add `import { t, getLang, setLang } from './i18n.mjs';` at the top
- Replace every hardcoded Chinese/English string with `t('key')` calls
- `renderLegend()`: build `STATUS_LABEL` from `t('statusYes')` / `t('statusNo')` / `t('statusAccessory')` instead of from `DATA.legend` values (which are Chinese-only in `data.json`)
- Add `function applyI18n()`: sweeps all `data-i18n` and `data-i18n-placeholder` elements and `document.documentElement.lang`, updates them to current language
- Add `function setupLangToggle()`: wires the `#langToggle` button — on click: `setLang(next)`, `applyI18n()`, update `#langToggle` button label, re-render any currently visible dynamic content (call the same `refresh()` closures that already exist inside `setupByModelView` and `setupByProductView`, or trigger a forced re-render)
- Update `main()` to call `applyI18n()` (initial sweep after data load) and `setupLangToggle()`

### Re-render on language switch

The currently-selected model (if any) and the currently-displayed product detail (if any) need to be re-rendered when the language switches, because their content was rendered at selection time using the old `t()` values.

**Approach:** promote `currentModel` and `currentCategory` + `currentProduct` state variables to the enclosing `main()` scope (or module scope), and have `setupLangToggle` call the render functions directly. Alternatively, expose `refresh()` callbacks from `setupByModelView`/`setupByProductView` by returning them from those functions and storing them at module scope.

The simplest, least-refactoring approach: store `let refreshByModel = null` and `let refreshByProduct = null` at module level; `setupByModelView`/`setupByProductView` assign to them; `setupLangToggle` calls whichever is non-null after a language switch.

## 5. What is NOT translated

- Product names, SKU codes, bike model names — all English from the Excel source, unchanged in both modes
- Compat matrix note text (`entry.note`): already English in `data.json` ("need adapter", "need the seat tube strap mounting kit") — shown as-is in both language modes
- Kickstand `compatibleBikesText` / `compatibleEbikesText`: raw text from the Excel, English model names with year codes — shown as-is in both modes
- Category tab labels "Fender", "Rack", "Kickstand": product category names, not translated

## 6. CSS changes

Minimal. The lang toggle button needs basic styling (small pill button in the header, right-aligned). The existing `.mode-tab`/`.category-tab` styles handle variable-length text via `padding` not fixed `width`, so longer English labels should render fine.

## 7. Testing

No automated tests for DOM-manipulation code (consistent with project strategy). Manual verification (Playwright or local browser) should confirm:
- Page loads in English by default
- Legend badges use English labels
- Toggling to Chinese switches all static text + re-renders current results
- Toggling back to English works
- Language choice persists across page reload (via localStorage)
- No JS errors in either mode

## 8. Files changed

- Create: `js/i18n.mjs`
- Modify: `index.html` (add `data-i18n` attributes, lang toggle button, change `lang="en"`)
- Modify: `js/app.js` (import i18n, replace string literals, add `applyI18n`/`setupLangToggle`, update `renderLegend`)
