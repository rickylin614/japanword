# 相づち合成語音署名與模型

署名：**VOICEVOX:四国めたん／VOICEVOX:青山龍星／AivisSpeech:まお**。

全部為本機合成語音，不是真人錄音。完整對話的 A 保留青山龍星；B 與單獨表達通常使用四国めたん，へえ、ええ、ああ及延伸回應使用 AivisSpeech まお。現行 100 組均採模型原生語調，不作手動升降、平持、WORLD 重合成、母音裁切或額外問句上揚。細節見 [現行生成與驗證](AIZUCHI-NATURAL-REVIEW.md)。

- [VOICEVOX 軟體條款](https://voicevox.hiroshiba.jp/term/)
- [四国めたん聲庫條款](https://www.zunko.jp/con_ongen_kiyaku.html)
- [青山龍星聲庫條款](https://www.virvoxproject.com/voicevoxの利用規約)
- [VOICEVOX Engine 0.26.0](https://github.com/VOICEVOX/voicevox_engine/releases/tag/0.26.0)
- [AivisSpeech Engine 1.2.0](https://github.com/Aivis-Project/AivisSpeech-Engine/releases/tag/1.2.0)
- [まお模型／原作者資訊](https://hub.aivis-project.com/aivm-models/a59cb814-0083-4369-8542-f51a29e72af7)：版本 1.2.0、Style-Bert-VITS2 (JP-Extra)、ONNX；署名 AivisSpeech:まお。
- [模型授權 ACML 1.0](https://github.com/Aivis-Project/ACML/blob/master/ACML-1.0.md)；此專案僅發布固定教材的生成音檔，未散布模型。來源與實際 SHA-256 見 `aivisspeech-model.json`。

引擎、BERT、模型與快取保留在專案外。網站發布 100 段表達、100 段對話 WAV 與來源紀錄；訪客不需安裝引擎，也不會呼叫生成 API。音檔網址包含內容雜湊，替換後會載入新版本。

`voicevox-audit.json` 保留歷史檔名，但已按條目記錄 VOICEVOX／AivisSpeech、聲線、實際輸入及查詢、原生渲染模式、長度、音量、雜湊與保留的 A 片段雜湊。資料與播放檢查不等同母語者逐句試聽認證。
