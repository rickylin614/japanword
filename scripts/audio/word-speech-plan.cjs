const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {settings,hash}=require('./vocabulary-speech-plan.cjs');
const root=PROJECT_ROOT,levels=['n5','n4','n3','n2','n1'];
function collectWords(){
 const c={window:{}},sources={},clips=new Map(),banks={},retired={},gitaigo={};
 function load(file){const text=fs.readFileSync(resolveFile(file),'utf8').replace(/\r\n/g,'\n');sources[file]=hash(text);vm.runInNewContext(text,c);}
 load('vocabulary-data.js');
 function add(word,reading,level,reference,kind='word'){
  const id=hash(JSON.stringify({settings,kind,word,reading})).slice(0,24);
  if(!clips.has(id))clips.set(id,{id,kind,word,reading,firstLevel:level,refs:[]});
  clips.get(id).refs.push(reference);return id;
 }
 for(const level of levels){load(level+'-data.js');banks[level]={};for(const word of Object.values(c.window.JP_VOCABULARY[level]).flat())banks[level][word.id]=add(word.word,word.reading,level,{kind:'vocabulary',level,id:word.id});}
 for(const word of c.window.JP_RETIRED_VOCABULARY||[])retired[word.id]=add(word.word,word.reading,word.level,{kind:'retired',level:word.level,id:word.id});
 load('conversation-data.js');for(const word of c.window.JP_CONVERSATION.gitaigo)gitaigo[word.id]={word:add(word.word,word.reading,'gitaigo',{kind:'gitaigo-word',id:word.id}),example:add(word.example,word.example,'gitaigo',{kind:'gitaigo-example',id:word.id},'sentence')};
 return{schemaVersion:1,settings,sources,banks,retired,gitaigo,clips:[...clips.values()]};
}
module.exports={collectWords};
if(require.main===module){const p=collectWords();console.log(JSON.stringify({levels:Object.fromEntries(levels.map(l=>[l,Object.keys(p.banks[l]).length])),retired:Object.keys(p.retired).length,gitaigo:Object.keys(p.gitaigo).length,files:p.clips.length}));}
