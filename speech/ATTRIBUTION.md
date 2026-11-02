# VOICEVOX 相づち語音

署名：**VOICEVOX:四国めたん／VOICEVOX:青山龍星**。

本專案的相づち單獨回應使用四国めたん（ノーマル），完整對話的 A 使用青山龍星（ノーマル）、B 使用四国めたん（ノーマル）。全部為合成語音，並非真人錄音或聲音複製。

- 官方軟體條款：https://voicevox.hiroshiba.jp/term/
- 所選聲庫條款：https://www.zunko.jp/con_ongen_kiyaku.html
- A（青山龍星）聲庫條款：https://www.virvoxproject.com/voicevoxの利用規約 。署名須隨音檔保留；以企業、個人事業主或指定企業合作身分使用時，依條款需事先向權利方申請。
- 官方音調調整說明：https://voicevox.hiroshiba.jp/how_to_use/
- 引擎版本：VOICEVOX Engine 0.26.0（Windows CPU）
- 官方發布：https://github.com/VOICEVOX/voicevox_engine/releases/tag/0.26.0
- 官方壓縮檔 SHA-256：`8684e1aa6b856c9fb51720552b4f2d5068e094bc3d0b104467dee20b76f99992`

引擎與模型下載到專案外的本機工具目錄，不隨網站發布。網站僅發布 100 段表達、100 段對話 WAV 及來源紀錄。訪客播放預先生成的檔案，不需安裝 VOICEVOX，也不會呼叫語音生成 API。

本專案先按既有對話逐句審查語氣（`AIZUCHI-REVIEW.md`），再透過 `generate-aizuchi-voicevox.cjs` 設定長度、語速及輪替停頓。`shape-aizuchi-prosody.py` 使用 WORLD 對句尾有聲母音施加連續音高曲線，只混合該區間、保留其他原始取樣。重複回應及第 94～96、100 組的分段回應亦處理前段收尾。日文演繹指示僅為編輯紀錄，不是 VOICEVOX 可直接理解的 prompt。

`voicevox-audit.json` 保存每段實際的 audio_query、音檔雜湊、長度、音量，以及以 Harvest／StoneMask 從處理後 WAV 量測的句尾音高。`verify-aizuchi-prosody.py` 另外使用 DIO／StoneMask 重新量測已儲存的 200 個音檔，輸出 `prosody-check.json`，不修改音訊。上／下行區間要求量測端點相差超過 1.5 半音，平持小於 1.5 半音，先升後降須測得中間高峰。這些檢查驗證句尾音高方向，不保證情緒、完整日文高低重音或母語自然度。第 72、97、100 段對話有超出表達標題的後續句，生成時會以完整句子的結尾調整；第 100 段對話最後為詢問，單獨「でも…」則保留未完感。

重建：先啟動本機 VOICEVOX Engine（預設 `http://127.0.0.1:50021`），執行 `node build-aizuchi-speech-plan.cjs`。Python 安裝 `speech/requirements-voicevox.txt` 的依賴，以 `VOICEVOX_PYTHON` 環境變數指定 Python 執行檔，執行 `node generate-aizuchi-voicevox.cjs`，最後用同一 Python 執行 `verify-aizuchi-prosody.py`。可先加 `--preview` 生成 9 組對比樣本。若變更原始對話，應先重新審查本表再重建；網頁範例測試會比對原始資料的快照，防止舊音檔配上新文字。
