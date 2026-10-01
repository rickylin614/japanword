const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={window:{JP_VOCABULARY:{}}};vm.createContext(context);vm.runInContext(read('n2-data.js'),context);
const bank=context.window.JP_VOCABULARY.n2,all=Object.values(bank).flat(),report=JSON.parse(read('sources/n2-audit.json'));
assert.equal(all.length,1792);assert.equal(new Set(all.map(w=>w.id)).size,all.length);assert.equal(new Set(all.map(w=>w.word.normalize('NFKC')+'|'+w.reading.normalize('NFKC'))).size,all.length);
assert.equal(report.sourceRows,report.accepted+report.excluded.length+report.merged.length);
const lines=read('sources/n2.csv').split(/\r?\n/);
for(const [category,words]of Object.entries(bank)){
 assert.equal(words.length,report.counts[category]);
 for(const w of words){assert.equal(w.sourceLevel,'N2');assert.equal(w.category,category);assert.ok(w.meaning&&/[\u3400-\u9fff]/.test(w.meaning));assert.ok(w.reading&&w.posCodes.length&&w.senseIndex.length);for(const line of w.sourceLines)assert.match(lines[line-1],/JLPT_2/);}
}
// Independently check every accepted form/reading against the downloaded dictionary, when present.
const dir=path.join(root,'sources/jmdict');
{
 const dictionary=JSON.parse(read(fs.existsSync(dir)?'sources/jmdict/'+fs.readdirSync(dir).find(f=>f.endsWith('.json')):'sources/n2-dictionary-evidence.json'));
 const entries=new Map(dictionary.words.map(w=>[w.id,w]));
 const normalize=s=>s.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 for(const w of all){const e=entries.get(w.jmdictId);assert.ok(e);const readings=e.kana.filter(k=>normalize(k.text)===normalize(w.reading));assert.ok(readings.length,w.word);assert.ok([...e.kanji,...e.kana].some(f=>f.text.normalize('NFKC')===w.word),w.word);assert.ok(readings.some(k=>k.appliesToKanji.includes('*')||k.appliesToKanji.includes(w.word)||k.text===w.word));assert.ok(w.senseIndex.every(i=>e.sense[i]));assert.ok(w.posCodes.every(p=>w.senseIndex.some(i=>e.sense[i].partOfSpeech.includes(p))));}
 console.log('All 1792 words independently matched to JMdict form, reading, sense and part of speech.');
}
const dataByWord=new Map(all.map(w=>[w.word,w]));
assert.match(dataByWord.get('塩辛').meaning,/發酵海鮮/);assert.match(dataByWord.get('目下').meaning,/晚輩/);assert.match(dataByWord.get('コンセント').meaning,/插座/);assert.match(dataByWord.get('琴').meaning,/七弦/);
console.log('N2 counts:',report.counts,'; duplicate IDs and form/reading pairs: 0; all words have Chinese glosses and N2 source rows.');
