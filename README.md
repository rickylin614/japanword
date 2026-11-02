# 日語練習室

以 `layout.html` 為入口，純 HTML / JavaScript / CSV。保留 N3、N4、N5 既有動詞變化與情境測驗；N2～N5 文法各 500 題。N2～N5 詞彙依公開分級詞表與 JMdict 交叉核對。

## 啟動

在此目錄執行 `python -m http.server 8000` 或 `node serve.cjs`，開啟 http://127.0.0.1:8000/layout.html 。既有動詞需要 fetch CSV，請透過 HTTP 瀏覽。

## 詞彙來源與數量（2026-11-01 再核對）

| 等級 | 名詞 | 動詞 | い形容詞 | な形容詞 | 其他 | 同級去重合計 |
|---|---:|---:|---:|---:|---:|---:|
| N2 | 1057 | 292 | 55 | 90 | 298 | 1792 |
| N3 | 1161 | 374 | 30 | 165 | 361 | 2091 |
| N4 | 303 | 159 | 23 | 41 | 126 | 652 |
| N5 | 293 | 109 | 60 | 30 | 206 | 698 |

N5 原始 718 列，合併 11 列、排除 9 列；N3 原始 2140 列，合併 46 列、排除 3 列；N4 原始 668 列，合併 3 列、排除 13 列。N2 收錄總數不變；「切れ」的接尾語已更正為讀音ぎれ、JMdict #2518850，舊收藏會轉換。vi/vt 是自他動標記，不能單獨作為獨立動詞證據；vs-s（如愛する、接する）則歸入動詞。名詞＋する依字典名詞收錄，不另造する形式灌水。

來源為 Open Anki JLPT Decks，固定 commit `1ad66734417aca9dbcca6b2d5ee440cb13ab3ba0` 的各級 CSV。詞形、讀音、適用義項與詞性核對使用 JMdict / jmdict-simplified `3.6.2+20260928191014`。沒有近似配對；多候選須有人工選定的 ID。來源可能同時標記數個級別，因此跨級可有重疊；總分級條目 5233 不是跨級不重複單字數。JMdict 不提供或認證 JLPT 分級，亦不宣稱官方完整詞表。

`sources.html` 公開每級來源、分類計數、人工修正、排除及合併紀錄。繁體中文為本專案依日文及字典英文義項整理，未經第三方中文辭典審定。資料授權及原始歸屬見 `sources/LICENSE-DATA.md`；JMdict 衍生資料及翻譯採 CC BY-SA 4.0。

## 使用功能

- 首頁 `index.html`／`layout.html` 和共用學習選單新增日常會話分類：`aizuchi.html` 收錄 100 句相づち與延伸回應（含禮貌／隨意變體），`gitaigo.html` 收錄 100 個廣義擬態表達，每詞一個例句。
- 兩類依日常常見程度與學習實用性估排，並非語料庫精確頻率排名。每筆有中文、用法提示、例句翻譯與日文朗讀；相づち另附讀音與禮貌程度。支援日／中／假名搜尋、類型篩選、20／50／100 筆分頁，保留原排序編號。
- 內容在 `conversation-data.js`，頁面由 `build-pages.cjs` 產生。中文、例句與排序為專案編寫，概念參考國立國語研究所、國際交流基金與ひつじ書房教材，頁內提供連結；並非 JLPT 分級或外部逐項審定詞表。執行 `node test-conversation.cjs` 檢查資料，設定 `PLAYWRIGHT_PATH` 可加跑瀏覽器回歸。
- 相づち使用本機 VOICEVOX 預先生成的 100 段表達及 100 段雙聲線對話，點擊直接播放 WAV，不需 API 金鑰或訪客安裝引擎。回應署名 `VOICEVOX:四国めたん`，對話 A 署名 `VOICEVOX:青山龍星`；生成前逐句審查語氣，畫面附句尾走向提示。審查、重建與聲庫條款見 `speech/AIZUCHI-REVIEW.md`、`speech/ATTRIBUTION.md`；實際逐音查詢、檔案雜湊與音量檢查在 `speech/voicevox-audit.json`。自動檢查不等於母語者逐句試聽。擬態語與詞彙本身也已補上 VOICEVOX 音檔，見下列單字朗讀說明。
- 句尾音調另以 WORLD 連續曲線處理，生成後使用 Harvest／StoneMask 量測；再執行 `verify-aizuchi-prosody.py`，以 DIO／StoneMask 重新檢查儲存的 200 個 WAV，結果在 `speech/prosody-check.json`。驗證的是上揚／下降／平持等音高走向，不能由此保證情緒及母語自然度。音檔網址附內容雜湊，更新後可避免沿用舊版快取。

- 每級 5 個詞性頁：`n[2345]-nouns.html`、`-verbs.html`、`-i_adjectives.html`、`-na_adjectives.html`、`-others.html`。
- N5 → N4 → N3 → N2 的全部 7,101 組詞彙例句用法與 2,000 句文法例句，使用 `VOICEVOX:四国めたん` 預先生成自然會話語速音檔（話速 1.05、停頓比例 0.85）。依核對讀音產生 8,849 個不同朗讀輸入，重複內容共用 MP3；文法揭答及錯題複習也使用完整句音檔，題前不揭露答案。範圍、語速校準、來源授權及重建方式見 `speech/EXAMPLE-AUDIO.md`。
- 執行 `node test-example-audio.cjs` 檢查全部音檔雜湊、來源與映射；設定 `PLAYWRIGHT_PATH` 後會逐一驗證全部例句按鈕，並在 Chrome 解碼所有 MP3。這些驗證不等於逐句母語者試聽，語速也不代表每部日劇皆有相同速度。
- 詞彙本身亦使用 VOICEVOX：全部 5,233 筆單字、370 筆舊收藏、100 個擬態語及其例句，採核對讀音生成 5,421 個 MP3；字形讀音一致時保留聲庫的字詞重音，不一致則使用核對假名。列表、單字測驗及舊動詞測驗的原形播放均已接上；重建與驗證見 `speech/WORD-AUDIO.md`、`node test-word-audio.cjs`。
- 搜尋整個分類的日文、平／片假名、中文、詞性及合併異寫，60 詞分頁；可只看收藏。
- 假名輸入／中文選擇兩種測驗，選 20、50 或全部符合詞彙。題目前與答案後可點擊聽發音；列表也可朗讀。
- N3／N4 舊 `-adjectives.html` 網址保留合併瀏覽，不重複計入首頁數量。
- `n3.html`、`n4.html`、`n5.html` 與同級分類動詞一對一同步，CSV 由 `build-verbs.cjs` 產生；三頁共用 `learning.css` 與 `interface.css`，含手機排版、深淺主題及答案發音。新版詞彙的動詞頁是原形讀音／詞義測驗。
- 文法支援 10／20／全題、錯題重練、未練題目及續答。題幹空格朗讀為「空欄」，選項播放不會作答。
- localStorage `jp-learning-v1` 保留文法答案與進度。330 個舊詞可按同級詞形／讀音遷移收藏；370 個未匹配詞保留在「保留的舊版收藏」，只有以前已收藏才顯示，不混入查核題庫，可朗讀／移除。
- 題前空格提示、文法選項及舊測驗中未預生成的變形仍使用裝置 `speechSynthesis` 日文語音；單字本身與 N5～N2 完整例句播放 VOICEVOX MP3，相づち使用其專用語氣音檔。播放失敗顯示提示。儲存受阻仍可使用本次練習。

## 重建與更新

### 單字列表例句（N2～N5 全級）

2026-10-31 再檢查 N5：修正「する」誤譯為印刷，改為「做；進行」並同步例句與動詞 CSV；補充いくら、どうも等基本詞義。N5 698 詞均有例句、共 449 個不同句子；全部 109 個動詞例句另檢查實際活用。詳見 `vocabulary-examples/N5-REVIEW.md`。

N5 698、N4 652、N3 2091、N2 1792 詞，合計 5233 個分級詞條全部有例句，涵蓋每級的名詞、動詞、い形容詞、な形容詞及其餘詞性。每個詞條以穩定 ID 保存日文例句、繁體中文翻譯與句中詞形，標示目標詞／活用形，並可獨立朗讀。所有卡片例句預設收合，點擊「例句」展開；收藏與單字朗讀保留在上方。自然搭配的詞可以共用同句，數量是詞條覆蓋數，不等於不同句子總數；句子數和每類計數見 `vocabulary-examples/audit.json`。

動詞每詞附「原型」「て形」「常用用法」三組不同句子、中文與各自的朗讀按鈕。N5 109／N4 159／N3 374／N2 292，共 934 個分級動詞、2802 組例句。て形依詞義使用進行、結果狀態、請求、動作先後等搭配；常用用法沿用已校訂的實際語境，不宣稱精確語料頻率排名。要る等少用て形的詞有用法提示。

原型／て形新增內容由 `vocabulary-examples/verbs-n[2345].txt` 的逐詞情境產生，格式是 `詞條@讀音#字典ID|日文前文|原型中文|て形中文|て形後文|て形前文`，最後兩欄可省略（後文預設います，前文預設同原型）。同字典 ID、讀音及義項相同時跨級共用；遭う／会う、明ける／開ける、空く／開く等採級別情境覆寫。`build-verb-examples.cjs` 使用 JMdict 活用規則，原型與て形皆附讀音，包含 N2 的ずる→じて。執行 `node build-verb-examples.cjs` 可檢查全部 934 個動詞的情境覆蓋。

N5 例句為專案編寫；N4～N2 使用專案編寫及依詞義選用的 Tatoeba 例句。外部例句保留日文／中文來源 ID、作者及 CC BY 2.0 FR 授權，中文轉為繁體，部分經共通譯文配對，卡片可展開核對原文。原創補充會覆寫不合適的語料例句。詳見 `vocabulary-examples/ATTRIBUTION.md`。例句不是 JMdict 提供或外部逐句審定的教材，也不保證句中所有文法都屬該級。

`vocabulary-examples/n[2345].txt` 是編寫來源，格式為 `詞條@讀音=句中詞形|日文|繁體中文`；沒有同形異讀時可省略讀音，句中為原形時可省略詞形。多個目標以逗號分隔。`n[234]-corpus.json` 是已固定版本的外部例句選集。建置會拒絕同形異讀未指定讀音、重複原創指定、句中詞形不存在、翻譯缺漏及未涵蓋的詞條。

```sh
node build-vocabulary-examples.cjs n5
node build-vocabulary-examples.cjs n4
node build-vocabulary-examples.cjs n3
node build-vocabulary-examples.cjs n2
node build-pages.cjs
node write-example-audit.cjs
node test-vocabulary-examples.cjs
```

`n[2345]-examples.js` 與字典衍生詞表分開發布，重建字典詞表不會覆寫例句。`build-pages.cjs` 僅在對應等級的詞彙列表載入該級例句，N3／N4 舊合併形容詞頁亦相容。`--audit` 列出缺漏，`--check` 驗證發布檔與來源一致。設定 `PLAYWRIGHT_PATH` 後測試逐頁檢查全部 5233 張單字卡、20 個分類、合併形容詞頁、例句朗讀參數、來源、收藏／朗讀位置、搜尋、收藏持久化、主題及四種螢幕寬度。語音測試檢查日文參數與呼叫，不代表逐句人工聽過裝置音色。

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
node build-verbs.cjs
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

## N2 文法與共用導覽

N2 新增 500 題、50 個用法單元；N2～N5 共 2,000 題、233 個用法單元。N2 的編寫來源在 grammar-source/n2.txt，與其他等級一起用 build-grammar.cjs 重建。題幹不重複，並保留原有 N3～N5 題目與紀錄。

共用學習資源區提供來源與實際詞量，四張等級卡都有文法測驗和彙整入口。shared-shell.js／shared-shell.css 提供固定頂部導覽、等級／詞彙分類樹狀選單、Escape 關閉、點擊外部關閉、手機選單內捲動與頁尾 TOP。原有動詞頁及來源頁也使用共用導覽；50 音與其他舊頁附加 TOP。build-pages.cjs 和 create-all-sources.cjs 會自動呼叫 build-shell.cjs，重建後仍保留共用元件。

N2 文法為專案原創情境題，中文用法說明與分級供學習參考，不宣稱官方試題或 JMdict 文法認證。彙整頁提供國際交流基金的逆接與形式名詞說明作延伸閱讀。

## 動詞對齊與介面規範

N3／N4／N5 的動詞變化測驗分別為 374／159／109 詞，來源是分類頁同一份 n3-data.js／n4-data.js／n5-data.js 的 verbs 陣列，沿用 JMdict ID、詞形、讀音和中文。build-verbs.cjs 依 POS 活用規則產生根目錄 CSV，sources/verb-conjugation-audit.json 保存每個詞的漢字與假名活用。不可手改生成 CSV；發布 N3～N5 詞表會自動重建。情境辨析 CSV 保留為額外複習題，不加入動詞詞量。

特別處理行く、来る、する、ある、問う、得る（うる）、敬語五段、特殊サ變（愛する→愛さない、接する→接しない）與送假名省略字形。四種變化皆接受漢字／假名；題目顯示讀音以區分同形詞。test.js 對實際載入 CSV 和分類 ID／中文／讀音逐一核對，並遍歷所有可接受答案；test-verbs.cjs 測試具體不規則活用與 642 詞覆蓋。

2026-11-01 的 N2～N4 再核對修正了 13 筆詞義、9 筆分類及 206 筆例句／對譯。詳見 [核對紀錄](vocabulary-examples/N2-N4-REVIEW.md) 與 [逐筆前後差異](vocabulary-examples/N2-N4-REVIEW.json)。完整字典重建可設定 `JMDICT_DIR` 指向固定版本解壓後的 JSON 目錄，再執行 `node build-verified.cjs n2 --publish`（其他等級同理）。例句重建仍僅依賴專案內的固定資料。

interface.css 統一定義字體、標題、間距、卡片、表單、日文文字與手機排版。首頁等級說明統一為學習目標，來源說明集中在共用資源與可展開說明。五十音、生活單字舊頁也套用共用導覽與頁面規範。瀏覽器回歸涵蓋全部 32 個 HTML 頁面與 360／390／768／1440 像素。
