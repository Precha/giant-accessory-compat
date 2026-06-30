function safeLsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeLsSet(key, val) {
  try { localStorage.setItem(key, val); } catch { /* no-op outside browser */ }
}

export const TRANSLATIONS = {
  en: {
    byModel: 'By Model',
    byProduct: 'By Product',
    selectModel: 'Select bike model',
    modelSearchPlaceholder: 'Search bike model...',
    showAll: 'Show all (incl. not compatible)',
    compatibleFenders: 'Compatible Fenders',
    compatibleRacks: 'Compatible Racks',
    possibleKickstands: 'Possible Kickstands',
    productSearchPlaceholder: 'Search product name or SKU...',
    selectProduct: 'Select a product from the left',
    statusYes: 'Compatible',
    statusNo: 'Not compatible',
    statusAccessory: 'Accessory only',
    note: 'Note',
    noCompatibleItems: 'No compatible items',
    bike: '[Bike]',
    ebike: '[E-Bike]',
    kickstandDisclaimer: '⚠️ Approximate match by model name — verify the model year in the list above',
    kickstandNoMatch: 'No match found. See the Kickstand tab in "By Product" view for the full list.',
    compatBikes: 'Compatible bikes',
    compatEbikes: 'Compatible e-bikes',
    noData: 'No data',
    loadError: 'Failed to load data',
  },
  zh: {
    byModel: '依車型查',
    byProduct: '依產品查',
    selectModel: '選擇車型',
    modelSearchPlaceholder: '輸入車型名稱搜尋...',
    showAll: '顯示全部(含不適用)',
    compatibleFenders: '適用 Fender',
    compatibleRacks: '適用 Rack',
    possibleKickstands: '可能適用的 Kickstand',
    productSearchPlaceholder: '輸入產品名稱或 SKU 搜尋...',
    selectProduct: '請從左側選擇一個產品',
    statusYes: '適用',
    statusNo: '不適用',
    statusAccessory: '僅限配件或特定情況',
    note: '備註',
    noCompatibleItems: '沒有符合的項目',
    bike: '[一般車]',
    ebike: '[電動車]',
    kickstandDisclaimer: '⚠️ 依車型名稱粗略比對,請自行核對年份與型號是否相符',
    kickstandNoMatch: '未找到相符項目,請參考「依產品查」的 Kickstand 完整列表',
    compatBikes: '適用一般車型',
    compatEbikes: '適用電動車型',
    noData: '無資料',
    loadError: '載入資料失敗',
  },
};

let currentLang = safeLsGet('lang') || 'en';

export const t = (key) => (TRANSLATIONS[currentLang] ?? TRANSLATIONS.en)[key] ?? key;
export const getLang = () => currentLang;
export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  safeLsSet('lang', lang);
}
