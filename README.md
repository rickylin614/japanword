# 日語練習室

以 `layout.html` 為入口，純 HTML / JavaScript / CSV。保留 N3、N4、N5 既有動詞變化與情境測驗；N3～N5 文法各 500 題。N2～N5 詞彙依公開分級詞表與 JMdict 交叉核對。

## 啟動

在此目錄執行 `python -m http.server 8000` 或 `node serve.cjs`，開啟 http://127.0.0.1:8000/layout.html 。既有動詞需要 fetch CSV，請透過 HTTP 瀏覽。

## 詞彙來源與數量（2026-10-02）

| 等級 | 名詞 | 動詞 | い形容詞 | な形容詞 | 其他 | 同級去重合計 |
|---|---:|---:|---:|---:|---:|---:|
| N2 | 1060 | 289 | 55 | 90 | 298 | 1792 |
| N3 | 1167 | 368 | 30 | 165 | 361 | 2091 |
| N4 | 303 | 159 | 23 | 41 | 126 | 652 |
| N5 | 293 | 109 | 60 | 30 | 206 | 698 |

N5 原始 718 列，合併 11 列、排除 9 列；N3 原始 2140 列，合併 46 列、排除 3 列；N4 原始 668 列，合併 3 列、排除 13 列。N2 收錄總數及 ID 不變，但修正舊分類程式把 vi/vt 自他動標記當作獨立動詞的問題。名詞＋する依字典名詞收錄，不另造する形式灌水。

來源為 Open Anki JLPT Decks，固定 commit `1ad66734417aca9dbcca6b2d5ee440cb13ab3ba0` 的各級 CSV。詞形、讀音、適用義項與詞性核對使用 JMdict / jmdict-simplified `3.6.2+20260928191014`。沒有近似配對；多候選須有人工選定的 ID。來源可能同時標記數個級別，因此跨級可有重疊；總分級條目 5233 不是跨級不重複單字數。JMdict 不提供或認證 JLPT 分級，亦不宣稱官方完整詞表。

`sources.html` 公開每級來源、分類計數、人工修正、排除及合併紀錄。繁體中文為本專案依日文及字典英文義項整理，未經第三方中文辭典審定。資料授權及原始歸屬見 `sources/LICENSE-DATA.md`；JMdict 衍生資料及翻譯採 CC BY-SA 4.0。

## 使用功能

- 每級 5 個詞性頁：`n[2345]-nouns.html`、`-verbs.html`、`-i_adjectives.html`、`-na_adjectives.html`、`-others.html`。
- 搜尋整個分類的日文、平／片假名、中文、詞性及合併異寫，60 詞分頁；可只看收藏。
- 假名輸入／中文選擇兩種測驗，選 20、50 或全部符合詞彙。題目前與答案後可點擊聽發音；列表也可朗讀。
- N3／N4 舊 `-adjectives.html` 網址保留合併瀏覽，不重複計入首頁數量。
- `n3.html`、`n4.html`、`n5.html` 保留既有動詞測驗與原 CSV；三頁共用 `learning.css`，含手機排版、深淺主題及答案發音。新版詞彙的動詞頁是原形讀音／詞義測驗。
- 文法支援 10／20／全題、錯題重練、未練題目及續答。題幹空格朗讀為「空欄」，選項播放不會作答。
- localStorage `jp-learning-v1` 保留文法答案與進度。330 個舊詞可按同級詞形／讀音遷移收藏；370 個未匹配詞保留在「保留的舊版收藏」，只有以前已收藏才顯示，不混入查核題庫，可朗讀／移除。
- 發音使用裝置 `speechSynthesis` 日文語音；失敗顯示提示，實際聲音取決於裝置。儲存受阻仍可使用本次練習。

## 重建與更新

完整字典是建置依賴，放在 `sources/jmdict/`，不必部署整份字典。`fetch-n2-sources.ps1` 可下載固定字典（`-LatestDictionary` 查最新版）；各級原始詞表快照在 `sources/n2.csv`、`sources/n3.csv`、`sources/n4.csv`、`sources/n5.csv`，勿覆蓋根目錄既有動詞 CSV。

對每個等級執行，例如：

```sh
node build-verified.cjs n3
node build-verified.cjs n4
```

人工檢查 audit 排除／合併清單，維護 `<level>-overrides.json` 的來源列修正與 `<level>-zh.json` 的 JMdict ID 對應中文。新增未翻譯詞會阻止 publish；固定來源版本變更時必須重新檢查以列號保存的修正。

```sh
node build-verified.cjs n2 --publish
node build-verified.cjs n3 --publish
node build-verified.cjs n4 --publish
node build-verified.cjs n5 --publish
node build-pages.cjs
node create-sources.cjs
```

建置保存原始 SHA-256、來源列號、JMdict ID、義項索引與 POS；`<level>-dictionary-evidence.json` 是該版字典證據子集，供離線驗證。`vocabulary-data.js` 現在提供空資料容器、舊收藏 ID 映射及未匹配舊收藏；真正的查核詞表由 `n2-data.js`、`n3-data.js`、`n4-data.js`、`n5-data.js` 載入。四份資料均須在 `learning.js` 前載入。

初稿翻譯序號檔與一次性 prepare/publish/upgrade 輔助檔只對應這次排序，不能用來更新新版本資料；後續以 JMdict ID 維護 `*-zh.json`。依 EDRDG 授權，持續服務的部署應定期（至少每月）檢查字典更新；沒有建立自動排程。

## 測試

```sh
node test.js
node test-n2.cjs
node test-verified.cjs
node test-learning.cjs
```

- `test.js`：既有 CSV、各題型及答案別名、空白 Enter、IME／長按防誤送、混合題型與載入失敗。
- `test-n2.cjs`：保留 N2 原有 1792 詞及易混義回歸測試。
- `test-verified.cjs`：全 5233 分級條目的來源 SHA、級別、數量守恆、ID／詞形讀音去重、字典義項／POS、分類回歸、700 個舊詞的收藏映射或保留紀錄。
- `test-learning.cjs`：文法及資料檢查；指定 `PLAYWRIGHT_PATH` 為 Playwright 模組路徑，`BROWSER_CHANNEL=chrome`（預設 Chrome），再執行可跑完整瀏覽器測試。

Chrome 測試涵蓋 29 頁 × 360、390、768、1440px，20 個分類的兩種詞彙測驗、分頁、來源連結、搜尋、收藏持久化／遷移、播放不誤作答、既有動詞主題與音訊、文法續答／計分／錯題及儲存失敗。使用真正 Chrome 調整 viewport；並非實體手機測試。語音以 mock 驗證日文文字、lang 及按鈕流程，沒有宣稱已逐詞聆聽音色。

## 文法 500 題與彙整

N5、N4、N3 各 500 題，共 1,500 個不同題幹；每級 61 個用法單元。相同句型的不同用法分開整理，不宣稱有 183 種不同文法。

- grammar-overview.html：等級篩選、搜尋、每頁 12 個單元、接續、中文說明、完整例句與日文朗讀。
- 每個單元可直接進入指定用法測驗，支援全部／未練／錯題、10／20／全部符合題目。
- 原有 315 題內容和 ID 保留，新增題號為各級 106～500；localStorage 格式相容，旧練習可續答。
- grammar-source/legacy-grammar.js 保存原始 105 題／級；n5.txt、n4.txt、n3.txt 各提供 395 個新增情境。每組以標題、答案、干擾選項、接續、解析及各自撰寫的句子組成。
- 執行 node build-grammar.cjs 可重建 grammar-data.js；執行 node build-pages.cjs 可重建頁面。建置會阻止題數錯誤、重複題幹、缺空格與重複選項。
- 文法為專案編寫教材，分級為學習安排。彙整頁連結國際交流基金的延伸教材；不將文法標示為經 JMdict 核對或外部逐題審定。

驗證：node test-grammar.cjs、node test.js、node test-verified.cjs、node test-n2.cjs、node test-learning.cjs。瀏覽器測試使用已安裝 Chrome（BROWSER_CHANNEL=chrome）與 PLAYWRIGHT_PATH 指定的 Playwright，涵蓋 30 個頁面 × 4 種寬度、搜尋／分頁／音訊呼叫、句型限定與每級全部 500 題、續答、錯題及既有詞彙／動詞功能。語音測試驗證呼叫與日文參數；實際發聲取決於裝置日文語音。
