const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
/* Offline editorial plan. Does not call an API or generate audio. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root=PROJECT_ROOT;
const read = file => fs.readFileSync(resolveFile(file),'utf8').replace(/\r\n/g,'\n');
const source = read('conversation-data.js');
const context = {window:{}};
vm.runInNewContext(source,context);
const words = context.window.JP_CONVERSATION.aizuchi;
const reviewSource = read('speech/aizuchi-review.txt');
const reviews = reviewSource.split('\n').filter(line=>line.trim()&&!line.startsWith('#'));
assert.equal(reviews.length,100,'Every expression needs an individual review');
const questions = new Set([11,12,30,34,35,61,62,63,64,65,66,67,88,89]);
const unfinished = new Set([71,72,97,100]);
const entries = reviews.map((line,index)=>{
  const fields=line.split('|');
  assert.equal(fields.length,5,'Unexpected review fields at '+(index+1));
  const [rank,expression,contour,intent,direction]=fields;
  const word=words[index];
  assert.equal(Number(rank),word.rank);assert.equal(expression,word.word);
  for(const field of [contour,intent,direction])assert.ok(field.trim());
  assert.ok(word.example.includes(' B：'),'Missing dialogue context');
  const ending=questions.has(word.rank)?'？':unfinished.has(word.rank)?'…':'。';
  const input=word.word.replace(/[？?。…]+$/u,'')+ending;
  return {id:word.id,rank:word.rank,expression,reading:word.reading,meaning:word.meaning,
    context:word.example,contextTranslation:word.translation,register:word.tag,contour,intent,
    input,instructions:[
      '日本語学習用の短い相づちです。自然な標準日本語で、親しみのある成人の声。日本語の語アクセントを保ち、朗読調ではなく実際の会話の返事として発話してください。',
      '発話は input の内容だけ。説明、話者名、場面、指示、英語、中国語、矢印は読み上げず、言葉や笑い声を追加しないでください。',
      '場面（読み上げない）：'+word.example,
      'この音声は B の返事だけです。場面全体を読まないでください。丁寧さ：'+word.tag+'。',
      '個別の演技指示：'+direction,
      '聞き取れる自然な会話速度で。単語を一拍ずつ分断せず、語尾の変化は最後の拍を中心に自然に付け、全体の音高を一律に上げないでください。'
    ].join('\n'),direction,audioStatus:'see_voicevox_audit'};
});
assert.equal(new Set(entries.map(e=>e.id)).size,100);
assert.equal(new Set(entries.map(e=>e.instructions)).size,100);
const sha256 = text=>crypto.createHash('sha256').update(text).digest('hex');
const plan={schemaVersion:1,reviewDate:'2026-11-03',provider:'VOICEVOX',
  status:'pre_generation_context_review',
  reviewScope:'Project-authored review of intended sentence intonation in each existing dialogue; not native-speaker certification or acoustic/listening validation.',
  voiceCandidate:'四国めたん（ノーマル）',voiceStatus:'selected_for_local_synthesis',
  sources:{'conversation-data.js':sha256(source),'speech/aizuchi-review.txt':sha256(reviewSource)},
  reference:'https://voicevox.hiroshiba.jp/how_to_use/',entries};
const markdown=[
  '# 相づち 100 句：生成前語氣審查',
  '',
  '審查日期：2026-11-03。已依使用者回饋移除強制下降尾音，保留現有對話、中文意思、禮貌程度與情境說明。',
  '',
  '**本表記錄生成前的文字與情境審查。音檔生成及實際音高量測結果見 voicevox-audit.json、prosody-check.json；不等於母語者試聽認證。**',
  '',
  '箭頭表示本例的句尾走向，不是每個音節的音高曲線或日文高低重音標記。同一句話在別的情境可以採不同語氣。上揚不應套用到全部相づち；這份安排是專案的教學演繹，並非唯一標準或母語教師逐句認證。',
  '標示「自然回應／自然驚訝」的音檔採 VOICEVOX 原生語調，不經 WORLD 降調或母音延長處理。「へえ、ええ、ああ」另處理短母音合成的雜音；詳見 AIZUCHI-NATURAL-REVIEW.md。',
  '',
  '「輕升後收」表示句尾有柔和起伏後收束，並非強烈疑問。「未完平持」保留思考或接續感。「そう言われると」「うーん」「なるほど、でも…」的單獨表達音檔只讀該片語，不添加對話中的後續句。',
  '',
  '單獨表達共 100 段，僅讀 B 回應，不將 A 情境讀入片語音檔。完整對話另外產生，A 使用青山龍星，B 使用四国めたん，中間保留輪替停頓。',
  '',
  '採 VOICEVOX 本機生成。日文指示是編輯說明，不會直接當作 VOICEVOX 的文字輸入；實際由生成程式依句尾走向、情緒分組與個別調整，設定 mora pitch、長度、語速及停頓。引擎不會自行理解自然語言演技指示。參考：[VOICEVOX 操作說明](https://voicevox.hiroshiba.jp/how_to_use/)。生成完成紀錄見 speech/voicevox-audit.json；本文記錄生成前的審查狀態，不能當成音檔試聽合格證明。',
  '',
  '| # | 表達 | 句尾走向 | 語氣與理由 |',
  '|---|---|---|---|',
  ...entries.map(e=>`| ${e.rank} | ${e.expression} | ${e.contour} | ${e.intent} |`),
  '',
  '## 逐句場景與生成指示',
  '',
  ...entries.flatMap(e=>[`### ${e.rank}. ${e.expression}`,'',`- 情境：${e.context}`,`- 中文：${e.contextTranslation}`,`- 單獨發話文字：${e.input}`,`- 日文演繹指示：${e.direction}`,'']),
  '## 本機重建','',
  '啟動 VOICEVOX Engine 後執行 node scripts/audio/generate-aizuchi-voicevox.cjs。可用 --ranks=6,10,28 更新指定條目；局部更新保留其他錄音與 A 情境的原始 PCM。生成程式會先核對本表與原始對話快照，並保留每段查詢資料。',
  '',
  '音檔使用署名：VOICEVOX:四国めたん／VOICEVOX:青山龍星。聲庫條款：https://www.zunko.jp/con_ongen_kiyaku.html 。引擎與模型放在專案外，不隨網站發布。',''
].join('\n');
for(const [file,output] of [['speech/aizuchi-plan.json',JSON.stringify(plan,null,2)+'\n'],['speech/AIZUCHI-REVIEW.md',markdown]]){
  if(process.argv.includes('--check'))assert.equal(read(file),output,'Stale speech plan: '+file);
  else fs.writeFileSync(resolveFile(file),output);
}
console.log('Reviewed all 100 expressions against current dialogue data; 100 distinct generation instructions prepared. No audio generated or API called.');
