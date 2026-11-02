/* Generate all N5→N2 vocabulary AND grammar example recordings locally. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {collect,hash,settings}=require('./vocabulary-speech-plan.cjs');
const root=__dirname,levels=['n5','n4','n3','n2'];
const base=process.env.VOICEVOX_URL||'http://127.0.0.1:50021';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Local engine only');
const ffmpeg=process.env.VOICEVOX_FFMPEG,python=process.env.VOICEVOX_PYTHON;
assert.ok(python||(ffmpeg&&fs.existsSync(ffmpeg)),'Set VOICEVOX_PYTHON (lameenc) or VOICEVOX_FFMPEG');
let encoder=null,sequence=0;const pending=new Map();
if(python){
 encoder=spawn(python,['-u',path.join(root,'encode-example-mp3.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
 let buffer='',error='';encoder.stderr.on('data',b=>error+=b);
 encoder.stdout.on('data',b=>{buffer+=b;let split;while((split=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,split);buffer=buffer.slice(split+1);if(!line.trim())continue;const result=JSON.parse(line);const job=pending.get(result.id);pending.delete(result.id);if(job){if(result.ok)job.resolve();else job.reject(Error(result.error));}}});
 encoder.on('error',e=>{for(const job of pending.values())job.reject(e);pending.clear();});
 encoder.on('close',code=>{if(code||pending.size){for(const job of pending.values())job.reject(Error('Encoder stopped: '+error));pending.clear();}});
}
const cache=process.env.VOICEVOX_CACHE||path.join(require('node:os').tmpdir(),'japanword-example-cache');fs.mkdirSync(cache,{recursive:true});
const plan=collect();
fs.writeFileSync(path.join(root,'speech/vocabulary-plan.json'),JSON.stringify(plan,null,2)+'\n');
const records=new Map();let rendered=0,reused=0;
async function request(endpoint,options={}){
 for(let i=0;i<3;i++)try{const r=await fetch(base+endpoint,{...options,signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('VOICEVOX '+r.status+' '+endpoint.slice(0,70));return r;}
 catch(e){if(i===2)throw e;await new Promise(resolve=>setTimeout(resolve,500*(i+1)));}
}
function wavStats(w){
 assert.equal(w.toString('ascii',0,4),'RIFF');assert.equal(w.toString('ascii',8,12),'WAVE');let data,rate,channels,bits;
 for(let i=12;i+8<=w.length;){const id=w.toString('ascii',i,i+4),size=w.readUInt32LE(i+4);assert.ok(i+8+size<=w.length);if(id==='fmt '){assert.equal(w.readUInt16LE(i+8),1);channels=w.readUInt16LE(i+10);rate=w.readUInt32LE(i+12);bits=w.readUInt16LE(i+22);}if(id==='data')data=w.subarray(i+8,i+8+size);i+=8+size+(size%2);}
 assert.ok(data);assert.equal(rate,24000);assert.equal(channels,1);assert.equal(bits,16);let energy=0,clipped=0;
 for(let i=0;i<data.length;i+=2){const v=data.readInt16LE(i);energy+=v*v;if(Math.abs(v)>=32760)clipped++;}
 const seconds=data.length/48000,rms=Math.sqrt(energy/(data.length/2)),clippingRatio=clipped/(data.length/2);
 assert.ok(seconds>.15&&seconds<60,'Invalid duration');assert.ok(rms>50,'Silent audio');assert.ok(clippingRatio<.005,'Clipped audio');
 return{seconds:Number(seconds.toFixed(4)),rms:Math.round(rms),clippingRatio:Number(clippingRatio.toFixed(7))};
}
function encode(wav,target){return new Promise((resolve,reject)=>{
 if(encoder){const id=++sequence;pending.set(id,{resolve,reject});encoder.stdin.write(JSON.stringify({id,wav:wav.toString('base64'),target})+'\n');return;}
 const tmp=target+'.tmp.mp3';const proc=spawn(ffmpeg,['-hide_banner','-loglevel','error','-f','wav','-i','pipe:0','-map_metadata','-1','-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','64k','-write_xing','1','-y',tmp],{windowsHide:true,stdio:['pipe','ignore','pipe']});let error='';
 proc.stderr.on('data',b=>error+=b);proc.on('error',reject);proc.stdin.on('error',()=>{});
 proc.on('close',code=>{if(code!==0){reject(Error('MP3 encoding failed '+error));return;}fs.renameSync(tmp,target);resolve();});proc.stdin.end(wav);
});}
async function generate(clip){
 const file='audio/examples/'+clip.firstLevel+'/'+clip.id+'.mp3',target=path.join(root,file),metaFile=path.join(cache,clip.id+'.json');
 if(fs.existsSync(target)&&fs.existsSync(metaFile)){
  const record=JSON.parse(fs.readFileSync(metaFile,'utf8'));const bytes=fs.readFileSync(target);
  if(record.input===clip.input&&record.sha256===hash(bytes)){records.set(clip.id,record);reused++;return;}
 }
 const query=await(await request('/audio_query?speaker='+settings.speaker+'&text='+encodeURIComponent(clip.input),{method:'POST'})).json();
 for(const key of ['speedScale','pitchScale','intonationScale','volumeScale','pauseLengthScale','prePhonemeLength','postPhonemeLength','outputSamplingRate','outputStereo'])query[key]=settings[key];
 const wav=Buffer.from(await(await request('/synthesis?speaker='+settings.speaker+'&enable_interrogative_upspeak=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)})).arrayBuffer());
 const statistics=wavStats(wav);fs.mkdirSync(path.dirname(target),{recursive:true});await encode(wav,target);
 const bytes=fs.readFileSync(target);assert.ok(bytes.length>1000,'Invalid MP3');
 const moras=query.accent_phrases.flatMap(p=>p.moras).length;
 const record={id:clip.id,input:clip.input,file,sha256:hash(bytes),bytes:bytes.length,...statistics,moras,morasPerSecond:Number((moras/statistics.seconds).toFixed(3)),kana:query.kana,querySha256:hash(JSON.stringify(query)),encoder:encoder?'lameenc 1.9.0':'ffmpeg libmp3lame'};
 fs.writeFileSync(path.join(cache,clip.id+'-query.json'),JSON.stringify(query));
 fs.writeFileSync(metaFile,JSON.stringify(record));records.set(clip.id,record);rendered++;
}
function url(id){const record=records.get(id);assert.ok(record,id);return record.file+'?v='+record.sha256.slice(0,12);}
function publishLevel(level){
 const bank=Object.fromEntries(Object.entries(plan.banks[level]).map(([id,ids])=>[id,ids.map(url)]));
 const grammar=Object.fromEntries(Object.entries(plan.grammar[level]).map(([id,ids])=>[id,ids.map(url)]));
 const questions=Object.fromEntries(Object.entries(plan.grammarQuestions[level]).map(([id,idClip])=>[id,url(idClip)]));
 const source='/* Local VOICEVOX example recordings. See speech/vocabulary-audio-audit.json. */\nwindow.JP_EXAMPLE_AUDIO = window.JP_EXAMPLE_AUDIO || {};\nwindow.JP_GRAMMAR_AUDIO = window.JP_GRAMMAR_AUDIO || {};\nwindow.JP_GRAMMAR_ANSWER_AUDIO = window.JP_GRAMMAR_ANSWER_AUDIO || {};\nwindow.JP_EXAMPLE_AUDIO.'+level+' = '+JSON.stringify(bank)+';\nwindow.JP_GRAMMAR_AUDIO.'+level+' = '+JSON.stringify(grammar)+';\nwindow.JP_GRAMMAR_ANSWER_AUDIO.'+level+' = '+JSON.stringify(questions)+';\n';
 fs.writeFileSync(path.join(root,level+'-example-audio.js'),source);
}
(async()=>{
 const version=await(await request('/version')).json();assert.equal(version,settings.engineVersion,'Engine version changed; review settings');
 const speakers=await(await request('/speakers')).json();const speaker=speakers.find(s=>s.name===settings.speakerName);assert.ok(speaker?.styles.some(s=>s.id===settings.speaker&&s.name===settings.speakerStyle));
 for(const level of levels){
  const clips=plan.clips.filter(c=>c.firstLevel===level);let cursor=0,done=0;const start=Date.now();
  console.log(level+' START '+clips.length+' new unique spoken inputs');
  const timer=setInterval(()=>console.log(level+' '+done+'/'+clips.length+' completed; '+((Date.now()-start)/1000).toFixed(0)+'s'),20000);
  try{await Promise.all(Array.from({length:Number(process.env.VOICEVOX_CONCURRENCY||2)},async()=>{while(cursor<clips.length){const clip=clips[cursor++];await generate(clip);done++;if(done%100===0)console.log(level+' '+done+'/'+clips.length);}}));}finally{clearInterval(timer);}
  publishLevel(level);console.log(level+' COMPLETE: '+Object.values(plan.banks[level]).flat().length+' vocabulary + '+Object.values(plan.grammar[level]).flat().length+' grammar examples connected.');
 }
 const audit={schemaVersion:1,status:'complete',generatedAt:new Date().toISOString(),settings,sourceHashes:plan.sources,planSha256:hash(fs.readFileSync(path.join(root,'speech/vocabulary-plan.json'),'utf8').replace(/\r\n/g,'\n')),
  credit:'VOICEVOX:四国めたん',license:'https://www.zunko.jp/con_ongen_kiyaku.html',
  paceNote:'Natural everyday conversation preset, calibrated with short/long Japanese sentences; not a measured match to a specific drama or actor.',
  levels:Object.fromEntries(levels.map(l=>[l,{vocabularyExamples:Object.values(plan.banks[l]).flat().length,grammarExamples:Object.values(plan.grammar[l]).flat().length,newClips:plan.clips.filter(c=>c.firstLevel===l).length}])),
  records:plan.clips.map(c=>records.get(c.id))};
 assert.equal(audit.records.length,plan.clips.length);assert.ok(audit.records.every(Boolean));
 fs.writeFileSync(path.join(root,'speech/vocabulary-audio-audit.json'),JSON.stringify(audit,null,2)+'\n');
 console.log('COMPLETE '+records.size+' files; '+rendered+' rendered, '+reused+' resumed; '+audit.records.reduce((n,r)=>n+r.bytes,0)+' compressed bytes.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{encoder?.stdin.end();});
