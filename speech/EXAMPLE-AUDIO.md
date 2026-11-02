# N5～N2 全例句 VOICEVOX 音檔

署名：**VOICEVOX:四国めたん**（ノーマル）。音訊為合成語音，非真人錄音。

按 N5 → N4 → N3 → N2 的順序生成。範圍涵蓋全部詞彙例句、動詞原型／て形／常用用法，以及文法彙整全部例句；文法測驗揭答後的完整句子與錯題複習亦共用對應音檔。題目前的空格提示、選項和單字讀音仍用原有瀏覽器朗讀，避免未作答就播放完整答案。

| 等級 | 詞彙例句用法 | 文法例句 | 本級新增的不同朗讀輸入 |
|---|---:|---:|---:|
| N5 | 916 | 500 | 1394 |
| N4 | 970 | 500 | 1466 |
| N3 | 2839 | 500 | 3319 |
| N2 | 2376 | 500 | 2670 |
| 合計 | 7101 | 2000 | 8849 |

同一朗讀輸入及設定共用檔案；不同標的讀音需各自保留，不能僅憑書寫句子相同就共用。例如「抱いて」可能讀 いだいて 或 だいて。`vocabulary-speech-plan.cjs` 依既有例句讀音證據、動詞變化及詞彙讀音，將目標詞替換成核對過的讀音，畫面原句不變。文法沒有逐詞讀音標註的部分由 VOICEVOX 日文分析器判讀；自動驗證不等於每個漢字皆經母語者試聽審定。

語速為自然日常會話的教學設定：`speedScale=1.05`、`pauseLengthScale=0.85`，保留日文重音及句讀。以短、長例句校準，並非對某部日劇或某位演員實測對齊。文件中未把這個速度稱為所有日劇的一致標準。

原始合成使用單聲道 24 kHz WAV，生成時檢查格式、長度、音量與削波，再編碼為 64 kbps MP3。原始 WAV、引擎及模型不納入網站；訪客直接播放靜態 MP3，不需 API、安裝 VOICEVOX 或等待生成。音檔網址附內容雜湊，以避免沿用舊快取。

## 來源與授權

- VOICEVOX 軟體條款：https://voicevox.hiroshiba.jp/term/
- 四国めたん聲庫條款：https://www.zunko.jp/con_ongen_kiyaku.html
- 引擎：VOICEVOX Engine 0.26.0，使用官方版本。
- 例句文字及外部來源：`vocabulary-examples/ATTRIBUTION.md`、各級 `n*-examples.js`。Tatoeba 的句子、作者、原句連結與 CC BY 2.0 FR 署名仍保留於卡片及資料檔；音檔是相應文本的語音呈現，散布時請保留相應來源與授權資訊。`speech/vocabulary-plan.json` 將每個音檔 ID 對應到原句、等級、詞彙或文法單元及變體索引。
- 音檔生成紀錄：`speech/vocabulary-audio-audit.json`，含輸入、讀音、引擎設定、音檔雜湊、長度、音量與來源快照。

## 重建與驗證

1. 啟動本機 VOICEVOX Engine，預設 `http://127.0.0.1:50021`。
2. 建議以 `speech/requirements-examples.txt` 安裝本機 Python 編碼依賴，將 `VOICEVOX_PYTHON` 設為該 Python 執行檔；也可改以 `VOICEVOX_FFMPEG` 指定 ffmpeg。可用 `VOICEVOX_CACHE` 指定專案外快取目錄。GPU 引擎可用 `VOICEVOX_URL` 指定本機連接埠。
3. 執行 `node generate-vocabulary-voicevox.cjs`。中途可重跑，會核對檔案雜湊後沿用已完成錄音；同一等級完成後才進入下一級。
4. 執行 `node build-pages.cjs`，將各級音檔清單載入對應頁面。
5. 執行 `node test-example-audio.cjs`。設定 `PLAYWRIGHT_PATH` 後加跑全部例句朗讀按鈕與全部 MP3 的 Chrome 實際解碼驗證。

這些檢查驗證完整覆蓋、來源一致性、錄音讀取與播放路由，不將未試聽的全部語音描述成母語者認證。相づち的語氣曲線與雙聲線對話另見 `speech/ATTRIBUTION.md`。
