const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {forms}=require('../build/build-verbs.cjs');
const root=PROJECT_ROOT,levels=['n5','n4','n3','n2','n1'];
const settings={provider:'VOICEVOX',engineVersion:'0.26.0',speakerName:'四国めたん',speakerStyle:'ノーマル',speaker:2,
 speedScale:1.05,pitchScale:0,intonationScale:1,volumeScale:1,pauseLengthScale:.85,prePhonemeLength:.06,postPhonemeLength:.12,
 outputSamplingRate:24000,outputStereo:false,format:'mp3',bitrate:'64k',questionUpspeak:true};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(resolveFile(f),'utf8').replace(/\r\n/g,'\n');
function targetReading(word,example,base){
 if(example.reading)return example.reading;
 if(example.evidence?.reading)return example.evidence.reading;
 const surface=example.surface;
 const canonical=base.variants?.find(e=>e.kind==='dictionary');
 const lemma=canonical?.form||word.word,reading=canonical?.reading||word.reading;
 const candidates=[[lemma,reading],[word.word,word.reading]];
 if(word.category==='verbs'){
  const type=word.posCodes.find(p=>p.startsWith('v')&&!['vi','vt'].includes(p));
  const a=forms(lemma,type),b=forms(reading,type);
  a.forEach((s,i)=>candidates.push([s,b[i]]));
  // Keep inflected stems aligned, including 来る→来ません/来なかった.
  candidates.push([a[0].replace(/ます$/u,''),b[0].replace(/ます$/u,'')]);
  candidates.push([a[2].replace(/い$/u,''),b[2].replace(/い$/u,'')]);
 }
 candidates.sort((a,b)=>b[0].length-a[0].length);
 for(const [form,kana] of candidates){
  if(form===surface)return kana;
  if(form&&surface.startsWith(form)&&/^[ぁ-ゖァ-ヶー]*$/u.test(surface.slice(form.length)))return kana+surface.slice(form.length);
 }
 // Shared written/reading okurigana allow a verified lexical reading to carry
 // through inflections absent from the short conjugation table.
 let tail=0;while(tail<lemma.length&&tail<reading.length&&lemma.at(-1-tail)===reading.at(-1-tail)&&/[ぁ-ゖァ-ヶー]/u.test(lemma.at(-1-tail)))tail++;
 const stem=tail?lemma.slice(0,-tail):lemma,kanaStem=tail?reading.slice(0,-tail):reading;
 if(stem&&surface.startsWith(stem)&&/^[ぁ-ゖァ-ヶー]*$/u.test(surface.slice(stem.length)))return kanaStem+surface.slice(stem.length);
 return null;
}
function collect(){
 const c={window:{JP_VOCABULARY:{}}},clips=new Map(),banks={},grammar={},grammarQuestions={},sources={};
 const grammarSource=read('grammar-data.js');sources['grammar-data.js']=hash(grammarSource);vm.runInNewContext(grammarSource,c);
 for(const level of levels){
  for(const f of [level+'-data.js',level+'-examples.js']){const s=read(f);sources[f]=hash(s);vm.runInNewContext(s,c);}
  banks[level]={};
  for(const word of Object.values(c.window.JP_VOCABULARY[level]).flat()){
   const base=c.window.JP_VOCABULARY_EXAMPLES[level][word.id];assert.ok(base,word.id);
   banks[level][word.id]=Array.from(base.variants||[base],(e,index)=>{
    const pronunciation=targetReading(word,e,base);
    let input=e.sentence;
    if(pronunciation&&/[\u3400-\u9fff]/u.test(e.surface)){
     const pos=input.indexOf(e.surface);assert.ok(pos>=0,word.id);input=input.slice(0,pos)+pronunciation+input.slice(pos+e.surface.length);
    }
    input=input.replace(/((?:です|ます|ません|でしょう|でした|ました|なの|のです)か)。$/u,'$1？');
    const id=hash(JSON.stringify({settings,input})).slice(0,24);
    if(!clips.has(id))clips.set(id,{id,input,firstLevel:level,refs:[]});
    assert.equal(clips.get(id).input,input,'Hash collision');
    clips.get(id).refs.push({level,wordId:word.id,index,sentence:e.sentence,surface:e.surface,pronunciation});
    return id;
   });
  }
  grammar[level]={};grammarQuestions[level]={};
  for(const guide of c.window.JP_GRAMMAR_GUIDE.filter(g=>g.level===level)){
   grammar[level][guide.id]=Array.from(guide.examples,(sentence,index)=>{
    const input=sentence.replace(/((?:です|ます|ません|でしょう|でした|ました|なの|のです)か)。$/u,'$1？');
    const id=hash(JSON.stringify({settings,input})).slice(0,24);
    if(!clips.has(id))clips.set(id,{id,input,firstLevel:level,refs:[]});
    clips.get(id).refs.push({level,grammarId:guide.id,index,sentence});
    const questionId=guide.questionIds[index];
    if(questionId){const q=c.window.JP_GRAMMAR[level].find(q=>q.id===questionId);if(q&&q.sentence.replace('【　】',q.answer)===sentence)grammarQuestions[level][questionId]=id;}
    return id;
   });
  }
 }
 return{schemaVersion:1,settings,sources,banks,grammar,grammarQuestions,clips:[...clips.values()]};
}
module.exports={collect,settings,hash};
if(require.main===module){const plan=collect();if(process.argv.includes('--write'))fs.writeFileSync(resolveFile('speech/vocabulary-plan.json'),JSON.stringify(plan,null,2)+'\n');
 for(const level of levels)console.log(level+': '+Object.values(plan.banks[level]).flat().length+' vocabulary examples + '+Object.values(plan.grammar[level]).flat().length+' grammar examples; '+plan.clips.filter(c=>c.firstLevel===level).length+' new audio files');
 console.log('Total '+plan.clips.length+' unique spoken inputs; natural conversational speed '+settings.speedScale+'.');}
