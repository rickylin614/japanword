# Japanword：給 Codex 與其他 AI 的入口

先閱讀 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，再依任務讀取 [.agents/skills/japanword-maintenance/SKILL.md](.agents/skills/japanword-maintenance/SKILL.md)。原始碼、資料與發布檔分開，請勿把新的產物堆回根目錄。

- 網站根目錄是 `public/`；`npm start` 保留 `/layout.html`、`/n5-verbs.html` 等網址。
- 修改教材應優先改 `data/` 原稿，再用 `scripts/build/` 重建，避免只改生成檔。
- 已有 JMdict 詞條 ID、文法題目 ID 與 localStorage `jp-learning-v1` 需要保持相容；不要重排成新的流水號。
- `scripts/lib/paths.cjs` 集中處理實體目錄與歷史資料邏輯名稱。建立新功能時使用實體目錄；讀取既有雜湊清單時可使用 `resolveFile()`。
- 詞彙分級來自固定版外部詞表；JMdict 負責詞形、讀音、詞性與義項，不認證 JLPT 等級。
- VOICEVOX／AivisSpeech 引擎、模型與暫存資料留在專案外；發布用 MP3/WAV 與映射位於 `public/`。
- 相づち一律使用模型原生語調，不加入手動升降、平持、WORLD 重合成、母音裁切或額外問句上揚。`aizuchi-model-routing.cjs` 將「へえ／ええ／ああ」及延伸回應路由至 AivisSpeech まお，其餘 B 使用四国めたん。生活單字舊頁與專用來源已移除，不可由舊備份恢復。
- 依當次使用者要求決定是否驗證與是否推送。使用者明確要求略過驗證時，不跑測試、瀏覽器檢查或 skill 驗證器，並如實交代。教材與頁面建置仍是產生可用結果的必要工作。
- 本次已依使用者指示完成兩階段發布：第一階段略過驗證；第二階段進行 N1 教材複查與資料／瀏覽器／音訊回歸。實際證據及限制見 `docs/N1-VALIDATION.md`，不可把程式測試說成母語者逐句認證。
