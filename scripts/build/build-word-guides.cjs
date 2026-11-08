const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {ROOT_DIR}=require('../lib/paths.cjs');
function applyWordGuides(level,words,examples){
 const file=path.join(ROOT_DIR,'data/vocabulary/guides',level+'.json');
 assert.ok(fs.existsSync(file),level+' missing editorial guides');
 const guides=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.deepEqual(Object.keys(guides).sort(),words.filter(w=>w.category!=='verbs').map(w=>w.id).sort(),level+' incomplete editorial coverage');
 for(const [id,guide]of Object.entries(guides)){
  const word=words.find(w=>w.id===id);assert.ok(word&&word.category!=='verbs',id+' unknown guide');
  assert.ok(typeof guide.explanation==='string'&&guide.explanation.length>=18,id+' missing explanation');
  assert.ok(!/[<>|\u200b-\u200f\uFEFF]/u.test(guide.explanation),id+' invalid explanation');
  assert.ok(examples[id],id+' missing common example');
  examples[id].explanation=guide.explanation;
  if(word.category==='nouns'){assert.ok(!guide.usageExamples,id+' noun has unexpected cases');continue;}
  assert.equal(guide.usageExamples?.length,1,id+' needs an additional case');
  for(const e of guide.usageExamples){
   assert.equal(e.kind,'usage');assert.ok(e.surface&&e.sentence?.includes(e.surface)&&e.reading&&e.translation,id+' incomplete case');
   assert.match(e.sentence,/[。？！][」』]?$/u);assert.ok(!/[<>|\n{}]/u.test(e.sentence+e.translation),id+' source artifacts');
   assert.notEqual(e.sentence,examples[id].sentence,id+' case repeats common example');
  }
  examples[id].usageExamples=guide.usageExamples;
 }
}
module.exports={applyWordGuides};
