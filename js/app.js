import { findKickstandMatches } from './matching.mjs';

const STATUS_SYMBOL = { yes: '○', no: 'X', accessory: '–' };
const STATUS_CLASS = { yes: 'status-yes', no: 'status-no', accessory: 'status-accessory' };

let DATA = null;
let STATUS_LABEL = null;

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

function renderLegend(legend) {
  STATUS_LABEL = {
    yes: `${STATUS_SYMBOL.yes} ${legend.yes}`,
    no: `${STATUS_SYMBOL.no} ${legend.no}`,
    accessory: `${STATUS_SYMBOL.accessory} ${legend.accessory}`,
  };
  const el = document.getElementById('legend');
  el.innerHTML = `
    <span class="legend-item status-yes">${STATUS_LABEL.yes}</span>
    <span class="legend-item status-no">${STATUS_LABEL.no}</span>
    <span class="legend-item status-accessory">${STATUS_LABEL.accessory}</span>
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
    img.src = imagePath(product.image);
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
    img.src = imagePath(kickstand.image);
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
    img.src = imagePath(product.image);
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

async function main() {
  DATA = await loadData();
  renderLegend(DATA.legend);
  setupModeTabs();
  setupByModelView();
  setupByProductView();
}

main().catch((err) => {
  document.body.innerHTML = `<p style="color:red;padding:2rem">載入資料失敗:${err.message}</p>`;
  console.error(err);
});
