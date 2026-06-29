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
