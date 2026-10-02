const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8'),ctx={window:{}};vm.createContext(ctx);
for(const f of ['vocabulary-data.js','n2-data.js','n3-data.js','n4-data.js','n5-data.js'])vm.runInContext(read(f),ctx);
const counts={n2:[1060,289,55,90,298],n3:[1167,368,30,165,361],n4:[303,159,23,41,126],n5:[293,109,60,30,206]};
const normalize=s=>s.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const verb=p=>/^(?:v[1-9]|vk$|vz$|vs-i$|vs-c$|v-unspec$)/.test(p);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const level of ['n2','n3','n4','n5']){
 const bank=ctx.window.JP_VOCABULARY[level],all=Object.values(bank).flat(),r=JSON.parse(read('sources/'+level+'-audit.json'));
 assert.deepEqual(Object.values(bank).map(b=>b.length),counts[level]);
 for(const key of ['id','jmdictId'])assert.equal(new Set(all.map(w=>w[key])).size,all.length,level+' duplicate '+key);
 assert.equal(new Set(all.map(w=>normalize(w.word)+'|'+normalize(w.reading))).size,all.length);
 assert.equal(r.sourceRows,r.accepted+r.excluded.length+r.merged.length);assert.equal(r.accepted,all.length);
 const lines=read('sources/'+level+'.csv').split(/\r?\n/);assert.equal(digest(read('sources/'+level+'.csv')),r.sha256.jlpt);
 assert.ok(r.jlptUrl.endsWith('/'+level+'.csv'));
 const evidence=JSON.parse(read('sources/'+level+'-dictionary-evidence.json')),dict=new Map(evidence.words.map(w=>[w.id,w]));
 const accounted=new Set();
 for(const w of all){
  assert.ok(w.meaning&&/[\u3400-\u9fff]/.test(w.meaning));assert.equal(w.sourceLevel,level.toUpperCase());assert.ok(bank[w.category].includes(w));
  for(const line of w.sourceLines){assert.ok(!accounted.has(line));accounted.add(line);assert.match(lines[line-1],new RegExp('JLPT_(?:N)?'+level[1]+'(?:[,\\s]|$)'));}
  const e=dict.get(w.jmdictId);assert.ok(e,w.word);assert.ok([...e.kanji,...e.kana].some(k=>k.text.normalize('NFKC')===w.word));
  assert.ok(e.kana.some(k=>normalize(k.text)===normalize(w.reading)&&(k.appliesToKanji.includes('*')||k.appliesToKanji.includes(w.word)||k.text===w.word)));
  for(const i of w.senseIndex){const s=e.sense[i];assert.ok(s);assert.ok(s.appliesToKanji.includes('*')||s.appliesToKanji.includes(w.word));assert.ok(s.appliesToKana.includes('*')||s.appliesToKana.some(k=>normalize(k)===normalize(w.reading)));}
  const pos=[...new Set(w.senseIndex.flatMap(i=>e.sense[i].partOfSpeech))];assert.deepEqual(Array.from(w.posCodes),pos);
  if(w.category==='verbs')assert.ok(pos.some(verb),w.word+' has no independent verb POS');
  if(w.category==='i_adjectives')assert.ok(pos.includes('adj-i')||pos.includes('adj-ix'));
  if(w.category==='na_adjectives')assert.ok(pos.includes('adj-na'));
  if(w.category==='nouns')assert.ok(!pos.some(verb));
 }
 for(const x of r.excluded){assert.ok(!accounted.has(x.line));accounted.add(x.line);assert.ok(x.reason);}
 assert.equal(accounted.size,r.sourceRows,'Every source row must be accepted/merged or explicitly excluded');
 const words=new Map(all.map(w=>[w.word,w]));
 if(level==='n3'){assert.match(words.get('パイロット').meaning,/飛行員/);assert.match(words.get('琴').meaning,/十三弦/);assert.match(words.get('ホーム').meaning,/月台/);assert.match(words.get('コード').meaning,/代碼/);assert.equal(words.get('握手').category,'nouns');}
 if(level==='n4'){assert.match(words.get('いただく').meaning,/謙讓/);assert.match(words.get('億').meaning,/億/);assert.equal(words.get('運動').category,'nouns');assert.equal(words.get('運動').reading,'うんどう');assert.equal(words.get('やすい').category,'others');}
 if(level==='n5'){assert.match(words.get('窓').meaning,/窗/);assert.match(words.get('いい').meaning,/好/);assert.match(words.get('出す').meaning,/拿出/);assert.match(words.get('コート').meaning,/大衣/);assert.equal(words.get('結婚').category,'nouns');assert.equal(words.get('つける').jmdictId,'1610400');}
 console.log(level,all.length,'entries: source hashes, coverage, level, unique IDs, readings, senses and POS passed');
}
const old=JSON.parse(read('sources/legacy-vocabulary.json')),mapping=ctx.window.JP_VOCABULARY_MIGRATION,retired=ctx.window.JP_RETIRED_VOCABULARY;
for(const [level,cats]of Object.entries(old))for(const w of Object.values(cats).flat()){
 const target=mapping[w.id];if(!target){assert.ok(retired.some(x=>x.id===w.id));continue;}
 const next=Object.values(ctx.window.JP_VOCABULARY[level]).flat().find(x=>x.id===target);assert.ok(next);
 assert.ok([next,...next.aliases].some(x=>normalize(x.word)===normalize(w.word)&&normalize(x.reading)===normalize(w.reading)));
}
console.log('All 700 old entries accounted for in migration or retained favorites.');
