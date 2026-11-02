const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
// Publish authored examples by stable vocabulary ID, independently of dictionary rebuilds.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const level = process.argv.find(a=>/^n[12345]$/.test(a)) || 'n5';
const root=PROJECT_ROOT;
const context = {window:{JP_VOCABULARY:{}}};
vm.runInNewContext(fs.readFileSync(resolveFile(level+'-data.js'),'utf8'),context);
const banks = context.window.JP_VOCABULARY[level];
const words = Object.values(banks).flat();
const examples = {};
const errors = [];
const sentences = new Set();
const authoredPath = resolveFile('vocabulary-examples',level+'.txt');
const lines = fs.existsSync(authoredPath) ? fs.readFileSync(authoredPath,'utf8').split(/\r?\n/) : [];
lines.forEach((line,index)=>{
  if(!line.trim() || line.startsWith('#')) return;
  const [targets,sentence,translation,note,...extra] = line.split('|');
  if(!targets || !sentence || !translation || extra.length || !/[。？！][」』]?$/.test(sentence) || !/[\u3400-\u9fff]/u.test(translation)) {
    errors.push(`Line ${index+1}: incomplete example`); return;
  }
  sentences.add(sentence);
  for(const target of targets.split(',')){
    const [selector, surfaceSpec] = target.split('=');
    const [surfaceOverride,surfaceReading] = (surfaceSpec||'').split('~');
    const [word,reading] = selector.split('@');
    const matches = words.filter(w=>w.word===word && (!reading || w.reading===reading));
    if(matches.length!==1){errors.push(`Line ${index+1}: ambiguous or unknown target ${selector}`);continue;}
    const item = matches[0];
    const surface = surfaceOverride || word;
    if(!surface || !sentence.includes(surface)) {errors.push(`Line ${index+1}: missing surface ${target}`);continue;}
    if(examples[item.id]){errors.push(`Line ${index+1}: duplicate target ${selector}`);continue;}
    examples[item.id] = {sentence,translation,surface,...(surfaceReading?{reading:surfaceReading}:{}),...(note?{note}:{})};
  }
});
// A pinned, attributed selection is reviewed separately from its live source corpus.
const corpusPath = resolveFile('vocabulary-examples',level+'-corpus.json');
if(fs.existsSync(corpusPath)){
  const corpus = JSON.parse(fs.readFileSync(corpusPath,'utf8'));
  for(const [id, example] of Object.entries(corpus)){
    if(examples[id]) continue; // Authored corrections always take precedence.
    const word = words.find(w=>w.id===id);
    if(!word){errors.push('Unknown corpus vocabulary ID: '+id);continue;}
    if(!example.sentence?.includes(example.surface) || !example.translation || !example.evidence || !/^\d+$/.test(example.source?.jaId) || !/^\d+$/.test(example.source?.zhId) || (example.source?.pivotId && !/^\d+$/.test(example.source.pivotId)) || example.source.license!=='CC BY 2.0 FR') {
      errors.push('Incomplete corpus example: '+id);continue;
    }
    if(example.evidence.reading !== word.reading){errors.push('Corpus reading mismatch: '+id);continue;}
    examples[id] = example;
    sentences.add(example.sentence);
  }
}
const {examplesFor}=require('./build-verb-examples.cjs');
for(const word of banks.verbs){
  if(!examples[word.id])continue;
  const common={kind:'common',label:'常用用法',...examples[word.id]};
  examples[word.id].variants=[...examplesFor(word),common];
  for(const item of examples[word.id].variants)sentences.add(item.sentence);
  if(new Set(examples[word.id].variants.map(item=>item.sentence)).size!==3)errors.push('Repeated verb variant sentence: '+word.id);
}
const missing = Object.fromEntries(Object.entries(banks).map(([category,bank])=>[category,bank.filter(w=>!examples[w.id]).map(w=>w.word+'@'+w.reading)]));
if(process.argv.includes('--audit')){
  console.log(JSON.stringify({errors,covered:Object.keys(examples).length,sentences:sentences.size,missing},null,2));
}else{
  if(errors.length)throw Error(errors.join('\n'));
  if(Object.values(missing).some(bank=>bank.length))throw Error('Missing examples: '+JSON.stringify(missing));
  const output = '/* Project-authored examples. Rebuild with node build-vocabulary-examples.cjs '+level+'. */\nwindow.JP_VOCABULARY_EXAMPLES = window.JP_VOCABULARY_EXAMPLES || {};\nwindow.JP_VOCABULARY_EXAMPLES.'+level+' = '+JSON.stringify(examples,null,2)+';\n';
  const target = resolveFile(level+'-examples.js');
  if(process.argv.includes('--check')){
    if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output)throw Error('Published examples are stale: '+target);
  }else fs.writeFileSync(target,output);
  console.log(`${level}: ${Object.keys(examples).length} entries covered by ${sentences.size} contextual examples.`);
}
