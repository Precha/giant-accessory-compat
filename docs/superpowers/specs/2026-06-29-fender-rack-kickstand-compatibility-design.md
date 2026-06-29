# Fender / Rack / Kickstand 相容性查詢網頁 — 設計文件

日期:2026-06-29
來源資料:`Rack_Fender_Kickstand_Compatibility_202507update.xlsx`(2025-07 更新版)

## 1. 背景與目標

業務/服務人員需要快速查詢:某款 GIANT / Liv 車型可以裝哪些 Fender(土除)、Rack(後架)、Kickstand(腳架),反之也要能從某個產品反查適用車型。原始資料是一份 Excel,有兩個分頁:

- **Fender_Rack**:35 款車型(GIANT 21 款 + Liv 14 款)× 38 款產品(22 Fender + 16 Rack)的相容性矩陣,儲存格用符號標示:
  - `○` 適用(部分有備註,如 `*need adapter`、`*need the seat tube strap mounting kit`)
  - `X` 不適用
  - `–`(soft hyphen 字元)僅限配件 / 特定情況才適用
  - 每個產品欄都有一張嵌入的縮圖(欄位 2~39,0-indexed,對應到產品欄 C~AN)
- **Kickstand**:只有 3 款 Kickstand SKU,各自用一段多行文字列出適用的一般車型(含年份,如 `Roam MY21+`)與電動車型(`Compatible E-Bikes`,如 `Stance E+ 0/1 Pro - MY23`),不是矩陣形式,車型命名方式也跟 Fender_Rack 分頁不同(含年份區間,且不分 GIANT/Liv)。

目標是做一個靜態網頁,讓使用者用「選車型」或「選產品」兩種方式互查相容性,並能看到產品縮圖。

## 2. 資料管線(建置期,不在瀏覽器執行)

寫一支一次性 Python 腳本 `scripts/extract_data.py`(用 `openpyxl`),從 xlsx 產出:

- `data/data.json`:結構化資料(見第 3 節)
- `data/images/fender/<SKU>.<ext>`、`data/images/rack/<SKU>.<ext>`、`data/images/kickstand/<SKU>.<ext>`:依照 `xl/drawings/drawing1.xml`(Fender_Rack 分頁)與 `drawing2.xml`(Kickstand 分頁)的錨點座標,把每個產品欄/列對應到的嵌入圖片取出並用 SKU 命名

理由:嵌入圖片在瀏覽器端用 SheetJS 之類的函式庫解析很麻煩且不穩定;原始檔案 4MB 沒必要整包送到前端;最終要做成可攜式靜態檔案,所以建置期先轉成乾淨的 JSON + 圖片資源最簡單可靠。這支腳本只需要在資料更新時(例如下次 Excel 又出新版)重新跑一次。

腳本不需要做成可重複使用的通用工具,直接寫死對應這份 Excel 的版面結構(欄位範圍、列範圍)即可,因為這是一次性轉換,Excel 版面以後若變動,腳本本來就要跟著改。

## 3. 資料模型(`data/data.json`)

```json
{
  "legend": {
    "yes": "適用",
    "no": "不適用",
    "accessory": "僅限配件或特定情況"
  },
  "models": [
    {"id": "giant-atx-27-5", "brand": "GIANT", "name": "ATX 27.5"},
    {"id": "liv-alight", "brand": "Liv", "name": "Alight"}
  ],
  "fenders": [
    {
      "sku": "530000050",
      "name": "GIANT SPEEDSHIELD RGX 45 FENDER",
      "image": "images/fender/530000050.png"
    }
  ],
  "racks": [
    {
      "sku": "440000038",
      "name": "GIANT RACK-IT REAR",
      "image": "images/rack/440000038.png"
    }
  ],
  "kickstands": [
    {
      "sku": "500000012",
      "name": "DIRECT MOUNT KSA 18MM (M6) KICKSTAND TREKKING 24\"~29\" ADJUSTABLE BLACK COLOR",
      "image": "images/kickstand/500000012.jpeg",
      "compatibleBikesText": "Roam MY21+\nRove MY21+\n...",
      "compatibleEbikesText": "Vida E+\nTranscend E+\n..."
    }
  ],
  "compat": {
    "giant-atx-27-5": {
      "530000050": {"status": "no"},
      "530000043": {"status": "no"}
    },
    "liv-alight": {
      "530000050": {"status": "yes", "note": "need the seat tube strap mounting kit"},
      "530000043": {"status": "yes"}
    }
  }
}
```

- `compat` 的 key 是 `model.id`,value 是「該車型對每個 Fender/Rack SKU 的狀態」的物件,SKU 同時涵蓋 Fender 與 Rack(用同一張表)。
- `status` 只會是 `yes` / `no` / `accessory` 三種值,對應矩陣裡的 `○` / `X` / `–`。
- 找不到資料的 cell(理論上不會發生,矩陣是滿的)視為 `no`。
- Kickstand 不放進 `compat`,因為它的資料形式本來就不是矩陣,前端用文字比對處理(見第 5 節)。

## 4. 網站結構

純靜態、零相依、零 build step:

```
index.html
css/style.css
js/app.js
data/data.json
data/images/...
```

- 全部用相對路徑,可以直接雙擊 `index.html` 在瀏覽器開啟,或丟到任何靜態空間(GitHub Pages / 內部伺服器 / 隨便一個資料夾)都能跑,不需要額外設定路由或伺服器端邏輯。
- `app.js` 在頁面載入時 `fetch('data/data.json')` 一次,之後純前端互動,不再有任何網路請求。
  - 例外:若使用者直接用 `file://` 雙擊開啟 `index.html`,部分瀏覽器(如 Chrome)預設會擋掉 `fetch` 讀本機檔案。因此 README 會註明:本機測試建議用簡單的靜態伺服器(例如 `python3 -m http.server`)開啟,正式部署到任何靜態空間後則不受影響。

## 5. 互動設計

頂部固定 Legend:`○ 適用` / `X 不適用` / `– 僅限配件或特定情況`(備註會在卡片上以小字呈現)。

頁面分兩個模式,用頂部分頁切換(`依車型查` / `依產品查`),互不影響網址或重新整理。

### 模式一:依車型查(預設開啟)

- 一個可輸入搜尋的車型選擇器(輸入框 + 篩選清單),清單依 GIANT / Liv 分組,共 35 款
- 選定車型後,畫面分三欄(手機版直向堆疊):
  1. **適用 Fender**:卡片列表(縮圖 + 名稱 + SKU + 狀態徽章 + 備註),預設只顯示 `yes` 與 `accessory`,有一個「顯示全部(含不適用)」的切換開關
  2. **適用 Rack**:同上
  3. **可能適用的 Kickstand**:用模糊比對(見下)列出命中的 Kickstand 卡片,每張卡片顯示命中的原始文字行(含年份)
- 找不到任何 Kickstand 命中時顯示「未找到相符項目,請參考下方完整列表」並附連結切到模式二的 Kickstand 頁籤

### 模式二:依產品查

- 三個類別頁籤:Fender / Rack / Kickstand
- 選一個類別後,左側是可搜尋的產品清單,右側顯示選中產品的大圖、名稱、SKU
- Fender / Rack:右側下方列出所有車型的相容狀態,依 GIANT / Liv 分組顯示(用跟模式一同樣的徽章樣式),預設一樣只顯示 `yes`/`accessory`,可切換顯示全部
- Kickstand:右側下方直接顯示該產品原始的 `Compatible bikes` 與 `Compatible E-Bikes` 文字清單(轉成條列式,一行一個項目),不做比對轉換,保留原文方便使用者自行核對年份

### Kickstand 模糊比對邏輯

因為 Kickstand 清單用的是「車型基本名 + 年份」(如 `Talon MY24+`、`FastRoad MY19+ ~ MY23+`),跟 Fender_Rack 矩陣的車型名(如 `Talon 27.5`、`FastRoad Advanced`)對不起來,採用「詞根包含比對」:

1. 把選定車型名稱去掉常見後綴詞(`27.5`、`29er`、`Advanced`、`Advanced Pro`、`AR`、`SL`、`Disc`、數字)取出「基本詞根」(如 `Talon 27.5` → `Talon`、`FastRoad AR Advanced` → `FastRoad`)
2. 把每個 Kickstand 的 `compatibleBikesText` / `compatibleEbikesText` 用換行切成多行,每行再取出開頭的字母詞(到第一個數字或 `MY` 之前)當作該行的詞根
3. 若兩邊詞根相同(忽略大小寫),視為命中,顯示該行原文
4. 比對結果一律附註小字:「⚠️ 依車型名稱粗略比對,請自行核對年份與型號是否相符」,因為這只是輔助提示,不是精確判斷

這個邏輯寫死在 `app.js` 裡的一個小函式即可,不需要額外的設定檔或字典,因為車型詞根的取法是固定規則,例外狀況靠使用者自行核對年份來兜底。

## 6. 視覺與技術細節

- RWD:寬螢幕三欄並排,窄螢幕(手機)改直向堆疊,搜尋框與卡片全寬
- Vanilla JS(無框架),搜尋型選擇器自己寫一個小元件(輸入框 + 下拉篩選清單),不引入外部套件
- 不使用 CSS 框架,寫一份精簡的 `style.css`,沿用 Excel 資料本身已有的視覺語意(○ 綠色 / X 灰色 / – 橘色 等徽章顏色),不另外設計品牌視覺
- 不做任何後端、資料庫、登入機制——這是內部查詢小工具,資料是唯讀的

## 7. 不做的事(YAGNI)

- 不做資料編輯/管理介面(若 Excel 之後更新,重新跑一次 `extract_data.py` 並覆蓋 `data/` 即可)
- 不做使用者帳號、權限控管
- 不做後端 API、不存資料庫
- 不做多語言切換(介面用中文,產品/車型名稱維持原文英文,因為原始資料就是英文)
- 不嘗試把 Kickstand 的年份規則做成精確的「車型+年份」結構化比對(超出目前資料品質能支撑的範圍,模糊比對 + 顯示原文已經是使用者同意的方案)

## 8. 開放事項

- 尚未決定最終部署平台(GitHub Pages / 內部伺服器 / 其他),目前先做成路徑全相對、零相依的純靜態檔案,之後可以直接搬到任何靜態空間
- 目前這個工作目錄還不是 git repository;此設計文件先寫入但不會自動 `git commit`,待使用者確認是否要初始化 git 版控
