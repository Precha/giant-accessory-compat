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
