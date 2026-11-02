# 相づち：全原生語調與替代模型（2026-11-03）

依最新要求，100 組相づち皆使用模型原生語調。已移除所有手動上升、下降、平持、延長母音、載體母音裁切與額外問句上揚。頁面僅保留使用情境，不顯示升降箭頭。模型自身從原文產生的自然語調不另行修改。

## 模型與範圍

「へえ」「ええ」「ああ」及「ええ、わかります」（第 6、10、28、96 組）的表達與對話 B 回應，改用 **AivisSpeech 1.2.0／まお 1.2.0／Style-Bert-VITS2 (JP-Extra)** 完整生成；不是 VOICEVOX 的另一個聲線。其餘 B 回應使用 VOICEVOX 四国めたん。A 全部保留原有青山龍星 PCM，本次已與前一版逐段比對 100 組，位元組完全一致。

`aizuchi-model-routing.cjs` 依表達、讀音及 B 回應辨識へえ／ええ／ああ與小假名、長音寫法。後續新增同類回應會使用替代模型，整句採同一模型，不混接音節。A 的文字不參與 B 的模型選擇。

只設定一般話速、輸出取樣率與音量；不改音素音高、長度、重音或疑問旗標。替代模型音量比例 0.45，用於降低與既有聲線的音量差異，不作變調。主動音高處理程式已從 `scripts/audio/` 移除；`renderer-snapshots/` 僅保存歷史來源，不參與現行生成。

## 出處與檢查

模型資訊、版本、ACML 1.0 授權、下載網址及實際模型 SHA-256 保留在 `aivisspeech-model.json`。引擎、BERT 與 AIVMX 模型安裝於專案外，網站只發布錄音及署名。參考 [AivisSpeech Engine](https://github.com/Aivis-Project/AivisSpeech-Engine) 與[まお模型頁](https://hub.aivis-project.com/aivm-models/a59cb814-0083-4369-8542-f51a29e72af7)。

`voicevox-audit.json` 因歷史相容保留檔名，內容已記錄兩種引擎、逐句模型、原始查詢、生成輸入、無手動音高處理、音檔雜湊與 A 片段雜湊。生成器先完成全部錄音，再寫入發布檔及映射。

`verify-aizuchi-prosody.py` 現在驗證原生模式及 200 個 WAV 完整性，不再量測或要求指定音高曲線。`verify-aizuchi-vowels.py` 檢查 4 組替代模型回應的有聲訊號與週期性，未把訊號檢查說成主觀自然度評分。`test-conversation.cjs` 驗證模型路由、相似寫法、查詢、雜湊、映射與沒有手動聲調；瀏覽器檢查實際解碼 200 個音檔及播放按鈕。未宣稱母語者逐句聽審。

## 重建

啟動本機 VOICEVOX 與 AivisSpeech 引擎；預設連接埠為本專案使用的 50022／10102，可用 `VOICEVOX_URL`／`AIVISSPEECH_URL` 指定。Python 訊號檢查依賴見 `requirements-voicevox.txt`。

```sh
node scripts/audio/build-aizuchi-speech-plan.cjs
node scripts/audio/generate-aizuchi-voicevox.cjs
python scripts/audio/verify-aizuchi-prosody.py
python scripts/audio/verify-aizuchi-vowels.py
node tests/test-conversation.cjs
```

可用 `--ranks=6,10,28,96` 局部更新，保留其他條目及 A 原始錄音；瀏覽器驗證另設定 `PLAYWRIGHT_PATH`。
