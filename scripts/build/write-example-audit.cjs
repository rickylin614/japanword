const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
// Refresh counts and normalized text hashes from the published, pinned examples.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=PROJECT_ROOT,read=f=>fs.readFileSync(resolveFile(f),'utf8');
const file='vocabulary-examples/audit.json';
const report=JSON.parse(read(file));
const context={window:{JP_VOCABULARY:{}}};
report.levels={};report.files={};
for(const level of ['n5','n4','n3','n2','n1']){
  for(const name of [level+'-data.js',level+'-examples.js'])vm.runInNewContext(read(name),context);
  const banks=context.window.JP_VOCABULARY[level], examples=context.window.JP_VOCABULARY_EXAMPLES[level];
  report.levels[level]={total:Object.values(banks).flat().length,covered:Object.keys(examples).length,distinctSentences:new Set(Object.values(examples).map(e=>e.sentence)).size,categories:Object.fromEntries(Object.entries(banks).map(([c,rows])=>[c,{total:rows.length,covered:rows.filter(w=>examples[w.id]).length}])),authored:Object.values(examples).filter(e=>!e.source).length,corpus:Object.values(examples).filter(e=>e.source).length,sharedPivot:Object.values(examples).filter(e=>e.source?.pivotId).length};
  report.levels[level].verbEntries=banks.verbs.length;
  report.levels[level].verbExamples=banks.verbs.reduce((n,w)=>n+(examples[w.id].variants?.length||0),0);
  report.levels[level].distinctSentencesWithVariants=new Set(Object.values(examples).flatMap(e=>(e.variants||[e]).map(v=>v.sentence))).size;
  for(const name of [level+'-data.js',level+'-examples.js','vocabulary-examples/'+level+'.txt','vocabulary-examples/'+level+'-corpus.json','vocabulary-examples/verbs-'+level+'.txt','build-verb-examples.cjs']){
    if(fs.existsSync(resolveFile(name)))report.files[name]={sha256LF:crypto.createHash('sha256').update(read(name).replace(/\r\n/g,'\n')).digest('hex')};
  }
}
fs.writeFileSync(resolveFile(file),JSON.stringify(report,null,2)+'\n');
console.log('Example audit refreshed: '+Object.values(report.levels).reduce((n,l)=>n+l.covered,0)+' / '+Object.values(report.levels).reduce((n,l)=>n+l.total,0)+' entries.');
