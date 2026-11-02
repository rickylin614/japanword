---
name: japanword-maintenance
description: 維護 japanword 日語學習網站的教材、詞彙、例句、文法、VOICEVOX、互動頁面及建置路徑；適用於 rickylin614/japanword 專案，不適用於無關網站。
---

# 維護 Japanword

先定位 Git 專案根目錄，讀取根目錄 `AGENTS.md` 與 `docs/ARCHITECTURE.md`。結構文件是檔案地圖與命令的主要來源，不要由歷史 README 快照推測現行路徑。

依任務只讀相關資料：

- UI、收藏與分頁：`public/assets/js/learning.js`、`shared-shell.js` 與 `public/assets/css/`。
- 詞彙：`data/vocabulary/sources/`，尤其 `nX-overrides.json`、`nX-zh.json`、audit 與字典證據。原始分級和字典詞義是兩個來源；保留固定版本與 ID。
- 例句：`data/vocabulary/examples/`。先改原稿再建置；動詞要原型、て形、常用用法，中文應符合各自的時態與語意。名詞＋する不因翻譯而額外製造動詞詞條。
- 文法：`data/grammar/nX.txt`；保留既有題目 ID、用法單元關聯與每級 500 題格式。
- 語音：`scripts/audio/` 與 `data/speech/`。引擎與大型暫存放專案外，發布音檔在 `public/audio/`；相づち有獨立聲調與雙聲線流程。

HTML 與 `*-data.js`、`*-examples.js`、音檔映射為生成產物；日常建置是 `npm run build`。完整字典核對及音訊合成是額外步驟，請依結構文件設定。

`resolveFile()` 讓舊資料清單的邏輯檔名對應新目錄；新檔案放進相應的實體目錄，避免增添根目錄工具或來源檔。新頁面由 `build-pages.cjs` 產生，再由 `build-shell.cjs` 統一資源 URL。

沿用 localStorage `jp-learning-v1`、穩定詞條 ID 與舊收藏遷移。保留資料授權、Tatoeba 出處與 VOICEVOX 署名。

依當次要求處理驗證與發布；使用者要求先不驗證時，不啟動測試、瀏覽器檢查或額外驗證器，並在交付時註明。不得把建置或生成完成說成測試通過；本次新增 N1 與目錄重整的狀態見結構文件。推送前需有使用者的發布指示。
