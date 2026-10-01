// Reproducible N2 source join. Run from this folder after fetching sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
function csv(source){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(field.trim());field='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}else field+=c;}row.push(field.trim());if(row.some(Boolean))rows.push(row);const headers=rows.shift();return rows.map((r,i)=>Object.fromEntries([...headers.map((h,j)=>[h,r[j]]),['line',i+2]]));}
const normalized=s=>s.normalize('NFKC').trim().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const dictionaryFile=fs.readdirSync(path.join(root,'sources/jmdict')).find(f=>f.endsWith('.json'));
const dictionary=JSON.parse(read('sources/jmdict/'+dictionaryFile));
const index=new Map();
for(const word of dictionary.words) for(const kana of word.kana){
  const forms=[kana.text,...word.kanji.filter(k=>kana.appliesToKanji.includes('*')||kana.appliesToKanji.includes(k.text)).map(k=>k.text)];
  for(const form of forms){const key=form.normalize('NFKC').trim()+'|'+normalized(kana.text);if(!index.has(key))index.set(key,[]);if(!index.get(key).some(w=>w.id===word.id))index.get(key).push(word);}
}
const rows=csv(read('sources/n2.csv')),excluded=[],merged=[],accepted=[],seen=new Map();
const labels={nouns:'名詞',verbs:'動詞',i_adjectives:'い形容詞',na_adjectives:'な形容詞',others:'副詞等其他詞彙'};
const overrides=JSON.parse(read('sources/n2-overrides.json'));
for(const row of rows){
  const originalWord=row.expression.normalize('NFKC').trim(),originalReading=row.reading.normalize('NFKC').trim();
  const correction=overrides[row.line]||{};
  const word=correction.word||originalWord.replace(/^[~〜～]\s*|\s*[~〜～]$/g,'').trim(),reading=correction.reading||originalReading.replace(/^[~〜～]\s*|\s*[~〜～]$/g,'').trim();
  let matches=index.get(word+'|'+normalized(reading))||[];
  if(correction.id)matches=matches.filter(w=>w.id===correction.id);
  if(matches.length!==1){excluded.push({line:row.line,word,reading,reason:matches.length?'同寫法及讀音對應多個字典詞條，需人工判別':'無唯一精確的詞條及讀音配對',matches:matches.map(w=>w.id)});continue;}
  const entry=matches[0];
  let senses=entry.sense.filter(s=>(s.appliesToKanji.includes('*')||s.appliesToKanji.includes(word))&&(s.appliesToKana.includes('*')||s.appliesToKana.some(k=>normalized(k)===normalized(reading))));
  const affix=/^[~〜～]|[~〜～]$/.test(originalWord);
  if(affix)senses=senses.filter(s=>s.partOfSpeech.some(p=>/pref|suf|ctr|aux/.test(p)));
  const parts=[...new Set(senses.flatMap(s=>s.partOfSpeech))];
  let category;
  if(affix&&parts.length)category='others';
  else if(parts.includes('adj-i')||parts.includes('adj-ix'))category='i_adjectives';
  else if(parts.includes('adj-na'))category='na_adjectives';
  else if(parts.some(p=>/^v/.test(p)&&!['vs','vs-s'].includes(p)))category='verbs';
  else if(parts.some(p=>['adv','adv-to','conj','int','exp','prt','pref','suf','ctr','pn','adj-pn','n-adv','n-suf','n-pref'].includes(p)))category='others';
  else if(parts.some(p=>p==='n'||p==='vs'||p==='vs-s'||p==='n-t'))category='nouns';
  if(!category){excluded.push({line:row.line,word,reading,reason:'沒有支援的明確詞性',parts});continue;}
  if(seen.has(entry.id)){const first=seen.get(entry.id);first.aliases.push({word,reading});first.sourceLines.push(row.line);merged.push({line:row.line,word,into:first.word,jmdictId:entry.id});continue;}
  const item={id:'n2-jmdict-'+entry.id,word,reading,category,pos:labels[category],posCodes:parts,jmdictId:entry.id,aliases:[],sourceLines:[row.line],sourceLevel:'N2',sourceEnglish:row.meaning,english:senses.flatMap(s=>s.gloss.filter(g=>g.lang==='eng').map(g=>g.text)),senseIndex:senses.map(s=>entry.sense.indexOf(s)),...(affix?{affix:originalWord.startsWith('~')||originalWord.startsWith('〜')?'suffix':'prefix'}:{}),...(word!==originalWord||reading!==originalReading?{sourceForm:{word:originalWord,reading:originalReading}}:{})};
  seen.set(entry.id,item);accepted.push(item);
}
accepted.sort((a,b)=>a.reading.localeCompare(b.reading,'ja'));
const metadata=JSON.parse(read('sources/download.json'));
const report={retrievedAt:new Date().toISOString(),...metadata,sourceRows:rows.length,accepted:accepted.length,counts:Object.fromEntries(Object.keys(labels).map(c=>[c,accepted.filter(w=>w.category===c).length])),excluded,merged,sha256:{jlpt:crypto.createHash('sha256').update(read('sources/n2.csv')).digest('hex'),dictionary:crypto.createHash('sha256').update(read('sources/jmdict/'+dictionaryFile)).digest('hex')}};
fs.writeFileSync(path.join(root,'sources/n2-audit.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'sources/n2-verified.json'),JSON.stringify(accepted,null,2));
console.log(JSON.stringify({rows:rows.length,accepted:accepted.length,counts:report.counts,excluded:excluded.length,merged:merged.length}));
if(process.argv.includes('--publish')){
  const translations=JSON.parse(read('sources/n2-zh.json'));
  const banks=Object.fromEntries(Object.keys(labels).map(c=>[c,[]]));
  for(const item of accepted){const meaning=translations[item.jmdictId];if(!meaning||!/[\u3400-\u9fff]/.test(meaning))throw Error('Missing Chinese: '+item.word);banks[item.category].push({...item,meaning});}
  fs.writeFileSync(path.join(root,'n2-data.js'),'/* JMdict-derived data: CC BY-SA 4.0. See sources.html. Chinese glosses translated for this project. */\nwindow.JP_VOCABULARY.n2 = '+JSON.stringify(banks)+';\n');
}
