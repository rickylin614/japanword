const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const {ROOT_DIR}=require('../lib/paths.cjs');
const {kana,moras,distance,comparison,glosses,lexicalClass}=require('../lib/listening-focus.cjs');
const check=process.argv.includes('--check'),levels=['n5','n4','n3','n2','n1'],c={window:{JP_VOCABULARY:{}}};
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const read=file=>fs.readFileSync(path.join(ROOT_DIR,file),'utf8').replace(/^\uFEFF/u,'');
function publish(file,text){if(check)assert.equal(read(file).replace(/\r\n/g,'\n'),text,'Listening build is stale: '+file);else fs.writeFileSync(path.join(ROOT_DIR,file),text);}
const approved=JSON.parse(read('data/listening/approved-sentences.json')),policy=JSON.parse(read('data/listening/focus-policy.json'));
for(const [file,digest]of Object.entries(approved.sourceHashes))assert.equal(hash(read(file)),digest,'Re-run listening vocabulary review: '+file);
for(const l of levels)for(const suffix of ['data','examples','example-audio'])vm.runInNewContext(read('public/assets/data/'+l+'-'+suffix+'.js'),c);
const words=l=>Object.values(c.window.JP_VOCABULARY[l]).flat(),byId=new Map(levels.flatMap(l=>words(l).map(w=>[w.id,{...w,level:l}])));
const dictionary=levels.map(l=>JSON.parse(read('data/vocabulary/sources/'+l+'-dictionary-evidence.json')));
const english=new Map();for(const d of dictionary)for(const w of d.words)if(!english.has(w.id))english.set(w.id,new Set(w.sense.flatMap(s=>s.gloss.filter(g=>g.lang==='eng').map(g=>g.text.toLowerCase().replace(/\([^)]*\)/gu,'').replace(/^(?:to |a |an |the )/u,'').trim())).filter(Boolean)));
const synonymous=(a,b)=>[...(english.get(a.jmdictId)||[])].some(g=>english.get(b.jmdictId)?.has(g));
let seed=20261114;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const audit={schemaVersion:2,format:'sentence-focus',policy:approved.policy,phoneticPolicy:policy,sourceHashes:{...approved.sourceHashes},levels:{}};
for(const l of levels){
 const all=levels.slice(0,levels.indexOf(l)+1).flatMap(x=>words(x).map(w=>byId.get(w.id)));
 const spellingReadings=new Map();for(const w of all){if(!spellingReadings.has(w.word))spellingReadings.set(w.word,new Set());spellingReadings.get(w.word).add(kana(w.reading));}
 const pool=all.filter(w=>lexicalClass(w)&&moras(w.reading).length>=policy.minMoras&&moras(w.reading).length<=policy.maxMoras&&glosses(w,policy.singleCharacterGlosses).length);
 const near=new Map();
 function distractors(w,record,correctGloss){
  if(!near.has(w.id))near.set(w.id,pool.filter(x=>lexicalClass(x)===lexicalClass(w)&&x.id!==w.id&&kana(x.reading)!==kana(w.reading)&&Math.abs(moras(x.reading).length-moras(w.reading).length)<=policy.maxMoraDifference&&!synonymous(x,w))
   .map(x=>({word:x,distance:distance(w.reading,x.reading),group:policy.semanticGroups.some(g=>g.includes(x.word)&&g.includes(w.word))}))
   .filter(x=>x.distance<=policy.maxNormalizedDistance).sort((a,b)=>(a.distance-(a.group ? 0.1 : 0))-(b.distance-(b.group ? 0.1 : 0))||a.distance-b.distance||a.word.id.localeCompare(b.word.id)));
  const result=[];
  for(const x of near.get(w.id)){
   if(record.transcript.includes(x.word.word)||kana(record.transcript).includes(kana(x.word.reading))||result.some(o=>kana(o.word.reading)===kana(x.word.reading)))continue;
   const g=glosses(x.word,policy.singleCharacterGlosses)[0];
   if(g===correctGloss||g.includes(correctGloss)||correctGloss.includes(g)||result.some(o=>o.gloss===g))continue;
   result.push({...x,gloss:g});if(result.length===3)break;
  }
  return result;
 }
 const candidates=[],seen=new Set();
 for(const record of approved.levels[l]){
  let offset=0;
  for(const p of record.proof){
   const start=record.transcript.indexOf(p.surface,offset);assert.ok(start>=offset,'Unaligned lexical proof');offset=start+p.surface.length;
   if(p.type!=='vocabulary')continue;
   const w=byId.get(p.wordId);assert.ok(w);
   if(!lexicalClass(w)||(p.surface!==w.word&&kana(p.surface)!==kana(w.reading))||spellingReadings.get(w.word).size!==1||moras(w.reading).length<policy.minMoras||moras(w.reading).length>policy.maxMoras)continue;
   if(record.transcript.split(p.surface).length!==2)continue;
   const gloss=glosses(w,policy.singleCharacterGlosses).find(g=>record.translation.split(g).length===2);if(!gloss)continue;
   const wrong=distractors(w,record,gloss);if(wrong.length!==3)continue;
   const id=l+'-listen-focus-'+hash(record.transcript+'\0'+w.id+'\0'+start).slice(0,20);if(seen.has(id))continue;seen.add(id);
   candidates.push({id,record,word:w,gloss,start,surface:p.surface,wrong,priority:Number(w.level===l)*2+Number(record.sourceLevel===l)});
  }
 }
 const selected=[],perSentence=new Map(),perWord=new Map(),selectedIds=new Set();
 const ordered=shuffle(candidates).sort((a,b)=>b.priority-a.priority);
 for(let round=1;round<=policy.maxTargetsPerSentence;round++)for(const item of ordered){
  if(selected.length===policy.questionsPerLevel)break;
  const count=perSentence.get(item.record.transcript)||0;
  if(count!==round-1||selectedIds.has(item.id)||(perWord.get(item.word.id)||0)>=policy.maxQuestionsPerTarget)continue;
  selected.push(item);selectedIds.add(item.id);perSentence.set(item.record.transcript,count+1);perWord.set(item.word.id,(perWord.get(item.word.id)||0)+1);
 }
 assert.equal(selected.length,policy.questionsPerLevel,`${l}: only ${selected.length} usable focus questions (${candidates.length} candidates); expand graded sentences, never duplicate questions`);
 const questions=shuffle(selected).map(({id,record:r,word:w,gloss,start,surface,wrong})=>{
  const base=c.window.JP_VOCABULARY_EXAMPLES[r.sourceLevel][r.wordId],e=(base.variants||[base,...(base.usageExamples||[])])[r.index];assert.equal(e.sentence,r.transcript);assert.equal(e.translation,r.translation);
  const pos=r.translation.indexOf(gloss),context=r.translation.slice(0,pos)+'【　】'+r.translation.slice(pos+gloss.length);
  const choices=shuffle([{word:w,gloss,distance:0,group:false},...wrong]);
  const options=choices.map(x=>({text:x.gloss,word:x.word.word,reading:x.word.reading,wordId:x.word.id,sourceLevel:x.word.level,distance:x.distance,
   completion:context.replace('【　】',x.gloss),explanation:x.word.id===w.id?`正確。句中讀的是「${w.word}（${w.reading}）」，這裡對應「${gloss}」。填回句意是「${r.translation}」。`:`這是「${x.word.word}（${x.word.reading}）」的意思，並不是空格對應的「${w.word}」。${comparison(w.reading,x.word.reading)}填入這項會變成「${context.replace('【　】',x.gloss)}」，與錄音這個位置的詞不符。`}));
  const audio=c.window.JP_EXAMPLE_AUDIO[r.sourceLevel][r.wordId][r.index];assert.ok(audio);
  return {id,level:l,type:'sentence-focus',prompt:'請聽完整句子，選出空格對應的詞。',context,audio,transcript:r.transcript,translation:r.translation,answer:options.findIndex(o=>o.wordId===w.id),options,
   target:{word:w.word,reading:w.reading,surface,gloss,wordId:w.id,level:w.level,start,end:start+surface.length,moras:moras(w.reading)},
   explanation:[`完整句意：${r.transcript} → ${r.translation}`,`定位重點：空格對應錄音中的「${w.word}（${w.reading}）」，意思是「${gloss}」。要辨認它在整句中的位置，不能把別處的熟悉詞當成答案。`,`拍數與辨音：${w.reading}分成「${moras(w.reading).join('・')}」，共 ${moras(w.reading).length} 拍。請對照下面三個近音選項的逐拍差異。`,...(e.note?[e.note]:[])],
   vocabularyRefs:r.proof.filter(p=>p.type==='vocabulary').map(({level,wordId})=>({level,wordId})),
   source:{kind:'example',level:r.sourceLevel,wordId:r.wordId,index:r.index,...(e.source?{attribution:e.source}:{})}};
 });
 assert.equal(new Set(questions.map(q=>q.id)).size,1000);
 const text='/* Graded whole-sentence listening with phonetic keyword distractors. */\nwindow.JP_LISTENING=window.JP_LISTENING||{};\nwindow.JP_LISTENING.'+l+'='+JSON.stringify(questions)+';\nwindow.JP_LISTENING_VERSION=window.JP_LISTENING_VERSION||{};window.JP_LISTENING_VERSION.'+l+'='+JSON.stringify(hash(JSON.stringify(questions)))+';\n';
 publish('public/assets/data/'+l+'-listening-data.js',text);
 audit.levels[l]={questions:1000,words:0,sentenceFocus:1000,distinctSentences:perSentence.size,distinctTargets:perWord.size,candidates:candidates.length,sha256:hash(text)};console.log(l+': '+JSON.stringify(audit.levels[l]));
}
for(const file of ['data/listening/focus-policy.json','scripts/build/build-listening.cjs','scripts/lib/listening-focus.cjs',...levels.flatMap(l=>['data/vocabulary/sources/'+l+'-dictionary-evidence.json','public/assets/data/'+l+'-example-audio.js'])])audit.sourceHashes[file]=hash(read(file));
audit.approvedSentencesSha256=hash(read('data/listening/approved-sentences.json'));
publish('data/listening/audit.json',JSON.stringify(audit,null,2)+'\n');
