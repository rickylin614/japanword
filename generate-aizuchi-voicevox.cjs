/* Local-only VOICEVOX generation. Engine/models stay outside the repository. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=__dirname;
const base=process.env.VOICEVOX_URL||'http://127.0.0.1:50021';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname),'Use a local VOICEVOX engine');
execFileSync(process.execPath,[path.join(root,'build-aizuchi-speech-plan.cjs'),'--check'],{stdio:'inherit'});
const plan=JSON.parse(fs.readFileSync(path.join(root,'speech/aizuchi-plan.json'),'utf8'));
const out=path.join(root,'audio/aizuchi');fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function shape(wav,q,e){
 const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'japanword-prosody-'));
 const wavFile=path.join(tmp,'voice.wav'),configFile=path.join(tmp,'query.json');
 try{
  fs.writeFileSync(wavFile,wav);fs.writeFileSync(configFile,JSON.stringify({query:q,contour:e.contour,rank:e.rank}));
  const result=JSON.parse(execFileSync(process.env.VOICEVOX_PYTHON||'python',[path.join(root,'shape-aizuchi-prosody.py'),wavFile,configFile],{encoding:'utf8',timeout:120000}));
  return{wav:fs.readFileSync(wavFile),acoustic:result};
 }finally{fs.rmSync(wavFile,{force:true});fs.rmSync(configFile,{force:true});fs.rmdirSync(tmp);}
}
const empathy=new Set([16,23,24,26,41,44,45,46,60,75,76,77,78,85,92,96]);
const bright=new Set([6,11,12,19,20,21,22,32,33,34,42,43,57,58,79,80,81,82,83,84]);
const hesitant=new Set([68,69,70,71,72,97,98,99,100]);
async function json(endpoint,method='GET',body){const r=await fetch(base+endpoint,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(endpoint+' HTTP '+r.status);return r.json();}
function tune(q,e){
 const n=e.rank;
 Object.assign(q,{speedScale:empathy.has(n)?.93:hesitant.has(n)?.94:bright.has(n)?1.03:1,
  pitchScale:empathy.has(n)?-.025:bright.has(n)?.015:0,
  intonationScale:empathy.has(n)?.9:bright.has(n)?1.12:1,
  volumeScale:1,prePhonemeLength:.12,postPhonemeLength:.22,outputSamplingRate:24000,outputStereo:false});
 const phrases=q.accent_phrases;
 for(const p of phrases){p.is_interrogative=false;if(p.pause_mora)p.pause_mora.vowel_length=[9,47,49].includes(n)?.09:.18;}
 if([9,47,49,94,95,96,100].includes(n))for(const phrase of phrases){
  if(!phrase.pause_mora)continue;
  const voiced=phrase.moras.findLast(m=>m.pitch>0);
  if(voiced)voiced.vowel_length=Math.max(voiced.vowel_length,.2);
 }
 const phrase=phrases.at(-1);
 const ix=phrase.moras.findLastIndex(m=>m.pitch>0);
 assert.ok(ix>=0,e.id+' has no voiced mora');
 const last=phrase.moras[ix];
 // Keep the original mora sequence. Repeating the final vowel as a new mora can
 // destabilize very short interjections such as 「ああ」. Continuous terminal
 // contours are applied to measured voiced frames after synthesis instead.
 last.vowel_length=Math.max(last.vowel_length,n===97?.48:[6,28,31,98].includes(n)?.28:.2);
 if(n===28){phrase.moras[0].vowel_length=.22;last.vowel_length=.3;}
 if([1,2,9,27].includes(n)){q.speedScale=1.08;q.postPhonemeLength=.16;}
 if(n===27)last.vowel_length=.1;
 return q;
}
function pcm(w){assert.equal(w.toString('ascii',0,4),'RIFF');assert.equal(w.toString('ascii',8,12),'WAVE');let fmt,data;for(let i=12;i+8<=w.length;){const id=w.toString('ascii',i,i+4),size=w.readUInt32LE(i+4);assert.ok(i+8+size<=w.length);if(id==='fmt ')fmt=w.subarray(i+8,i+8+size);if(id==='data')data=w.subarray(i+8,i+8+size);i+=8+size+(size%2);}assert.ok(fmt&&data);assert.equal(fmt.readUInt16LE(0),1);assert.equal(fmt.readUInt16LE(2),1);assert.equal(fmt.readUInt32LE(4),24000);assert.equal(fmt.readUInt16LE(14),16);return data;}
function wave(data){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);}
function stats(w){const p=pcm(w);let energy=0,clipped=0;for(let i=0;i<p.length;i+=2){const v=p.readInt16LE(i);energy+=v*v;if(Math.abs(v)>=32760)clipped++;}const duration=p.length/48000,rms=Math.sqrt(energy/(p.length/2));assert.ok(duration>.15&&duration<30,'Unexpected audio duration');assert.ok(rms>50,'Silent audio');assert.ok(clipped/(p.length/2)<.005,'Clipped audio');return{seconds:Number(duration.toFixed(3)),rms:Math.round(rms),sha256:hash(w),bytes:w.length};}
async function synth(input,speaker,e){let q=await json('/audio_query?speaker='+speaker+'&text='+encodeURIComponent(input),'POST');
 if(e)q=tune(q,e);else Object.assign(q,{speedScale:1,outputSamplingRate:24000,outputStereo:false,prePhonemeLength:.1,postPhonemeLength:.1});
 const r=await fetch(base+'/synthesis?speaker='+speaker+'&enable_interrogative_upspeak='+(!e),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Synthesis HTTP '+r.status);let wav=Buffer.from(await r.arrayBuffer());let acoustic=null;
 if(e){const shaped=shape(wav,q,e);wav=shaped.wav;acoustic=shaped.acoustic;}
 stats(wav);return{wav,query:q,acoustic};}
(async()=>{
 const version=await json('/version');const speakers=await json('/speakers');
 const speakerId=name=>{const s=speakers.find(s=>s.name===name);assert.ok(s,'Missing voice '+name);const normal=s.styles.find(s=>s.name==='ノーマル');assert.ok(normal);return normal.id;};
 const bId=speakerId('四国めたん'),aId=speakerId('青山龍星');
 const preview=process.argv.includes('--preview');const previewIds=new Set([1,6,8,11,23,28,61,97,100]);
 const selected=plan.entries.filter(e=>!preview||previewIds.has(e.rank));
 const records=[];
 for(const e of selected){
  const wordInput=e.rank===9?'うん、うん。':e.rank===47?'わかる、わかる。':e.rank===49?'ある、ある。':e.input;
  const word=await synth(wordInput,bId,e);
  const match=e.context.match(/^A：(.+?)\s+B：(.+)$/u);assert.ok(match,e.id+' dialogue parsing');
  const a=await synth(match[1],aId);
  const bInput=match[2];
  const same=bInput.replace(/[。？?…、\s]/gu,'')===e.input.replace(/[。？?…、\s]/gu,'');
  // Full replies 72/97/100 continue beyond the headword: close agreement/thought naturally;
  // #100 ends with an actual question, unlike the unfinished standalone 「でも…」.
  const dialogueReview={...e,contour:e.rank===100?'輕尾升 ↗':[72,97].includes(e.rank)?'緩降 ↘':e.contour};
  const b=same?word:await synth(bInput,bId,dialogueReview);
  const gap=Buffer.alloc(Math.round(24000*.32)*2);
  const dialogue=wave(Buffer.concat([pcm(a.wav),gap,pcm(b.wav)]));
  const stem=String(e.rank).padStart(3,'0');
  fs.writeFileSync(path.join(out,stem+'-word.wav'),word.wav);fs.writeFileSync(path.join(out,stem+'-dialogue.wav'),dialogue);
  records.push({id:e.id,rank:e.rank,contour:e.contour,intent:e.intent,wordInput,dialogueInput:{a:match[1],b:bInput},
   word:{file:'audio/aizuchi/'+stem+'-word.wav',...stats(word.wav)},dialogue:{file:'audio/aizuchi/'+stem+'-dialogue.wav',...stats(dialogue)},dialogueSegments:{aSeconds:pcm(a.wav).length/48000,pauseSeconds:.32,bSeconds:pcm(b.wav).length/48000},acoustic:{word:word.acoustic,b:b.acoustic},queries:{word:word.query,a:a.query,b:b.query}});
  console.log(e.id+' '+e.expression+' '+e.contour+' '+records.at(-1).word.seconds+'s');
 }
 const audit={provider:'VOICEVOX',engineVersion:version,generatedAt:new Date().toISOString(),
  sourcePlanSha256:hash(fs.readFileSync(path.join(root,'speech/aizuchi-plan.json'),'utf8').replace(/\r\n/g,'\n')),
  voices:{a:{name:'青山龍星',style:'ノーマル',id:aId},b:{name:'四国めたん',style:'ノーマル',id:bId}},
  credit:'VOICEVOX:四国めたん／VOICEVOX:青山龍星',license:'https://www.zunko.jp/con_ongen_kiyaku.html',
  aVoiceLicense:'https://www.virvoxproject.com/voicevoxの利用規約',
  renderer:{generatorSha256:hash(fs.readFileSync(__filename,'utf8').replace(/\r\n/g,'\n')),shaperSha256:hash(fs.readFileSync(path.join(root,'shape-aizuchi-prosody.py'),'utf8').replace(/\r\n/g,'\n'))},
  validation:'Rendered final-vowel pitch measured with WORLD Harvest/StoneMask; all contours must pass before publication. WAV structure, duration, non-silence and clipping checked. Pitch does not certify emotion or native-speaker naturalness.',records};
 fs.writeFileSync(path.join(root,'speech',preview?'voicevox-preview.json':'voicevox-audit.json'),JSON.stringify(audit,null,2)+'\n');
 if(!preview){assert.equal(records.length,100);const publicData={provider:'VOICEVOX',credit:audit.credit,entries:Object.fromEntries(records.map(r=>[r.id,{word:r.word.file+'?v='+r.word.sha256.slice(0,12),example:r.dialogue.file+'?v='+r.dialogue.sha256.slice(0,12),contour:r.contour,intent:r.intent}]))};
  fs.writeFileSync(path.join(root,'aizuchi-audio.js'),'/* Generated local VOICEVOX audio. See speech/voicevox-audit.json. */\nwindow.JP_AIZUCHI_AUDIO = '+JSON.stringify(publicData,null,2)+';\n');}
 console.log(`Generated ${records.length} phrases and ${records.length} dialogues locally.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
