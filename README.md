# Fender / Rack / Kickstand 相容性查詢

純靜態網頁,讀取 `data/data.json`(由 `Rack_Fender_Kickstand_Compatibility_202507update.xlsx` 轉換而來),可依車型或依產品互查 Fender / Rack / Kickstand 的相容性。

## 本機預覽

`fetch()` 讀取本機檔案在部分瀏覽器(如 Chrome)用 `file://` 直接開啟會被擋掉,建議用簡單的靜態伺服器:

```bash
python3 -m http.server 8000
```

然後開啟 http://localhost:8000/

## 若 Excel 資料更新

重新放入同名(或修改 `scripts/extract_data.py` 裡的 `XLSX_PATH`)的 xlsx 後,重新跑一次轉換腳本即可覆蓋 `data/`:

```bash
python3 scripts/extract_data.py
```

## 部署

這是零相依的純靜態站(`index.html` + `css/` + `js/` + `data/`),沒有 build step,可以直接把整個資料夾複製到任何靜態空間(GitHub Pages、內部伺服器、Netlify/Vercel 等)。

## 測試

```bash
cd scripts && python3 -m unittest test_extract_data -v   # 資料轉換腳本
node --test js/matching.test.mjs                          # Kickstand 模糊比對邏輯
```
