const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
// Authored, sense-specific sentence frames shared only by dictionary ID + reading.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {forms}=require('./build-verbs.cjs');
const root=PROJECT_ROOT,levels=['n5','n4','n3','n2','n1'];
const c={window:{JP_VOCABULARY:{}}};
for(const l of levels)vm.runInNewContext(fs.readFileSync(resolveFile(l+'-data.js'),'utf8'),c);
const all=levels.flatMap(l=>c.window.JP_VOCABULARY[l].verbs);
const frames=new Map();
const spelling={'来る@きたる#1591270':'来たる','口吟む':'口ずさむ','損う':'損なう','交す':'交わす','落る':'落ちる','楽む':'楽しむ','終る':'終わる','曲る':'曲がる','落す':'落とす','下る@さがる':'下がる','下す@おろす':'下ろす','押える':'押さえる','代る':'代わる','剥す':'剥がす','反る@かえる':'かえる','する@する#1298670':'刷る','為る@する':'する','為る@なる':'なる','浮ぶ':'浮かぶ','落着く':'落ち着く','引受る':'引き受ける','付合う':'付き合う'};
for(const l of levels){
 const file=resolveFile('vocabulary-examples','verbs-'+l+'.txt');
 if(!fs.existsSync(file))continue;
 fs.readFileSync(file,'utf8').split(/\r?\n/).forEach((line,index)=>{
  if(!line.trim()||line.startsWith('#'))return;
  const [selector,prefix,translation,teTranslation,ending='います',tePrefix=prefix,...extra]=line.split('|');
  assert.equal(extra.length,0,file+':'+(index+1));
  const [term,id]=selector.split('#');
  const [word,reading]=term.split('@');
  const match=w=>w.word===word&&(!reading||w.reading===reading)&&(!id||w.jmdictId===id);
  const local=c.window.JP_VOCABULARY[l].verbs.filter(match);
  const matches=local.length?local:all.filter(match);
  const keys=new Set(matches.map(w=>w.jmdictId+'@'+w.reading));
  assert.equal(keys.size,1,'Unknown/ambiguous frame '+selector);
  const key=l+':'+[...keys][0];assert.ok(!frames.has(key),'Duplicate frame '+selector);
  assert.ok(prefix!==undefined&&translation&&teTranslation,'Incomplete frame '+selector);
  frames.set(key,{prefix,translation,teTranslation,ending,tePrefix});
 });
}
function examplesFor(word){
 const key=word.jmdictId+'@'+word.reading;
 const f=frames.get(word.sourceLevel.toLowerCase()+':'+key)||levels.map(l=>frames.get(l+':'+key)).find(Boolean);
 assert.ok(f,'Missing verb frame: '+word.word+'@'+word.reading);
 const type=word.posCodes.find(p=>p.startsWith('v')&&!['vi','vt'].includes(p));
 const lemma=spelling[word.word+'@'+word.reading+'#'+word.jmdictId]||spelling[word.word+'@'+word.reading]||spelling[word.word]||word.word;
 const te=forms(lemma,type)[1],teReading=forms(word.reading,type)[1];
 const result=[{kind:'dictionary',label:'原型',form:lemma,reading:word.reading,surface:lemma,sentence:f.prefix+lemma+'。',translation:f.translation+'。'},
 {kind:'te',label:'て形',form:te,reading:teReading,surface:te,sentence:f.tePrefix+te+f.ending+'。',translation:f.teTranslation+'。'}];
 if(word.word==='要る')Object.assign(result[1],{sentence:'「要る」のて形は「要って」です。',translation:'「需要」的て形是「要って」。',note:'「要って」較少用於日常連接句，通常改說「必要で」等；不要與「居る→居て」混淆。'});
 if(word.sourceLevel==='N1'&&word.word==='給う')result.forEach(e=>e.note='文語的尊敬表達；現代日常會話較少使用這個詞及其て形。');
 if(word.sourceLevel==='N1'&&word.reading==='きたる')result.forEach(e=>e.note='此處是書面語「来たる（きたる）」，與日常的「来る（くる）」不同。');
 if(type==='v2a-s')result[0].note='此詞原型讀「うる」，活用讀「えて／えます」等；表示可能時常接動詞ます形詞幹。';
 return result;
}
module.exports={examplesFor};
if(require.main===module){for(const l of levels)for(const w of c.window.JP_VOCABULARY[l].verbs)examplesFor(w);console.log('All '+all.length+' verb entries have dictionary/te frames ('+frames.size+' authored frames, including sense-specific level overrides).');}
