const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {ROOT_DIR,PUBLIC_DIR}=require('../lib/paths.cjs');const path=require('node:path');
const check=process.argv.includes('--check');function publish(file,text){if(check)assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),text,'Listening build is stale: '+file);else fs.writeFileSync(file,text);}
const levels=['n5','n4','n3','n2','n1'],c={window:{JP_VOCABULARY:{}}};
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const approved=JSON.parse(fs.readFileSync(path.join(ROOT_DIR,'data/listening/approved-sentences.json'),'utf8'));
for(const [file,digest]of Object.entries(approved.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(ROOT_DIR,file),'utf8')),digest,'Re-run listening vocabulary review: '+file);
for(const l of levels)for(const suffix of ['data','examples','example-audio'])vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR,'assets/data',l+'-'+suffix+'.js'),'utf8'),c);
vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR,'assets/data/word-audio.js'),'utf8'),c);
const words=l=>Object.values(c.window.JP_VOCABULARY[l]).flat();
const guidesByLevel=Object.fromEntries(levels.map(l=>[l,JSON.parse(fs.readFileSync(path.join(ROOT_DIR,'data/vocabulary/guides',l+'.json'),'utf8'))]));
const dictionary=Object.fromEntries(levels.map(l=>[l,JSON.parse(fs.readFileSync(path.join(ROOT_DIR,'data/vocabulary/sources',l+'-dictionary-evidence.json'),'utf8'))]));
const glosses=new Map();for(const d of Object.values(dictionary))for(const w of d.words)if(!glosses.has(w.id))glosses.set(w.id,new Set(w.sense.flatMap(s=>s.gloss.filter(g=>g.lang==='eng').map(g=>g.text.toLowerCase().replace(/\([^)]*\)/g,'').replace(/^(?:to |a |an |the )/u,'').trim())).filter(Boolean)));
function synonymous(a,b){const x=glosses.get(a.jmdictId)||new Set(),y=glosses.get(b.jmdictId)||new Set();return [...x].some(s=>y.has(s));}
let seed=20261109;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const chars=s=>new Set(s.match(/[\u3400-\u9fff]/gu)||[]);function overlap(a,b){a=chars(a);b=chars(b);return [...a].filter(x=>b.has(x)).length/Math.max(1,Math.min(a.size,b.size));}
const bank={},audit={schemaVersion:1,policy:approved.policy,sourceHashes:{...approved.sourceHashes},levels:{}};
for(const l of levels){
 const all=levels.slice(0,levels.indexOf(l)+1).flatMap(words),readings=all.reduce((groups,w)=>{(groups[w.reading]||=[]).push(w);return groups;},Object.create(null));
 const pool=shuffle(words(l).filter(w=>new Set(readings[w.reading].map(x=>x.meaning)).size===1));
 assert.ok(pool.length>=500,l+' not enough unambiguous words');const guides=guidesByLevel[l];
 const questions=[];let n=0;
 for(const w of pool.slice(0,500)){
  const choices=[];for(const x of shuffle(pool.filter(x=>x.id!==w.id&&x.meaning!==w.meaning&&overlap(x.meaning,w.meaning)<.2&&!synonymous(x,w)))){if(!choices.some(v=>v.meaning===x.meaning))choices.push(x);if(choices.length===3)break;}assert.equal(choices.length,3);
  const options=shuffle([w,...choices]).map(x=>({text:x.meaning,wordId:x.id,sourceLevel:l,explanation:x.id===w.id?`正確。錄音是「${w.word}（${w.reading}）」，意思是「${w.meaning}」。`:`這是「${x.word}（${x.reading}）」的意思，與錄音「${w.reading}」不同。`}));
  questions.push({id:l+'-listen-word-'+w.id,level:l,type:'word',prompt:'請選出錄音中單字的意思。',audio:c.window.JP_WORD_AUDIO.levels[l][w.id],transcript:w.word,reading:w.reading,translation:w.meaning,answer:options.findIndex(o=>o.text===w.meaning),options,explanation:[`辨音與詞義：${w.word}讀作「${w.reading}」，本題以「${w.meaning}」為義。`,guides[w.id]?.explanation||`「${w.word}」是動詞；本題播放辭書形。句中使用時需配合對象、助詞與時態變化，不能把相似發音當作同一個詞。`],vocabularyRefs:[{level:l,wordId:w.id}],source:{kind:'vocabulary',level:l,wordId:w.id}});
 }
 n=0;const selected=approved.levels[l];assert.equal(selected.length,500);
 for(const r of selected){
  const w=words(r.sourceLevel).find(w=>w.id===r.wordId);const base=c.window.JP_VOCABULARY_EXAMPLES[r.sourceLevel][r.wordId];const e=(base.variants||[base,...(base.usageExamples||[])])[r.index];assert.equal(e.sentence,r.transcript);assert.equal(e.translation,r.translation);
  const other=shuffle(selected.filter(x=>x.transcript!==r.transcript&&x.translation!==r.translation&&overlap(x.translation,r.translation)<.35));const distractors=[];for(const x of other)if(!distractors.some(v=>v.translation===x.translation)){distractors.push(x);if(distractors.length===3)break;}assert.equal(distractors.length,3);
  const options=shuffle([r,...distractors]).map(x=>({text:x.translation,explanation:x===r?`正確。這一項完整對應「${r.transcript}」的意思。`:`這一項對應的日語是「${x.transcript}」，所說的內容與本題錄音不同。`}));
  const guide=guidesByLevel[r.sourceLevel][w.id];
  const detail=[`完整句意：${r.transcript} → ${r.translation}`,`關鍵詞：「${e.surface}」在本句對應「${w.word}（${w.reading}）」，詞義是「${w.meaning}」。`,guide?.explanation||e.note||`本句使用${e.label||'常用例句'}。判斷時要把「${e.surface}」與前後的對象、助詞及句尾一起聽，完整意思如上，不能只憑單一熟悉詞猜答案。`];
  if(/ません|ない|なかった/u.test(r.transcript))detail.push('否定辨識：句中含否定形式。請聽清楚否定作用在哪個動作或狀態，不要把「沒有／不做」聽成肯定。');
  if(/でした|ました|だった/u.test(r.transcript))detail.push('時間辨識：句尾或子句含過去形式；需分辨已發生的敘述與現在狀態、未來安排，完整時態以本題翻譯為準。');
  questions.push({id:l+'-listen-sentence-'+hash(r.transcript).slice(0,16),level:l,type:'sentence',prompt:'請選出錄音整句表達的意思。',audio:c.window.JP_EXAMPLE_AUDIO[r.sourceLevel][r.wordId][r.index],transcript:r.transcript,translation:r.translation,answer:options.findIndex(o=>o.text===r.translation),options,explanation:detail,vocabularyRefs:r.proof.filter(x=>x.type==='vocabulary').map(({level,wordId})=>({level,wordId})),source:{kind:'example',level:r.sourceLevel,wordId:r.wordId,index:r.index,...(e.source?{attribution:e.source}:{})}});
 }
 bank[l]=questions;assert.equal(questions.length,1000);assert.equal(new Set(questions.map(q=>q.id)).size,1000);
 const text='/* Vocabulary-gated listening bank. See docs/LISTENING.md. */\nwindow.JP_LISTENING=window.JP_LISTENING||{};\nwindow.JP_LISTENING.'+l+'='+JSON.stringify(questions)+';\nwindow.JP_LISTENING_VERSION=window.JP_LISTENING_VERSION||{};window.JP_LISTENING_VERSION.'+l+'='+JSON.stringify(hash(JSON.stringify(questions)))+';\n';
 publish(path.join(PUBLIC_DIR,'assets/data',l+'-listening-data.js'),text);audit.levels[l]={questions:1000,words:500,sentences:500,sha256:hash(text)};console.log(l+': 1000 listening questions built');
}
for(const file of ['public/assets/data/word-audio.js',...levels.flatMap(l=>['data/vocabulary/guides/'+l+'.json','data/vocabulary/sources/'+l+'-dictionary-evidence.json','public/assets/data/'+l+'-example-audio.js'])])audit.sourceHashes[file]=hash(fs.readFileSync(path.join(ROOT_DIR,file),'utf8'));
audit.approvedSentencesSha256=hash(fs.readFileSync(path.join(ROOT_DIR,'data/listening/approved-sentences.json'),'utf8'));publish(path.join(ROOT_DIR,'data/listening/audit.json'),JSON.stringify(audit,null,2)+'\n');
