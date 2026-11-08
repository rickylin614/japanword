// Import complete, reviewed editorial notes by stable vocabulary ID.
// node scripts/data/import-word-guides.cjs n5 nouns artifacts/word-guides/nouns-n5.txt
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {ROOT_DIR,resolveFile}=require('../lib/paths.cjs');
const [level,category,input]=process.argv.slice(2);assert.match(level,/^n[1-5]$/);assert.ok(['nouns','i_adjectives','na_adjectives','others'].includes(category));
const c={window:{JP_VOCABULARY:{}}};vm.runInNewContext(fs.readFileSync(resolveFile(level+'-data.js'),'utf8'),c);
const words=c.window.JP_VOCABULARY[level][category];
const target=path.join(ROOT_DIR,'data/vocabulary/guides',level+'.json'),output=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{};
const seen=new Set();
for(const [index,line]of fs.readFileSync(input,'utf8').replace(/^\uFEFF/u,'').split(/\r?\n/u).entries()){
 if(!line.trim()||line.startsWith('#'))continue;
 const [selector,explanation,sentence,translation,surface,reading,...extra]=line.split('|');assert.equal(extra.length,0,'Extra fields at '+(index+1));
 const [term,id]=selector.split('#'),[word,kana]=term.split('@');
 const matches=words.filter(w=>w.word===word&&(!kana||w.reading===kana)&&(!id||w.jmdictId===id));assert.equal(matches.length,1,level+' '+selector);
 const w=matches[0];assert.ok(!seen.has(w.id),selector+' repeated');seen.add(w.id);
 assert.ok(explanation&&explanation.length>=18,selector+' needs a specific explanation');
 assert.ok(!/[\u200b-\u200f\uFEFF<>]/u.test(explanation),selector+' hidden characters');
 const row={explanation};
 if(category!=='nouns'){
  assert.ok(sentence&&translation&&surface&&reading,selector+' needs a usage example');assert.ok(sentence.includes(surface),selector+' missing surface');assert.match(sentence,/[。？！][」』]?$/u);
  row.usageExamples=[{kind:'usage',label:'用法案例',sentence,translation,surface,reading}];
 }
 output[w.id]=row;
}
assert.equal(seen.size,words.length,level+' '+category+' incomplete: '+seen.size+'/'+words.length);
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');console.log(level+' '+category+': '+seen.size+' editorial notes imported');
