# 相づち自然語調修正（2026-11-03）

使用者回報「へえ、ええ、ああ」像雜音，並認為「緩降 ↘」相關處理不自然。本次優先移除刻意降尾音，不再為了通過固定音高曲線而重合成這些回應。

## 變更

- 64 個單獨表達改為「自然回應／自然驚訝」。原生 VOICEVOX 直接生成，不套用 WORLD 聲調重合成、強制下降曲線或額外延長母音；頁面也移除這些條目的下降箭頭。
- 這 64 個對話的 B 回應一起更新。第 100 句完整對話最後有真正的疑問，仍保留句尾上揚；中間分句不再強制下降。其餘明確疑問、升降驚訝及平持條目沿用原錄音。
- 「へえ」使用原生短語生成。「ええ、ああ」的裸母音合成較不穩定，改以同聲庫的帶起音母音生成，沿用目標短語的原生音高，剪去起音子音，只保留所需的 e／a 母音及 5ms 邊緣淡入淡出。查詢、載體文字與裁剪時間保留在 audit 的 `rendering`，不對波形作變調或 vocoder 重合成。
- A 聲線仍是青山龍星，B 仍是四国めたん。局部生成會直接保留舊對話的 A PCM；本次已逐段比對全部 100 個 A 片段，與修改前位元組完全一致。
- 音檔映射已換內容雜湊，瀏覽器會載入新錄音。沒有改動一般詞彙及文法的音檔。

## 檢查

`test-conversation.cjs` 檢查全部 200 個 WAV 的來源、映射、雜湊、原生模式及剩餘明確聲調紀錄；瀏覽器測試實際解碼全部 200 檔，確認兩個首頁入口、分頁、篩選、搜尋與播放按鈕。

`verify-aizuchi-vowels.py` 對三句的有聲訊號與週期性作回歸檢查；「へえ／ええ／ああ」的有效視窗中位自相關約為 0.737／0.622／0.420。這是訊號檢查，不是主觀聽感的分數，也不應把不同母音直接拿來排名。

`verify-aizuchi-prosody.py` 只量測仍明列曲線的區間；自然回應不再要求通過固定降調，空區間不代表已檢驗其情緒。音高曲線通過不能保證聽起來自然，這也是本次移除強制下降處理的原因。

## 重建

```sh
node scripts/audio/build-aizuchi-speech-plan.cjs
node scripts/audio/generate-aizuchi-voicevox.cjs --ranks=6,10,28
python scripts/audio/verify-aizuchi-prosody.py
python scripts/audio/verify-aizuchi-vowels.py
node tests/test-conversation.cjs
```

生成需本機 VOICEVOX 及 `VOICEVOX_URL`；Python 設定 `VOICEVOX_PYTHON` 與 `data/speech/requirements-voicevox.txt` 的依賴。需要瀏覽器檢查時設定 `PLAYWRIGHT_PATH`。不宣稱已由母語者逐句聽審。
