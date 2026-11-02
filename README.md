# 日語練習室

N1～N5 詞彙、文法、收藏與 VOICEVOX 朗讀的靜態學習網站。現有 7,904 個分級詞彙條目、每級 500 題文法；分級是民間學習參考，並非官方完整考試清單。

```sh
npm start
```

開啟 http://127.0.0.1:8000/layout.html 。不需安裝前端套件；Node.js 20 以上即可啟動（沒有 npm 時，直接執行 `node scripts/serve.cjs`）。也可以使用 `python -m http.server 8000 --directory public`。

- [整體檔案結構與維護入口](docs/ARCHITECTURE.md)
- [Codex／AI 工作指引](AGENTS.md)
- [專案專用 AI skill](.agents/skills/japanword-maintenance/SKILL.md)
- [詞彙資料授權](data/vocabulary/sources/LICENSE-DATA.md)
- [例句出處](data/vocabulary/examples/ATTRIBUTION.md)
- [VOICEVOX 音檔說明](data/speech/EXAMPLE-AUDIO.md)

根目錄只保留啟動設定、說明與相容入口。網站發布檔在 `public/`，教材原稿在 `data/`，工具在 `scripts/`，測試在 `tests/`，文件在 `docs/`。正式部署可直接把 `public/` 設為網站根目錄；GitHub Pages 若發布 main 的根目錄，入口頁會轉到 `public/layout.html`。

```sh
npm run build
```

這會重建文法、動詞 CSV、例句與 HTML，不會下載整本字典或重新合成音訊。字典核對、音訊生成與測試命令見結構文件。

這次新增 N1 全部 2,671 詞的例句，402 個動詞各有原型、て形及常用用法，合計 3,475 組詞彙例句用法；另新增 50 個文法單元、500 題，並生成對應 VOICEVOX。依本次要求，**尚未執行變更後的資料測試、瀏覽器驗證或逐句音訊驗證**。
