const {ROOT_DIR,resolveFile}=require('../lib/paths.cjs');
// Native speech only. No WORLD, carrier vowels, manual mora pitch or upspeak.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {useAlternateModel}=require('./aizuchi-model-routing.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const text=f=>fs.readFileSync(resolveFile(f),'utf8').replace(/\r\n/g,'\n');
const voicevox=process.env.VOICEVOX_URL||'http://127.0.0.1:50022';
const aivis=process.env.AIVISSPEECH_URL||'http://127.0.0.1:10102';
for(const base of [voicevox,aivis])assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname),'Local engines only');
async function json(base,endpoint,method='GET',body){const r=await fetch(base+endpoint,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(endpoint+' HTTP '+r.status);return r.json();}
function pcm(w){assert.equal(w.toString('ascii',0,4),'RIFF');assert.equal(w.toString('ascii',8,12),'WAVE');let fmt,data;for(let i=12;i+8<=w.length;){const id=w.toString('ascii',i,i+4),size=w.readUInt32LE(i+4);assert.ok(i+8+size<=w.length);if(id==='fmt ')fmt=w.subarray(i+8,i+8+size);if(id==='data')data=w.subarray(i+8,i+8+size);i+=8+size+(size%2);}assert.ok(fmt&&data);assert.equal(fmt.readUInt16LE(0),1);assert.equal(fmt.readUInt16LE(2),1);assert.equal(fmt.readUInt32LE(4),24000);assert.equal(fmt.readUInt16LE(14),16);return data;}
function wave(data){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);}
function stats(w){const p=pcm(w);let energy=0,clipped=0;for(let i=0;i<p.length;i+=2){const v=p.readInt16LE(i);energy+=v*v;if(Math.abs(v)>=32760)clipped++;}const seconds=p.length/48000,rms=Math.sqrt(energy/(p.length/2));assert.ok(seconds>.15&&seconds<30);assert.ok(rms>50&&clipped/(p.length/2)<.005);return{seconds:Number(seconds.toFixed(3)),rms:Math.round(rms),sha256:hash(w),bytes:w.length};}
async function synth(input,voice){
 const q=await json(voice.base,'/audio_query?speaker='+voice.id+'&text='+encodeURIComponent(input),'POST');
 // Preserve engine-native intonation and phonemes, including normal questions.
 Object.assign(q,{speedScale:1,volumeScale:voice.provider==='AivisSpeech'?.45:1,outputSamplingRate:24000,outputStereo:false});
 const r=await fetch(voice.base+'/synthesis?speaker='+voice.id+'&enable_interrogative_upspeak=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(await r.text());
 const wav=Buffer.from(await r.arrayBuffer());stats(wav);
 return{wav,query:q,acoustic:{method:'Native model waveform; no manual pitch contour',segments:[]},rendering:{mode:'native',provider:voice.provider,model:voice.model,name:voice.name,style:voice.style,postSynthesisPitchShift:false,manualMoraPitch:false,interrogativeUpspeak:false,synthesisInput:input}};
}
(async()=>{
 execFileSync(process.execPath,[resolveFile('build-aizuchi-speech-plan.cjs'),'--check'],{stdio:'inherit'});
 const plan=JSON.parse(text('speech/aizuchi-plan.json'));
 assert.ok(plan.entries.every(e=>e.contour==='自然回應'),'Manual contour remains in plan');
 const vvVersion=await json(voicevox,'/version'),avVersion=await json(aivis,'/version');
 const vvSpeakers=await json(voicevox,'/speakers'),avSpeakers=await json(aivis,'/speakers');
 function voice(speakers,name,base,provider,model){const s=speakers.find(s=>s.name===name);assert.ok(s,name);const normal=s.styles.find(s=>s.name==='ノーマル');assert.ok(normal);return{base,provider,model,name,style:normal.name,id:normal.id,speakerUuid:s.speaker_uuid,version:s.version};}
 const aVoice=voice(vvSpeakers,'青山龍星',voicevox,'VOICEVOX','VOICEVOX 0.26.0');
 const bVoice=voice(vvSpeakers,'四国めたん',voicevox,'VOICEVOX','VOICEVOX 0.26.0');
 const alternate=voice(avSpeakers,'まお',aivis,'AivisSpeech','Style-Bert-VITS2 (JP-Extra)');
 const previous=JSON.parse(text('speech/voicevox-audit.json'));
 const rankArg=process.argv.find(a=>a.startsWith('--ranks='));const ranks=rankArg?new Set(rankArg.slice(8).split(',').map(Number)):null;
 if(ranks)assert.ok([...ranks].every(n=>Number.isInteger(n)&&n>=1&&n<=100));
 const renderer={generatorSha256:hash(text('generate-aizuchi-voicevox.cjs')),routingSha256:hash(fs.readFileSync(path.join(__dirname,'aizuchi-model-routing.cjs'),'utf8').replace(/\r\n/g,'\n')),mode:'native-only',manualPitchProcessing:false};
 const selected=plan.entries.filter(e=>!ranks||ranks.has(e.rank)),records=[],pending=[];
 for(const e of selected){
  const match=e.context.match(/^A：(.+?)\s+B：(.+)$/u);assert.ok(match);const bInput=match[2];
  const bSelected=useAlternateModel(e,bInput)?alternate:bVoice;
  const wordInput=e.input;
  const word=await synth(wordInput,bSelected);
  const same=bInput.replace(/[。？?…、\s]/gu,'')===e.input.replace(/[。？?…、\s]/gu,'');
  const b=same?word:await synth(bInput,bSelected);
  const old=previous.records.find(r=>r.id===e.id);assert.equal(old.dialogueInput.a,match[1]);
  const oldData=pcm(fs.readFileSync(resolveFile(old.dialogue.file))),aData=oldData.subarray(0,Math.round(old.dialogueSegments.aSeconds*24000)*2);
  const dialogue=wave(Buffer.concat([aData,Buffer.alloc(Math.round(24000*.32)*2),pcm(b.wav)]));
  const stem=String(e.rank).padStart(3,'0'),wordFile='audio/aizuchi/'+stem+'-word.wav',dialogueFile='audio/aizuchi/'+stem+'-dialogue.wav';
  pending.push([wordFile,word.wav],[dialogueFile,dialogue]);
  records.push({id:e.id,rank:e.rank,contour:e.contour,intent:e.intent,wordInput,dialogueInput:{a:match[1],b:bInput},word:{file:wordFile,...stats(word.wav)},dialogue:{file:dialogueFile,...stats(dialogue)},dialogueSegments:{aSeconds:aData.length/48000,pauseSeconds:.32,bSeconds:pcm(b.wav).length/48000},preservedASha256:hash(aData),providers:{a:aVoice.provider,b:bSelected.provider},voiceB:{provider:bSelected.provider,model:bSelected.model,name:bSelected.name,style:bSelected.style,id:bSelected.id,version:bSelected.version},acoustic:{word:word.acoustic,b:b.acoustic},queries:{word:word.query,a:old.queries.a,b:b.query},rendering:{word:word.rendering,b:b.rendering},renderer,generatedAt:new Date().toISOString()});
  console.log(e.rank+' '+e.expression+' '+bSelected.provider+' '+bSelected.name);
 }
 if(ranks)for(const old of previous.records)if(!ranks.has(old.rank))records.push(old);
 records.sort((a,b)=>a.rank-b.rank);assert.equal(records.length,100);
 const metadata=JSON.parse(text('speech/aivisspeech-model.json'));assert.equal(metadata.name,alternate.name);assert.equal(metadata.speakerUuid,alternate.speakerUuid);
 const credit='VOICEVOX:四国めたん／VOICEVOX:青山龍星／AivisSpeech:まお';
 const clean=v=>{const {base,...rest}=v;return rest;};
 const audit={provider:'VOICEVOX + AivisSpeech',engineVersion:vvVersion,engines:{VOICEVOX:vvVersion,AivisSpeech:avVersion},generatedAt:new Date().toISOString(),sourcePlanSha256:hash(text('speech/aizuchi-plan.json')),voices:{a:clean(aVoice),b:clean(bVoice),alternate:clean(alternate)},alternateModel:metadata,credit,renderer,validation:'All responses use native model intonation. No manual rise/fall, flat contour, carrier crop, WORLD or added interrogative upspeak. A PCM preserved; format, duration, RMS and clipping checked. Signal checks do not certify subjective naturalness.',records};
 const publicData={provider:audit.provider,credit,entries:Object.fromEntries(records.map(r=>[r.id,{word:r.word.file+'?v='+r.word.sha256.slice(0,12),example:r.dialogue.file+'?v='+r.dialogue.sha256.slice(0,12),intent:r.intent,provider:r.providers.b,voice:r.voiceB.name}]))};
 for(const [file,bytes]of pending)fs.writeFileSync(resolveFile(file),bytes);
 fs.writeFileSync(resolveFile('speech/voicevox-audit.json'),JSON.stringify(audit,null,2)+'\n');
 fs.writeFileSync(resolveFile('aizuchi-audio.js'),'/* Native VOICEVOX / AivisSpeech recordings. See data/speech/voicevox-audit.json. */\nwindow.JP_AIZUCHI_AUDIO = '+JSON.stringify(publicData,null,2)+';\n');
 console.log('Generated '+selected.length+' native responses; alternate model ranks: '+records.filter(r=>r.providers.b==='AivisSpeech').map(r=>r.rank).join(','));
})().catch(e=>{console.error(e);process.exitCode=1;});
