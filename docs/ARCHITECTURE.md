# 整體結構與維護地圖

本專案使用原生 HTML／CSS／JavaScript，沒有打包器、伺服器端資料庫或前端框架。Node 工具負責把固定來源與教材原稿轉成瀏覽器可載入的資料；訪客只需靜態網站。

## 目錄

```text
japanword/
├─ README.md                    啟動方式與閱讀入口
├─ AGENTS.md                    Codex 與 AI 接手入口
├─ package.json                 啟動、建置、音訊與測試命令
├─ index.html / 404.html         GitHub Pages 根目錄相容入口
├─ .agents/skills/               隨專案版本管理的 AI skill
├─ public/                      網站發布根目錄
│  ├─ *.html                    入口、詞性頁、文法、收藏與會話頁
│  ├─ assets/js/                互動行為：learning、shared-shell、quiz、legacy-navigation
│  ├─ assets/css/               共用樣式、卡片、固定分頁與手機排版
│  ├─ assets/data/              生成的詞彙、例句、文法及音檔映射 JS
│  │  └─ legacy/                N3／N4／N5 動詞測驗 CSV
│  ├─ assets/icons/             favicon.ico、favicon.png
│  └─ audio/                   可發布音檔：words、examples、aizuchi
├─ data/
│  ├─ vocabulary/sources/      固定 CSV、JMdict 證據、中文釋義、修正及核對紀錄
│  ├─ vocabulary/examples/     原創日中例句、Tatoeba 選集、動詞情境及例句清單
│  ├─ grammar/                 各級文法原稿與保留的舊題庫
│  └─ speech/                  發音計畫、生成紀錄、署名、音訊與聲調說明
├─ scripts/
│  ├─ serve.cjs                僅發布 public/ 的本機伺服器
│  ├─ run-tests.cjs            明確執行資料或瀏覽器測試
│  ├─ lib/paths.cjs            目錄常數、資料邏輯名稱解析
│  ├─ build/                   詞表、例句、文法、CSV、HTML、來源頁建置
│  ├─ audio/                   VOICEVOX 計畫、合成、編碼、相づち音調工具
│  ├─ data/                    來源下載及離線語料候選整理
│  ├─ review/                  N1 獨立詞形分析工具；報告寫入 artifacts/
│  └─ legacy/                  歷史整理工具；不是日常建置入口
├─ tests/                      資料與 Playwright 回歸測試
├─ docs/                       結構、路徑搬移對照與歷史紀錄
└─ artifacts/                  本機測試截圖；Git 忽略
```

`docs/file-migration.json` 記錄這次根目錄檔案及資料夾的搬移對照。`docs/HISTORY.md` 保留整理前的開發紀錄，裡面的命令與路徑不代表目前配置。

## 一次請求如何變成畫面

HTML 先載入 `public/assets/data/`，再載入 `public/assets/js/learning.js`。它依 `body[data-page]` 渲染首頁、詞彙、收藏、會話與文法；`data-level`、`data-category` 指定級別與詞性。最後由 `shared-shell.js` 加上學習選單與捲動控制。

詞彙由 `window.JP_VOCABULARY` 保存；例句是 `JP_VOCABULARY_EXAMPLES`；文法與用法單元分別是 `JP_GRAMMAR`、`JP_GRAMMAR_GUIDE`。音檔 URL 由 `JP_WORD_AUDIO`、`JP_EXAMPLE_AUDIO`、`JP_GRAMMAR_AUDIO`、`JP_GRAMMAR_ANSWER_AUDIO` 指向 `public/audio/` 中的檔案。URL 仍寫成 `audio/...`，因為瀏覽器的根目錄是 `public/`。

瀏覽器收藏、答案及未完成練習保存在 localStorage `jp-learning-v1`。N3／N4／N5 舊動詞測驗由 `quiz.js` 讀取 `assets/data/legacy/`；不要把它與新版詞彙測驗的資料格式混用。

## 從哪裡修改

| 任務 | 優先修改 | 建置入口／結果 |
|---|---|---|
| 卡片、收藏、測驗行為 | `public/assets/js/learning.js` | 直接作為網站 JS |
| 頂部選單與共用捲動 | `public/assets/js/shared-shell.js` | 直接作為網站 JS |
| 樣式與排版 | `public/assets/css/interface.css` 等 | 直接作為網站 CSS |
| HTML 載入與新增頁面 | `scripts/build/build-pages.cjs`、`build-shell.cjs` | `npm run build:pages` |
| 詞形、中文釋義、義項 | `data/vocabulary/sources/nX-overrides.json`、`nX-zh.json` | `build-verified.cjs nX --publish` |
| 基本例句 | `data/vocabulary/examples/nX.txt` 或 `nX-corpus.json` | `build-vocabulary-examples.cjs nX` |
| 動詞原型／て形 | `data/vocabulary/examples/verbs-nX.json` | 上述例句建置會呼叫 `build-verb-examples.cjs` |
| 文法與解說 | `data/grammar/nX.txt` | `npm run build:grammar` |
| 聲線、語速、發音輸入 | `scripts/audio/vocabulary-speech-plan.cjs` 等 | 重建計畫、合成、映射與紀錄 |
| 開發與接手指引 | 本文件、`AGENTS.md`、專案 skill | 不需要重建網站 |

根目錄執行：

```sh
npm start
npm run build
node scripts/build/build-vocabulary-examples.cjs n1
```

`npm run build` 不會重新下載字典或合成音檔。更新詞表時，需要完整 JMdict：可用 `scripts/data/fetch-n2-sources.ps1` 下載固定版本，或用 `JMDICT_DIR` 指向專案外的字典目錄，再執行：

```sh
node scripts/build/build-verified.cjs n1 --publish
```

## 教材格式

原創例句每行：`詞條@讀音=句中詞形|日文|繁中`。多個詞條可以逗號共用一句；`=句中詞形` 僅在使用變形、異寫或複合詞時需要；可寫 `=句中詞形~句中讀音` 明列補送假名等特殊讀音。第四欄可填語氣／場合提醒。相同漢字有不同讀音時，務必提供讀音。原稿以穩定詞條 ID 對應到生成檔。

動詞情境以 `verbs-nX.json` 保存，穩定詞條 ID 下的 `dictionary` 與 `te` 各自包含完整 `sentence`、`translation`、`surface`、`reading`；可加 `note`。可選 `common` 以原創句覆寫常用用法；未覆寫時保留原有 `nX.txt`／Tatoeba 選集及署名。三句須分別設計主語、受詞、情境與句型，不能共用前文只改活用。`build-verb-examples.cjs` 檢查覆蓋率、活用與讀音；`scripts/review/verb-contexts.py` 用 Fugashi 輔助列出詞形與情境相似候選，不代表語意或翻譯自動認證。`来たる`、`給う` 等詞保留用法提示。

文法每個區塊：第一行是 `標題::答案::錯項1/錯項2/錯項3::接續::中文說明`，下一行以 `|` 分隔十個含 `【　】` 的題幹。可加第六個欄位作為完整的顯示句型；用在答案只是句型的一部分時。每級 500 題；N1 有 50 單元，N2 有 50 單元，N3～N5 保留舊題及其 ID。

N1～N5 的詞彙分級出自固定版本 Open Anki JLPT Decks／Tanos；JMdict 不提供分級。字典 ID、讀音、適用義項與原始列號不可任意覆寫。Tatoeba 日中例句必須保留來源句 ID、作者、直接或共同譯文關係與 CC BY 2.0 FR 署名。原創例句、候選選集與已執行人工校訂的紀錄要分清楚；N1 選集經本次日中句意與用法複查，保留編輯校訂紀錄；沒有宣稱逐句外部審定。

N5～N1 動詞目前以完整獨立情境取代共用前文模板；改寫數量、特殊活用與驗證結果見 [動詞例句複查紀錄](VERB-CONTEXT-REVIEW.md)。

## 音訊

引擎在專案外，網站使用預先生成音檔。四国めたん（ノーマル，speaker 2）、話速 1.05、停頓比例 0.85 是現有單字／例句設定。相づち另有 A／B 聲線及替代模型路由，請讀 `data/speech/AIZUCHI-REVIEW.md`，不要套用一般例句設定覆寫它。

相づち全部使用原生語調，已移除所有手動升降與母音加工；へえ／ええ／ああ及延伸回應使用 AivisSpeech まお，其餘使用 VOICEVOX。模型路由及局部重建方式見 `data/speech/AIZUCHI-NATURAL-REVIEW.md`。修改相づち音檔後，執行 `verify-aizuchi-prosody.py` 與 `verify-aizuchi-vowels.py` 更新對應紀錄，再執行會話測試。

設定本機 `VOICEVOX_URL`、`VOICEVOX_PYTHON` 後：

```sh
npm run audio:examples
npm run audio:words
npm run build:pages
```

生成器會重用已完成的快取，新增檔案與映射存入 `public/`，計畫與生成紀錄存入 `data/speech/`。修改詞彙或例句後，要同步音檔來源雜湊與映射，避免資料和錄音不一致。

## 測試與目前狀態

使用者要求驗證時，可以執行 `npm run test:data`；瀏覽器測試另設定 `PLAYWRIGHT_PATH` 為已安裝的 Playwright 模組後執行 `npm run test:browser`。截圖集中在 `artifacts/screenshots/`。必要建置所做的完整性條件檢查，不等同資料語意驗證、瀏覽器測試或逐句試聽。

第一階段 `098d338f` 依指示先發布，未執行驗證。第二階段已複查 N1 翻譯、句型與語氣，修正教材及朗讀活用讀音，並執行全部資料、卡片互動與 MP3 解碼檢查；詳見 [N1 複查紀錄](N1-VALIDATION.md)。這不等同母語者逐句審定或逐句人工試聽。

生活單字舊頁及內嵌 478 列專用詞表已移除，選單、專用樣式與相容入口清單同步清理。保留五十音及 N1～N5 教材；不要從歷史備份復原已下架的舊頁。
