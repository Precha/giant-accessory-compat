# Fender / Rack / Kickstand 相容性查詢網頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, dependency-free webpage where staff can look up Fender/Rack/Kickstand compatibility either by bike model or by product, using data extracted from `Rack_Fender_Kickstand_Compatibility_202507update.xlsx`.

**Architecture:** A one-time Python build script (`scripts/extract_data.py`) parses the xlsx (including embedded product photos via the OOXML drawing relationships) into `data/data.json` + `data/images/**`. A vanilla-JS static site (`index.html`, `css/style.css`, `js/app.js`, `js/matching.mjs`) reads that JSON at runtime and renders two interchangeable views: "依車型查" and "依產品查". No backend, no build step, no npm dependencies.

**Tech Stack:** Python 3 + openpyxl (already installed) for the data pipeline, `unittest` (stdlib) for Python tests, plain HTML/CSS/JS for the frontend, Node's built-in `node:test`/`node:assert` (Node v25 is installed) for testing the pure JS matching logic.

**Spec:** `docs/superpowers/specs/2026-06-29-fender-rack-kickstand-compatibility-design.md`

---

## Background the engineer needs (do not re-derive — this was already verified against the real file)

The workbook has two sheets:

- **`Fender_Rack`**: row 2 has the literal strings `"Fender"` and `"Rack"` marking where each product group's columns start (col 3 and col 25, 1-indexed). Row 3 holds product names, row 4 holds SKUs, columns run from the "Fender" start column up to (but not including) the first column past "Rack" whose row-3 name cell is empty. Column 1 holds brand markers (`"GIANT"` at row 6, `"Liv"` at row 28) and is `None` everywhere else; column 2 holds the bike model name on every actual model row. Rows 7–27 are the 21 GIANT models, rows 29–42 are the 14 Liv models (35 total). Every model row × every product column (cols 3–40) is populated — there are no blank compatibility cells once you skip the two brand-marker rows.
- Compatibility cell values are one of exactly these forms (verified against every cell in the matrix): the literal string `"X"` (not compatible), the single soft-hyphen character `"\xad"` (accessory/special-case only), the circle character `"○"` alone (compatible), or `"○"` followed by a newline and a note such as `"* need adapter"` / `"*need adapter"` / `"*need the seat tube strap moutning kit"` (compatible with a note; note the source typo "moutning" which should be corrected to "mounting" in the cleaned note text).
- Product photos are embedded pictures anchored via `xl/drawings/drawing1.xml` (this sheet's drawing, confirmed via `xl/worksheets/_rels/sheet1.xml.rels`). Anchors with `from.row == 4` (0-indexed, i.e. row 5 in the sheet) are the product-photo row; an anchor's `from.col` (0-indexed) plus 1 gives the 1-indexed data column it belongs to. The actual image bytes live at `xl/media/<file>` where `<file>` is the last path segment of the `Target` attribute in `xl/drawings/_rels/drawing1.xml.rels` for the anchor's `r:embed` relationship id.
- **`Kickstand`**: row 2 is the header (`SKU`, `EAN CODE`, `PHOTO`, `MODEL NAME`, `Compatible bikes`, `Compatible E-Bikes`). Data rows start at row 3 and currently run through row 5 (3 kickstand SKUs) — iterate until the SKU cell (column 1) is empty rather than hardcoding the row count, since this file gets periodic updates. Column 4 is the product name, column 5 is a newline-separated block of compatible regular-bike model+year strings (e.g. `"Roam MY21+"`), column 6 is the same for e-bikes. Product photos are anchored via `xl/drawings/drawing2.xml` / `xl/worksheets/_rels/sheet2.xml.rels`; here each anchor's `from.row` (0-indexed) plus 1 directly gives the 1-indexed data row (column is always the same).
- The Kickstand sheet's compatibility text uses a completely different model-naming scheme (base name + model year, no GIANT/Liv split) than the `Fender_Rack` matrix's clean model list, so it cannot be joined as a matrix. Per the approved spec, matching is done client-side by comparing the **first word** of the selected model name (lowercased) against the **first word** of each line in the Kickstand text blocks — this was checked against all 35 model names and all Kickstand text lines and produces correct groupings (e.g. `"Talon 27.5"` and `"Talon 29er"` both reduce to root `"talon"`, matching `"Talon MY24+"` and `"Talon E+ MY21/ MY23"`).

---

## Task 1: Data pipeline — pure helper functions (TDD)

**Files:**
- Create: `scripts/extract_data.py`
- Create: `scripts/test_extract_data.py`

- [ ] **Step 1: Write failing tests for the three pure helpers**

Create `scripts/test_extract_data.py`:

```python
import unittest

from extract_data import parse_compat_cell, sanitize_sku, slugify


class SlugifyTests(unittest.TestCase):
    def test_brand_and_name_become_hyphenated_lowercase_id(self):
        self.assertEqual(slugify("GIANT-ATX 27.5"), "giant-atx-27-5")
        self.assertEqual(slugify("Liv-Alight"), "liv-alight")

    def test_collapses_repeated_separators(self):
        self.assertEqual(slugify("Liv-Talon 29er"), "liv-talon-29er")


class SanitizeSkuTests(unittest.TestCase):
    def test_plain_numeric_sku_is_unchanged(self):
        self.assertEqual(sanitize_sku(530000050), "530000050")

    def test_sku_with_parenthetical_alt_code_is_hyphenated(self):
        self.assertEqual(sanitize_sku("710613 (711004)"), "710613-711004")
        self.assertEqual(sanitize_sku("440000003 (71053)"), "440000003-71053")


class ParseCompatCellTests(unittest.TestCase):
    def test_plain_circle_is_yes(self):
        self.assertEqual(parse_compat_cell("○"), {"status": "yes"})

    def test_x_is_no(self):
        self.assertEqual(parse_compat_cell("X"), {"status": "no"})

    def test_soft_hyphen_is_accessory(self):
        self.assertEqual(parse_compat_cell("\xad"), {"status": "accessory"})

    def test_circle_with_note_strips_asterisk_and_whitespace(self):
        self.assertEqual(
            parse_compat_cell("○\n* need adapter"),
            {"status": "yes", "note": "need adapter"},
        )
        self.assertEqual(
            parse_compat_cell("○\n*need adapter"),
            {"status": "yes", "note": "need adapter"},
        )

    def test_circle_with_note_fixes_source_typo(self):
        self.assertEqual(
            parse_compat_cell("○\n*need the seat tube strap moutning kit"),
            {"status": "yes", "note": "need the seat tube strap mounting kit"},
        )

    def test_none_raises(self):
        with self.assertRaises(ValueError):
            parse_compat_cell(None)

    def test_unrecognized_symbol_raises(self):
        with self.assertRaises(ValueError):
            parse_compat_cell("???")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail with ImportError**

Run: `cd "Fender Rack Kickstand compatibility inquiry/scripts" && python3 -m unittest test_extract_data -v`
Expected: `ModuleNotFoundError: No module named 'extract_data'` (the file doesn't exist yet)

- [ ] **Step 3: Create `scripts/extract_data.py` with just the three pure helpers**

```python
#!/usr/bin/env python3
"""Convert Rack_Fender_Kickstand_Compatibility_202507update.xlsx into data/data.json + data/images/."""
import re


def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def sanitize_sku(raw_sku):
    text = str(raw_sku).strip()
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    return text.strip("-")


def parse_compat_cell(raw):
    if raw is None:
        raise ValueError("compatibility cell is empty")
    text = str(raw).strip()
    if text == "\xad":
        return {"status": "accessory"}
    if text == "X":
        return {"status": "no"}
    if text.startswith("○"):
        rest = text[1:].strip()
        if not rest:
            return {"status": "yes"}
        note = rest.lstrip("*").strip()
        note = note.replace("moutning", "mounting")
        return {"status": "yes", "note": note}
    raise ValueError(f"unrecognized compatibility symbol: {raw!r}")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "Fender Rack Kickstand compatibility inquiry/scripts" && python3 -m unittest test_extract_data -v`
Expected: all 9 tests `ok`, `OK` summary line

- [ ] **Step 5: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add scripts/extract_data.py scripts/test_extract_data.py
git commit -m "$(cat <<'EOF'
Add pure helper functions for the xlsx-to-JSON data pipeline

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Data pipeline — full extraction and image export

**Files:**
- Modify: `scripts/extract_data.py`
- Modify: `scripts/test_extract_data.py`

- [ ] **Step 1: Add the structural extraction functions to `scripts/extract_data.py`**

Append to `scripts/extract_data.py` (keep the existing `slugify`/`sanitize_sku`/`parse_compat_cell` above this):

```python
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "Rack_Fender_Kickstand_Compatibility_202507update.xlsx"
DATA_DIR = ROOT / "data"
IMAGES_DIR = DATA_DIR / "images"

DRAWING_NS = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
REL_EMBED_ATTR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"


def find_group_start(ws, label, header_row=2, max_col=80):
    for c in range(1, max_col):
        if ws.cell(header_row, c).value == label:
            return c
    raise ValueError(f"could not find column group {label!r}")


def find_group_end(ws, start_col, name_row=3, max_col=80):
    c = start_col
    while c <= max_col and ws.cell(name_row, c).value is not None:
        c += 1
    return c


def extract_models(ws):
    """Returns (models_for_json, [(row, model) for compat lookup])."""
    models = []
    model_rows = []
    current_brand = None
    for r in range(1, ws.max_row + 1):
        brand_cell = ws.cell(r, 1).value
        name_cell = ws.cell(r, 2).value
        if brand_cell in ("GIANT", "Liv"):
            current_brand = brand_cell
            continue
        if current_brand is None or not name_cell:
            continue
        name = str(name_cell).strip()
        model = {"id": slugify(f"{current_brand}-{name}"), "brand": current_brand, "name": name}
        models.append(model)
        model_rows.append((r, model))
    return models, model_rows


def load_picture_anchors(zf, drawing_path, rels_path):
    rels = {el.get("Id"): el.get("Target") for el in ET.fromstring(zf.read(rels_path))}
    anchors = []
    for anchor in ET.fromstring(zf.read(drawing_path)):
        frm = anchor.find("xdr:from", DRAWING_NS)
        if frm is None:
            continue
        col = int(frm.find("xdr:col", DRAWING_NS).text)
        row = int(frm.find("xdr:row", DRAWING_NS).text)
        blip = anchor.find(".//a:blip", DRAWING_NS)
        if blip is None:
            continue
        rid = blip.get(REL_EMBED_ATTR)
        target = rels.get(rid)
        if target:
            anchors.append((col, row, "xl/media/" + target.split("/")[-1]))
    return anchors


def save_image(zf, media_zip_path, dest_dir, base_name):
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(media_zip_path).suffix
    dest = dest_dir / f"{base_name}{ext}"
    dest.write_bytes(zf.read(media_zip_path))
    return dest


def extract_products(ws, zf, anchors, col_range, category):
    picture_row0 = 4  # row 5 (1-indexed) holds product photos
    col_to_media = {col + 1: media for col, row, media in anchors if row == picture_row0}
    products = []
    col_to_id = {}
    dest_dir = IMAGES_DIR / category
    for col in col_range:
        name = ws.cell(3, col).value
        raw_sku = ws.cell(4, col).value
        if name is None or raw_sku is None:
            continue
        name = " ".join(str(name).split())
        pid = sanitize_sku(raw_sku)
        image_rel = None
        media = col_to_media.get(col)
        if media:
            dest = save_image(zf, media, dest_dir, pid)
            image_rel = f"images/{category}/{dest.name}"
        products.append({"id": pid, "sku": str(raw_sku).strip(), "name": name, "image": image_rel})
        col_to_id[col] = pid
    return products, col_to_id


def extract_compat(ws, model_rows, *col_to_id_maps):
    col_to_id = {}
    for m in col_to_id_maps:
        col_to_id.update(m)
    compat = {}
    for row, model in model_rows:
        entry = {}
        for col, pid in col_to_id.items():
            entry[pid] = parse_compat_cell(ws.cell(row, col).value)
        compat[model["id"]] = entry
    return compat


def extract_kickstands(ws, zf, anchors):
    col_to_media = {row + 1: media for _col, row, media in anchors}
    dest_dir = IMAGES_DIR / "kickstand"
    products = []
    for r in range(3, ws.max_row + 1):
        raw_sku = ws.cell(r, 1).value
        if raw_sku is None:
            continue
        sku = str(raw_sku).strip()
        name = str(ws.cell(r, 4).value or "").strip()
        bikes_text = str(ws.cell(r, 5).value or "").strip()
        ebikes_text = str(ws.cell(r, 6).value or "").strip()
        image_rel = None
        media = col_to_media.get(r)
        if media:
            dest = save_image(zf, media, dest_dir, sku)
            image_rel = f"images/kickstand/{dest.name}"
        products.append(
            {
                "id": sku,
                "sku": sku,
                "name": name,
                "image": image_rel,
                "compatibleBikesText": bikes_text,
                "compatibleEbikesText": ebikes_text,
            }
        )
    return products


def build_data(xlsx_path=XLSX_PATH):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws_fr = wb["Fender_Rack"]
    ws_ks = wb["Kickstand"]

    fender_start = find_group_start(ws_fr, "Fender")
    rack_start = find_group_start(ws_fr, "Rack")
    rack_end = find_group_end(ws_fr, rack_start)

    models, model_rows = extract_models(ws_fr)

    with zipfile.ZipFile(xlsx_path) as zf:
        anchors_fr = load_picture_anchors(zf, "xl/drawings/drawing1.xml", "xl/drawings/_rels/drawing1.xml.rels")
        anchors_ks = load_picture_anchors(zf, "xl/drawings/drawing2.xml", "xl/drawings/_rels/drawing2.xml.rels")

        fenders, fender_col_to_id = extract_products(
            ws_fr, zf, anchors_fr, range(fender_start, rack_start), "fender"
        )
        racks, rack_col_to_id = extract_products(ws_fr, zf, anchors_fr, range(rack_start, rack_end), "rack")
        kickstands = extract_kickstands(ws_ks, zf, anchors_ks)

    compat = extract_compat(ws_fr, model_rows, fender_col_to_id, rack_col_to_id)

    return {
        "legend": {"yes": "適用", "no": "不適用", "accessory": "僅限配件或特定情況"},
        "models": models,
        "fenders": fenders,
        "racks": racks,
        "kickstands": kickstands,
        "compat": compat,
    }


def main():
    data = build_data()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / "data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(
        f"models={len(data['models'])} fenders={len(data['fenders'])} "
        f"racks={len(data['racks'])} kickstands={len(data['kickstands'])}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Write an integration test against the real xlsx**

Append to `scripts/test_extract_data.py` (add the import at the top alongside the existing one):

```python
from extract_data import build_data, XLSX_PATH


class BuildDataIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_data(XLSX_PATH)

    def test_counts_match_known_shape_of_the_source_file(self):
        self.assertEqual(len(self.data["models"]), 35)
        self.assertEqual(len(self.data["fenders"]), 22)
        self.assertEqual(len(self.data["racks"]), 16)
        self.assertEqual(len(self.data["kickstands"]), 3)

    def test_every_model_has_a_compat_entry_for_every_product(self):
        all_product_ids = {p["id"] for p in self.data["fenders"]} | {p["id"] for p in self.data["racks"]}
        for model in self.data["models"]:
            entry = self.data["compat"][model["id"]]
            self.assertEqual(set(entry.keys()), all_product_ids)

    def test_known_incompatible_pair(self):
        # GIANT ATX 27.5 vs GIANT SPEEDSHIELD RGX 45 FENDER (sku 530000050) is "X" in the sheet.
        entry = self.data["compat"]["giant-atx-27-5"]["530000050"]
        self.assertEqual(entry, {"status": "no"})

    def test_known_compatible_pair_with_note(self):
        # Liv Alight vs the same fender is "yes" with a seat-tube-strap-mounting-kit note.
        entry = self.data["compat"]["liv-alight"]["530000050"]
        self.assertEqual(entry["status"], "yes")
        self.assertIn("seat tube strap mounting kit", entry["note"])

    def test_fender_and_rack_products_have_image_paths(self):
        for product in self.data["fenders"] + self.data["racks"]:
            self.assertIsNotNone(product["image"], product["name"])

    def test_kickstand_text_blocks_are_populated(self):
        first = self.data["kickstands"][0]
        self.assertIn("Roam MY21+", first["compatibleBikesText"])
```

- [ ] **Step 3: Run all tests to verify they pass**

Run: `cd "Fender Rack Kickstand compatibility inquiry/scripts" && python3 -m unittest test_extract_data -v`
Expected: all tests `ok` (9 from Task 1 + 6 new ones), `OK` summary line

- [ ] **Step 4: Run the script for real and inspect the output**

Run: `cd "Fender Rack Kickstand compatibility inquiry" && python3 scripts/extract_data.py`
Expected stderr: `models=35 fenders=22 racks=16 kickstands=3`
Then verify the output exists:
Run: `find data -type f | sort | head -20 && echo ... && find data -type f | wc -l`
Expected: `data/data.json` plus image files under `data/images/fender/`, `data/images/rack/`, `data/images/kickstand/` — total file count should be `1 + 22 + 16 + 3 = 42` (one product may be missing an image only if the source sheet has no anchor for it; if the count is off, inspect `data/data.json` for any `"image": null` entries and cross-check against the anchor mapping logic above before proceeding).

- [ ] **Step 5: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add scripts/extract_data.py scripts/test_extract_data.py data/
git commit -m "$(cat <<'EOF'
Extract full compatibility matrix, kickstand lists, and product photos to data/

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Kickstand fuzzy-matching logic (TDD, pure JS module)

**Files:**
- Create: `js/matching.mjs`
- Create: `js/matching.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `js/matching.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getModelRoot, findKickstandMatches } from './matching.mjs';

test('getModelRoot takes the first word and lowercases it', () => {
  assert.equal(getModelRoot('Talon 27.5'), 'talon');
  assert.equal(getModelRoot('Talon 29er'), 'talon');
  assert.equal(getModelRoot('FastRoad AR Advanced'), 'fastroad');
  assert.equal(getModelRoot('Revolt X Advanced Pro'), 'revolt');
});

test('findKickstandMatches finds bike and e-bike hits sharing a root word', () => {
  const kickstands = [
    {
      sku: 'A',
      compatibleBikesText: 'Roam MY21+\nTalon MY24+\n',
      compatibleEbikesText: 'Talon E+ MY21/ MY23\nVida E+\n',
    },
  ];
  const matches = findKickstandMatches('Talon 27.5', kickstands);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].hits.length, 2);
  assert.deepEqual(
    matches[0].hits.map((h) => h.type).sort(),
    ['bike', 'ebike']
  );
});

test('findKickstandMatches skips kickstands with no matching root word', () => {
  const kickstands = [{ sku: 'A', compatibleBikesText: 'Roam MY21+', compatibleEbikesText: '' }];
  assert.deepEqual(findKickstandMatches('Defy Advanced', kickstands), []);
});

test('findKickstandMatches ignores blank lines in the text blocks', () => {
  const kickstands = [{ sku: 'A', compatibleBikesText: 'Roam MY21+\n\n\n', compatibleEbikesText: '' }];
  const matches = findKickstandMatches('Roam', kickstands);
  assert.equal(matches[0].hits.length, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "Fender Rack Kickstand compatibility inquiry" && node --test js/matching.test.mjs`
Expected: fails with a module-not-found error for `./matching.mjs`

- [ ] **Step 3: Implement `js/matching.mjs`**

```js
export function getModelRoot(name) {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

function linesOf(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function findKickstandMatches(modelName, kickstands) {
  const root = getModelRoot(modelName);
  const matches = [];
  for (const kickstand of kickstands) {
    const hits = [];
    for (const line of linesOf(kickstand.compatibleBikesText)) {
      if (getModelRoot(line) === root) hits.push({ line, type: 'bike' });
    }
    for (const line of linesOf(kickstand.compatibleEbikesText)) {
      if (getModelRoot(line) === root) hits.push({ line, type: 'ebike' });
    }
    if (hits.length > 0) matches.push({ kickstand, hits });
  }
  return matches;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "Fender Rack Kickstand compatibility inquiry" && node --test js/matching.test.mjs`
Expected: `# pass 4`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add js/matching.mjs js/matching.test.mjs
git commit -m "$(cat <<'EOF'
Add pure kickstand fuzzy-matching module with unit tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Static site shell (HTML + CSS + data loading)

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fender / Rack / Kickstand 相容性查詢</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="app-header">
  <h1>Fender / Rack / Kickstand 相容性查詢</h1>
  <div class="legend" id="legend"></div>
</header>

<nav class="mode-tabs" id="modeTabs">
  <button class="mode-tab active" data-mode="by-model">依車型查</button>
  <button class="mode-tab" data-mode="by-product">依產品查</button>
</nav>

<main>
  <section id="byModelView" class="view">
    <div class="search-field">
      <label for="modelSearch">選擇車型</label>
      <input type="text" id="modelSearch" placeholder="輸入車型名稱搜尋..." autocomplete="off">
      <ul id="modelOptions" class="option-list" hidden></ul>
    </div>
    <div class="show-all-toggle">
      <label><input type="checkbox" id="byModelShowAll"> 顯示全部(含不適用)</label>
    </div>
    <div class="results-grid" id="byModelResults" hidden>
      <div class="result-column">
        <h2>適用 Fender</h2>
        <div class="card-list" id="fenderResults"></div>
      </div>
      <div class="result-column">
        <h2>適用 Rack</h2>
        <div class="card-list" id="rackResults"></div>
      </div>
      <div class="result-column">
        <h2>可能適用的 Kickstand</h2>
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
        <input type="text" id="productSearch" placeholder="輸入產品名稱或 SKU 搜尋..." autocomplete="off">
        <ul class="option-list" id="productOptions"></ul>
      </div>
      <div class="product-detail-pane" id="productDetail">
        <p class="empty-hint">請從左側選擇一個產品</p>
      </div>
    </div>
  </section>
</main>

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/style.css`**

```css
:root {
  --color-yes: #2e7d32;
  --color-no: #757575;
  --color-accessory: #ef6c00;
  --color-border: #ddd;
  --color-bg: #fafafa;
}

* { box-sizing: border-box; }

body {
  font-family: -apple-system, "PingFang TC", "Noto Sans TC", sans-serif;
  margin: 0;
  background: var(--color-bg);
  color: #222;
}

.app-header {
  padding: 1rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
}

.app-header h1 { margin: 0 0 0.5rem; font-size: 1.25rem; }

.legend { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; }
.legend-item { font-weight: 600; }
.legend-item.status-yes { color: var(--color-yes); }
.legend-item.status-no { color: var(--color-no); }
.legend-item.status-accessory { color: var(--color-accessory); }

.mode-tabs, .category-tabs { display: flex; gap: 0.5rem; padding: 0.75rem 1.5rem 0; }

.mode-tab, .category-tab {
  border: 1px solid var(--color-border);
  background: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 0.95rem;
}

.mode-tab.active, .category-tab.active { background: #1976d2; color: #fff; border-color: #1976d2; }

main { padding: 1.5rem; }

.search-field { position: relative; max-width: 420px; margin-bottom: 1rem; }
.search-field label { display: block; margin-bottom: 0.25rem; font-size: 0.9rem; }
.search-field input, #productSearch {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.option-list {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: #fff;
  max-height: 280px;
  overflow-y: auto;
}

.search-field .option-list { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; }
.option-list li { padding: 0.5rem 0.75rem; cursor: pointer; }
.option-list li:hover { background: #f0f4ff; }

.show-all-toggle { margin-bottom: 1rem; font-size: 0.9rem; }

.results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
@media (max-width: 900px) { .results-grid { grid-template-columns: 1fr; } }

.result-column h2 { font-size: 1rem; margin-bottom: 0.5rem; }

.card-list { display: flex; flex-direction: column; gap: 0.75rem; }

.card {
  display: flex;
  gap: 0.75rem;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem;
}

.card-image { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.card-title { font-weight: 600; font-size: 0.9rem; }
.card-sku { font-size: 0.8rem; color: #666; margin-bottom: 0.25rem; }
.card-note { font-size: 0.78rem; color: #555; margin-top: 0.25rem; }

.badge {
  display: inline-block;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  color: #fff;
}
.status-yes { background: var(--color-yes); }
.status-no { background: var(--color-no); }
.status-accessory { background: var(--color-accessory); }

.hit-list { margin: 0.25rem 0; padding-left: 1.1rem; font-size: 0.82rem; }

.product-layout { display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; margin-top: 1rem; }
@media (max-width: 700px) { .product-layout { grid-template-columns: 1fr; } }

.product-list-pane #productOptions { margin-top: 0.5rem; max-height: none; }

.product-detail-pane { background: #fff; border: 1px solid var(--color-border); border-radius: 6px; padding: 1rem; }

.detail-image { max-width: 220px; max-height: 220px; object-fit: contain; display: block; margin-bottom: 1rem; }

.model-status-list { list-style: none; padding: 0; font-size: 0.88rem; }
.model-status-list li { padding: 0.25rem 0; border-bottom: 1px solid #f0f0f0; }

.plain-list { font-size: 0.88rem; padding-left: 1.1rem; }

.empty-hint { color: #888; font-size: 0.9rem; }
```

- [ ] **Step 3: Create a minimal `js/app.js` that only loads data and renders the legend (functionality added in later tasks)**

```js
let DATA = null;

async function loadData() {
  const res = await fetch('data/data.json');
  if (!res.ok) throw new Error(`failed to load data.json: ${res.status}`);
  return res.json();
}

function renderLegend(legend) {
  const el = document.getElementById('legend');
  el.innerHTML = `
    <span class="legend-item status-yes">○ ${legend.yes}</span>
    <span class="legend-item status-no">X ${legend.no}</span>
    <span class="legend-item status-accessory">– ${legend.accessory}</span>
  `;
}

function setupModeTabs() {
  const tabs = document.querySelectorAll('.mode-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      document.getElementById('byModelView').hidden = mode !== 'by-model';
      document.getElementById('byProductView').hidden = mode !== 'by-product';
    });
  });
}

async function main() {
  DATA = await loadData();
  renderLegend(DATA.legend);
  setupModeTabs();
}

main().catch((err) => {
  document.body.innerHTML = `<p style="color:red;padding:2rem">載入資料失敗:${err.message}</p>`;
  console.error(err);
});
```

- [ ] **Step 4: Verify in the browser**

Run (in background, leave it running): `cd "Fender Rack Kickstand compatibility inquiry" && python3 -m http.server 8000`
Then open `http://localhost:8000/` in a real browser and confirm:
- The page title and header render
- The legend shows three items: `○ 適用`, `X 不適用`, `– 僅限配件或特定情況`
- Clicking "依產品查" switches the visible section (even though it's empty content for now) and "依車型查" switches back
- The browser console has no errors

- [ ] **Step 5: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add index.html css/style.css js/app.js
git commit -m "$(cat <<'EOF'
Add static site shell: layout, styles, legend, and mode tab switching

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Mode 1 — 依車型查 (search by bike model)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add the searchable-select, card rendering, and by-model view logic**

Replace the contents of `js/app.js` with:

```js
import { findKickstandMatches } from './matching.mjs';

const STATUS_LABEL = { yes: '○ 適用', no: 'X 不適用', accessory: '– 限定配件' };
const STATUS_CLASS = { yes: 'status-yes', no: 'status-no', accessory: 'status-accessory' };

let DATA = null;

async function loadData() {
  const res = await fetch('data/data.json');
  if (!res.ok) throw new Error(`failed to load data.json: ${res.status}`);
  return res.json();
}

function renderLegend(legend) {
  const el = document.getElementById('legend');
  el.innerHTML = `
    <span class="legend-item status-yes">○ ${legend.yes}</span>
    <span class="legend-item status-no">X ${legend.no}</span>
    <span class="legend-item status-accessory">– ${legend.accessory}</span>
  `;
}

function setupModeTabs() {
  const tabs = document.querySelectorAll('.mode-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
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
    setTimeout(() => { listEl.hidden = true; }, 100);
  });
}

function statusBadge(entry) {
  const span = document.createElement('span');
  span.className = `badge ${STATUS_CLASS[entry.status]}`;
  span.textContent = STATUS_LABEL[entry.status];
  return span;
}

function productCard(product, entry) {
  const card = document.createElement('div');
  card.className = 'card';
  const img = document.createElement('img');
  img.className = 'card-image';
  if (product.image) {
    img.src = product.image;
    img.alt = product.name;
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
    note.textContent = `備註:${entry.note}`;
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
    containerEl.innerHTML = '<p class="empty-hint">沒有符合的項目</p>';
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
    img.src = kickstand.image;
    img.alt = kickstand.name;
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
    li.textContent = `${hit.type === 'ebike' ? '[電動車]' : '[一般車]'} ${hit.line}`;
    list.appendChild(li);
  });
  body.appendChild(list);
  const warn = document.createElement('div');
  warn.className = 'card-note';
  warn.textContent = '⚠️ 依車型名稱粗略比對,請自行核對年份與型號是否相符';
  body.appendChild(warn);
  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function renderKickstandResults(containerEl, modelName) {
  containerEl.innerHTML = '';
  const matches = findKickstandMatches(modelName, DATA.kickstands);
  if (matches.length === 0) {
    containerEl.innerHTML = '<p class="empty-hint">未找到相符項目,請參考「依產品查」的 Kickstand 完整列表</p>';
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

  setupSearchableSelect(
    input,
    list,
    DATA.models,
    (m) => `${m.brand} ${m.name}`,
    (model) => { currentModel = model; refresh(); }
  );
  showAllCheckbox.addEventListener('change', refresh);
}

async function main() {
  DATA = await loadData();
  renderLegend(DATA.legend);
  setupModeTabs();
  setupByModelView();
}

main().catch((err) => {
  document.body.innerHTML = `<p style="color:red;padding:2rem">載入資料失敗:${err.message}</p>`;
  console.error(err);
});
```

- [ ] **Step 2: Verify in the browser**

With `python3 -m http.server 8000` still running from Task 4 (restart it if needed), reload `http://localhost:8000/` and:
- Click the model search box, type `revolt`, confirm options like "GIANT Revolt Advanced" appear
- Select "GIANT Revolt Advanced": confirm the Fender column shows `REVOLT FENDER SET` with status badge `○ 適用`, the Rack column shows multiple `○ 適用` entries (e.g. `GIANT RACK-IT REAR`) plus a few `– 限定配件` entries (e.g. `GIANT DISC RACK, BLACK` with a "need adapter" note), and the Kickstand column shows one card (the `DIRECT MOUNT KSA 18MM (M6) KICKSTAND TREKKING...` SKU, matched via its `Revolt E+ MY20-24` e-bike line) with the disclaimer text
- Toggle "顯示全部" and confirm the one `X 不適用` rack entry for this model (`GIANT RACK-IT [DISC] BLACK`) now appears alongside the rest
- Search for `alight` and select "Liv Alight": confirm the `GIANT SPEEDSHIELD RGX 45 FENDER` card shows the note "備註:need the seat tube strap mounting kit"
- Confirm product thumbnail images actually load (not broken-image icons)

- [ ] **Step 3: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add js/app.js
git commit -m "$(cat <<'EOF'
Implement by-model search view with fender/rack/kickstand result cards

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Mode 2 — 依產品查 (search by product)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add the by-product view**

Add the following functions to `js/app.js` (insert above `async function main()`), and update `main()` as shown:

```js
function textToList(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '<p class="empty-hint">無資料</p>';
  return '<ul class="plain-list">' + lines.map((l) => `<li>${l}</li>`).join('') + '</ul>';
}

function renderProductDetail(category, product) {
  const pane = document.getElementById('productDetail');
  pane.innerHTML = '';

  if (product.image) {
    const img = document.createElement('img');
    img.className = 'detail-image';
    img.src = product.image;
    img.alt = product.name;
    pane.appendChild(img);
  }

  const header = document.createElement('div');
  header.innerHTML = `<h2>${product.name}</h2><p>SKU: ${product.sku}</p>`;
  pane.appendChild(header);

  if (category === 'kickstands') {
    const bikesBlock = document.createElement('div');
    bikesBlock.innerHTML = '<h3>適用一般車型</h3>' + textToList(product.compatibleBikesText);
    const ebikesBlock = document.createElement('div');
    ebikesBlock.innerHTML = '<h3>適用電動車型</h3>' + textToList(product.compatibleEbikesText);
    pane.appendChild(bikesBlock);
    pane.appendChild(ebikesBlock);
    return;
  }

  const toggleLabel = document.createElement('label');
  toggleLabel.innerHTML = '<input type="checkbox" id="byProductShowAll"> 顯示全部(含不適用)';
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

  function renderOptions(filterText) {
    const items = DATA[currentCategory].filter((p) =>
      `${p.name} ${p.sku}`.toLowerCase().includes(filterText.toLowerCase())
    );
    optionsList.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.addEventListener('click', () => renderProductDetail(currentCategory, item));
      optionsList.appendChild(li);
    });
  }

  categoryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      searchInput.value = '';
      document.getElementById('productDetail').innerHTML = '<p class="empty-hint">請從左側選擇一個產品</p>';
      renderOptions('');
    });
  });

  searchInput.addEventListener('input', () => renderOptions(searchInput.value));
  renderOptions('');
}
```

Update `main()`:

```js
async function main() {
  DATA = await loadData();
  renderLegend(DATA.legend);
  setupModeTabs();
  setupByModelView();
  setupByProductView();
}
```

- [ ] **Step 2: Verify in the browser**

Reload `http://localhost:8000/` and:
- Click "依產品查": confirm the Fender list shows on the left, with a search box
- Search `revolt` and click "REVOLT FENDER SET": confirm the right pane shows the photo, SKU, and a `GIANT` group listing models with `○ 適用` badges and a note where applicable
- Switch to the "Kickstand" tab and select a kickstand: confirm the right pane shows two bullet lists ("適用一般車型" / "適用電動車型") with the raw `MY` year strings, not the by-model fuzzy-match UI
- Resize the browser window narrow (or use device toolbar) and confirm the product list/detail panes stack vertically instead of overlapping

- [ ] **Step 3: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add js/app.js
git commit -m "$(cat <<'EOF'
Implement by-product view with category tabs and reverse compatibility lookup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: README and final pass

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Fender / Rack / Kickstand 相容性查詢

純靜態網頁,讀取 `data/data.json`(由 `Rack_Fender_Kickstand_Compatibility_202507update.xlsx` 轉換而來),可依車型或依產品互查 Fender / Rack / Kickstand 的相容性。

## 本機預覽

`fetch()` 讀取本機檔案在部分瀏覽器(如 Chrome)用 `file://` 直接開啟會被擋掉,建議用簡單的靜態伺服器:

\`\`\`bash
python3 -m http.server 8000
\`\`\`

然後開啟 http://localhost:8000/

## 若 Excel 資料更新

重新放入同名(或修改 `scripts/extract_data.py` 裡的 `XLSX_PATH`)的 xlsx 後,重新跑一次轉換腳本即可覆蓋 `data/`:

\`\`\`bash
python3 scripts/extract_data.py
\`\`\`

## 部署

這是零相依的純靜態站(`index.html` + `css/` + `js/` + `data/`),沒有 build step,可以直接把整個資料夾複製到任何靜態空間(GitHub Pages、內部伺服器、Netlify/Vercel 等)。

## 測試

\`\`\`bash
cd scripts && python3 -m unittest test_extract_data -v   # 資料轉換腳本
node --test js/matching.test.mjs                          # Kickstand 模糊比對邏輯
\`\`\`
```

- [ ] **Step 2: Run the full test suite one more time to confirm nothing regressed**

Run: `cd "Fender Rack Kickstand compatibility inquiry/scripts" && python3 -m unittest test_extract_data -v && cd .. && node --test js/matching.test.mjs`
Expected: all Python tests `ok` with final `OK`, and Node reports `# fail 0`

- [ ] **Step 3: Full manual browser pass through both modes**

With the local server running, walk through the golden path end to end: open the page, use 依車型查 for at least one GIANT and one Liv model, switch to 依產品查 and check one product from each of the three categories (Fender/Rack/Kickstand), and confirm no console errors at any point.

- [ ] **Step 4: Commit**

```bash
cd "Fender Rack Kickstand compatibility inquiry"
git add README.md
git commit -m "$(cat <<'EOF'
Add README with run, update, and deployment instructions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
