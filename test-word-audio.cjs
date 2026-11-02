const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http');
const {collectWords}=require('./word-speech-plan.cjs');const {hash}=require('./vocabulary-speech-plan.cjs');
const root=__dirname,plan=collectWords(),audit=JSON.parse(fs.readFileSync(path.join(root,'speech/word-audio-audit.json'),'utf8'));
assert.equal(audit.status,'complete');assert.deepEqual(audit.settings,plan.settings);assert.deepEqual(audit.sourceHashes,plan.sources);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'speech/word-plan.json'),'utf8')),plan);
const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'word-audio.js'),'utf8'),c);
const records=new Map(audit.records.map(r=>[r.id,r]));assert.equal(records.size,plan.clips.length);
for(const clip of plan.clips){const r=records.get(clip.id);assert.equal(r.word,clip.word);assert.equal(r.reading,clip.reading);assert.match(r.file,/^audio\/words\/[a-f0-9]{24}\.mp3$/);
 const bytes=fs.readFileSync(path.join(root,r.file));assert.equal(hash(bytes),r.sha256);assert.equal(bytes.length,r.bytes);assert.ok(r.rms>50&&r.clippingRatio<.005);assert.ok(r.seconds>.15&&r.seconds<60);
 if(clip.kind==='word')assert.equal(r.phonemes,r.referencePhonemes,clip.word+' pronunciation');
}
const url=id=>{const r=records.get(id);return r.file+'?v='+r.sha256.slice(0,12);};
for(const [level,bank] of Object.entries(plan.banks))for(const [id,clip] of Object.entries(bank))assert.equal(c.window.JP_WORD_AUDIO.levels[level][id],url(clip));
for(const [id,clip] of Object.entries(plan.retired))assert.equal(c.window.JP_WORD_AUDIO.retired[id],url(clip));
for(const [id,clips] of Object.entries(plan.gitaigo))for(const part of ['word','example'])assert.equal(c.window.JP_WORD_AUDIO.gitaigo[id][part],url(clips[part]));
for(const [a,b] of [['橋','箸']]){const xs=plan.clips.filter(c=>c.word===a||c.word===b);assert.equal(xs.length,2);assert.notEqual(xs[0].id,xs[1].id,'Keep homophone lexical accents separate');}
console.log(`PASS: ${Object.values(plan.banks).reduce((n,b)=>n+Object.keys(b).length,0)} graded words, ${Object.keys(plan.retired).length} retired favorites, ${Object.keys(plan.gitaigo).length} gitaigo words/examples; ${records.size} files; readings, source snapshots, hashes and complete maps.`);
if(!process.env.PLAYWRIGHT_PATH){console.log('Set PLAYWRIGHT_PATH for all word-button and MP3 decoding checks.');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
(async()=>{const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.mp3')?'audio/mpeg':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'text/css');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.played=[];window.spoken=[];window.Audio=class{constructor(src){this.src=src;}pause(){}play(){played.push(this.src);return Promise.resolve();}};window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return[];},speak(u){spoken.push(u.text);}}});});
  let words=0,retired=0;
  for(const level of ['n5','n4','n3','n2'])for(const category of ['nouns','verbs','i_adjectives','na_adjectives','others']){
   await page.goto(base+level+'-'+category+'.html');do{const result=await page.evaluate(level=>{played=[];spoken=[];const buttons=[...document.querySelectorAll('[data-speak]')];const expected=buttons.map(b=>JP_WORD_AUDIO.levels[level][b.dataset.speak]);buttons.forEach(b=>b.click());return{actual:played,expected,spoken};},level);assert.deepEqual(result.actual,result.expected);assert.deepEqual(result.spoken,[]);words+=result.actual.length;if(await page.locator('#word-next-page').isDisabled())break;await page.locator('#word-next-page').click();}while(true);
  }
  for(const level of ['n5','n4','n3','n2']){await page.goto(base+level+'-nouns.html');await page.evaluate(level=>localStorage.setItem('jp-learning-v1',JSON.stringify({favorites:JP_RETIRED_VOCABULARY.filter(w=>w.level===level).map(w=>w.id),answers:{},sessions:{}})),level);await page.reload();const result=await page.evaluate(()=>{played=[];spoken=[];const buttons=[...document.querySelectorAll('[data-old-speak]')];const expected=buttons.map(b=>JP_WORD_AUDIO.retired[b.dataset.oldSpeak]);buttons.forEach(b=>b.click());return{actual:played,expected,spoken};});assert.deepEqual(result.actual,result.expected);assert.deepEqual(result.spoken,[]);retired+=result.actual.length;}
  assert.equal(words,5233);assert.equal(retired,370);
  await page.goto(base+'gitaigo.html');await page.selectOption('#expression-size','100');const result=await page.evaluate(()=>{played=[];spoken=[];const buttons=[...document.querySelectorAll('[data-expression]')];const expected=buttons.map(b=>JP_WORD_AUDIO.gitaigo[b.dataset.expression][b.dataset.part]);buttons.forEach(b=>b.click());return{actual:played,expected,spoken};});assert.equal(result.actual.length,200);assert.deepEqual(result.actual,result.expected);assert.deepEqual(result.spoken,[]);
  console.log('All 5,233 word-list buttons, 370 retired favorites and 200 gitaigo buttons use VOICEVOX.');
  let decoded=0;for(let start=0;start<audit.records.length;start+=250){const batch=audit.records.slice(start,start+250).map(r=>({file:r.file,seconds:r.seconds}));decoded+=await page.evaluate(async batch=>{const ctx=new AudioContext();let cursor=0,done=0;try{await Promise.all(Array.from({length:6},async()=>{while(cursor<batch.length){const item=batch[cursor++];const response=await fetch(item.file);if(!response.ok)throw Error(item.file);const audio=await ctx.decodeAudioData(await response.arrayBuffer());if(audio.numberOfChannels!==1||Math.abs(audio.duration-item.seconds)>.15)throw Error('Invalid audio '+item.file);done++;}}));}finally{await ctx.close();}return done;},batch);if(decoded%1000===0||decoded===audit.records.length)console.log('Decoded '+decoded+'/'+audit.records.length+' MP3 files.');}
  assert.equal(decoded,audit.records.length);assert.deepEqual(errors,[]);console.log('PASS: every word MP3 decoded in Chrome, all word playback routes use recordings.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
