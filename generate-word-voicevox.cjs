/* Local word recordings. Preserve dictionary accent when its reading matches;
 * use the verified kana when a written homograph has a different reading. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {collectWords}=require('./word-speech-plan.cjs');
const {settings,hash}=require('./vocabulary-speech-plan.cjs');
const root=__dirname,plan=collectWords(),base=process.env.VOICEVOX_URL||'http://127.0.0.1:50022';
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname));
const python=process.env.VOICEVOX_PYTHON;assert.ok(python,'Set VOICEVOX_PYTHON with lameenc installed');
const cache=process.env.VOICEVOX_WORD_CACHE||path.join(require('node:os').tmpdir(),'japanword-word-cache');fs.mkdirSync(cache,{recursive:true});
const output=path.join(root,'audio/words');fs.mkdirSync(output,{recursive:true});
const encoder=spawn(python,['-u',path.join(root,'encode-example-mp3.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
const pending=new Map();let sequence=0,buffer='',encoderError='';
encoder.stderr.on('data',b=>encoderError+=b);encoder.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;const result=JSON.parse(line),job=pending.get(result.id);pending.delete(result.id);if(job){if(result.ok)job.resolve();else job.reject(Error(result.error));}}});
encoder.on('error',e=>{for(const job of pending.values())job.reject(e);pending.clear();});encoder.on('close',code=>{if(code||pending.size){for(const job of pending.values())job.reject(Error('Encoder stopped '+encoderError));pending.clear();}});
const encode=(wav,target)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});encoder.stdin.write(JSON.stringify({id,wav:wav.toString('base64'),target})+'\n');});
async function request(endpoint,options={}){for(let i=0;i<3;i++)try{const r=await fetch(base+endpoint,{...options,signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('VOICEVOX HTTP '+r.status);return r;}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,500));}}
async function query(text){return(await request('/audio_query?speaker='+settings.speaker+'&text='+encodeURIComponent(text),{method:'POST'})).json();}
const phonemes=q=>q.accent_phrases.flatMap(p=>p.moras).map(m=>(m.consonant||'')+':'+m.vowel.toLowerCase()).join('|');
function statistics(w){let data,rate,channels,bits;assert.equal(w.toString('ascii',0,4),'RIFF');for(let i=12;i+8<=w.length;){const n=w.toString('ascii',i,i+4),len=w.readUInt32LE(i+4);assert.ok(i+8+len<=w.length);if(n==='fmt '){rate=w.readUInt32LE(i+12);channels=w.readUInt16LE(i+10);bits=w.readUInt16LE(i+22);}if(n==='data')data=w.subarray(i+8,i+8+len);i+=8+len+(len%2);}assert.ok(data);assert.equal(rate,24000);assert.equal(channels,1);assert.equal(bits,16);let energy=0,clipped=0;for(let i=0;i<data.length;i+=2){const v=data.readInt16LE(i);energy+=v*v;if(Math.abs(v)>=32760)clipped++;}const seconds=data.length/48000,rms=Math.sqrt(energy/(data.length/2)),clippingRatio=clipped/(data.length/2);assert.ok(seconds>.15&&seconds<60);assert.ok(rms>50&&clippingRatio<.005);return{seconds:Number(seconds.toFixed(4)),rms:Math.round(rms),clippingRatio:Number(clippingRatio.toFixed(7))};}
const records=new Map();
async function generate(clip){const file='audio/words/'+clip.id+'.mp3',target=path.join(root,file),metadata=path.join(cache,clip.id+'.json');
 if(fs.existsSync(metadata)&&fs.existsSync(target)){const r=JSON.parse(fs.readFileSync(metadata,'utf8'));if(r.sha256===hash(fs.readFileSync(target))){records.set(clip.id,r);return;}}
 const reference=await query(clip.reading+'。');let q=reference,selectedInput=clip.reading+'。',readingMode='verified-kana';
 if(clip.kind==='sentence'){q=await query(clip.word);selectedInput=clip.word;readingMode='sentence';}
 else if(clip.word!==clip.reading){const written=await query(clip.word+'。');if(phonemes(written)===phonemes(reference)){q=written;selectedInput=clip.word+'。';readingMode='written-dictionary-accent';}}
 if(clip.kind==='word')assert.equal(phonemes(q),phonemes(reference),'Pronunciation mismatch '+clip.word);
 for(const key of ['speedScale','pitchScale','intonationScale','volumeScale','pauseLengthScale','prePhonemeLength','postPhonemeLength','outputSamplingRate','outputStereo'])q[key]=settings[key];
 const wav=Buffer.from(await(await request('/synthesis?speaker='+settings.speaker+'&enable_interrogative_upspeak=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)})).arrayBuffer());
 const stats=statistics(wav);await encode(wav,target);const bytes=fs.readFileSync(target);assert.ok(bytes.length>1000);
 const record={id:clip.id,kind:clip.kind,word:clip.word,reading:clip.reading,input:selectedInput,readingMode,kana:q.kana,phonemes:phonemes(q),referencePhonemes:phonemes(reference),file,sha256:hash(bytes),bytes:bytes.length,...stats};records.set(clip.id,record);fs.writeFileSync(metadata,JSON.stringify(record));
}
(async()=>{assert.equal(await(await request('/version')).json(),settings.engineVersion);const speakers=await(await request('/speakers')).json();assert.ok(speakers.find(s=>s.name===settings.speakerName)?.styles.some(s=>s.id===settings.speaker&&s.name===settings.speakerStyle));
 for(const level of ['n5','n4','n3','n2','gitaigo']){const clips=plan.clips.filter(c=>c.firstLevel===level);let cursor=0,done=0;console.log(level+' START '+clips.length+' distinct words/extra clips');const timer=setInterval(()=>console.log(level+' '+done+'/'+clips.length),20000);try{await Promise.all(Array.from({length:4},async()=>{while(cursor<clips.length){await generate(clips[cursor++]);done++;if(done%250===0)console.log(level+' '+done+'/'+clips.length);}}));}finally{clearInterval(timer);}console.log(level+' COMPLETE');}
 const url=id=>{const r=records.get(id);assert.ok(r);return r.file+'?v='+r.sha256.slice(0,12);};
 const data={provider:'VOICEVOX',credit:'VOICEVOX:四国めたん',levels:Object.fromEntries(Object.entries(plan.banks).map(([l,b])=>[l,Object.fromEntries(Object.entries(b).map(([id,clip])=>[id,url(clip)]))])),retired:Object.fromEntries(Object.entries(plan.retired).map(([id,c])=>[id,url(c)])),gitaigo:Object.fromEntries(Object.entries(plan.gitaigo).map(([id,c])=>[id,{word:url(c.word),example:url(c.example)}]))};
 fs.writeFileSync(path.join(root,'word-audio.js'),'/* Generated local VOICEVOX word recordings. */\nwindow.JP_WORD_AUDIO = '+JSON.stringify(data,null,2)+';\n');
 fs.writeFileSync(path.join(root,'speech/word-plan.json'),JSON.stringify(plan,null,2)+'\n');
 fs.writeFileSync(path.join(root,'speech/word-audio-audit.json'),JSON.stringify({status:'complete',generatedAt:new Date().toISOString(),settings,sourceHashes:plan.sources,credit:data.credit,records:plan.clips.map(c=>records.get(c.id))},null,2)+'\n');
 console.log('COMPLETE: '+Object.values(plan.banks).reduce((n,b)=>n+Object.keys(b).length,0)+' graded words, '+Object.keys(plan.retired).length+' retired favorites, 100 gitaigo words/examples; '+records.size+' MP3 files.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>encoder.stdin.end());
