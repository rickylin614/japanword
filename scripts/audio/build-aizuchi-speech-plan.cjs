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
      '聞き取れる自然な会話速度で。音高・語尾は音声モデル本来の生成に任せ、追加の音高曲線や母音加工を行わないでください。'
    ].join('\n'),direction,audioStatus:'see_voicevox_audit'};
});
assert.equal(new Set(entries.map(e=>e.id)).size,100);
assert.equal(new Set(entries.map(e=>e.instructions)).size,100);
const sha256 = text=>crypto.createHash('sha256').update(text).digest('hex');
const plan={schemaVersion:2,reviewDate:'2026-11-03',provider:'VOICEVOX + AivisSpeech',
  status:'native_context_review',intonationPolicy:'native-only',
  reviewScope:'Project-authored review of intended sentence intonation in each existing dialogue; not native-speaker certification or acoustic/listening validation.',
  voiceCandidate:'四国めたん（ノーマル）',voiceStatus:'selected_for_local_synthesis',
  sources:{'conversation-data.js':sha256(source),'speech/aizuchi-review.txt':sha256(reviewSource)},
  reference:'https://voicevox.hiroshiba.jp/how_to_use/',entries};
const markdown=[
  '# 相づち 100 句：生成前語氣審查',
  '',
  '審查日期：2026-11-03。已依使用者要求移除全部手動升降、平持、母音延長及強制問句上揚，保留對話、中文意思、禮貌程度與情境說明。',
  '',
  '**本表記錄生成前的文字與情境審查。音檔生成及實際音高量測結果見 voicevox-audit.json、prosody-check.json；不等於母語者試聽認證。**',
  '',
  '全部採模型原生語調，不施加任何固定上升、下降或平坦曲線，也不標示音高箭頭。模型自然產生的問句語調予以保留；不額外附加問句上揚。',
  '包含「へえ、ええ、ああ」及其延伸寫法的完整回應，改用 AivisSpeech「まお」（Style-Bert-VITS2 JP-Extra）；其餘 B 回應使用 VOICEVOX 四国めたん。皆不裁切載體母音，不經 WORLD 重合成。',
  '',
  '「そう言われると」「うーん」「なるほど、でも…」的單獨表達音檔只讀該片語，不添加對話中的後續句。',
  '',
  '單獨表達共 100 段，僅讀 B 回應，不將 A 情境讀入片語音檔。完整對話的 A 使用並保留原有青山龍星錄音，中間保留輪替停頓。',
  '',
  '使用本機引擎，日文指示僅為情境編輯紀錄，不會讀入音檔。實際查詢、模型與來源雜湊見 voicevox-audit.json；檔名保留歷史相容，內容已記錄兩種引擎。本文不代表母語者試聽認證。',
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
  '音檔使用署名：VOICEVOX:四国めたん／VOICEVOX:青山龍星／AivisSpeech:まお。條款與模型出處見 ATTRIBUTION.md、aivisspeech-model.json。引擎與模型放在專案外，不隨網站發布。',''
].join('\n');
for(const [file,output] of [['speech/aizuchi-plan.json',JSON.stringify(plan,null,2)+'\n'],['speech/AIZUCHI-REVIEW.md',markdown]]){
  if(process.argv.includes('--check'))assert.equal(read(file),output,'Stale speech plan: '+file);
  else fs.writeFileSync(resolveFile(file),output);
}
console.log('Reviewed all 100 expressions against current dialogue data; 100 distinct generation instructions prepared. No audio generated or API called.');
