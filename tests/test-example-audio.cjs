const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../scripts/lib/paths.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),http=require('node:http');
const {collect,hash}=require('../scripts/audio/vocabulary-speech-plan.cjs');
const root=PROJECT_ROOT,plan=collect(),levels=['n5','n4','n3','n2','n1'];
const planText=fs.readFileSync(resolveFile('speech/vocabulary-plan.json'),'utf8').replace(/\r\n/g,'\n');
assert.deepEqual(JSON.parse(planText),plan);
const audit=JSON.parse(fs.readFileSync(resolveFile('speech/vocabulary-audio-audit.json'),'utf8'));
assert.equal(audit.status,'complete');assert.deepEqual(audit.settings,plan.settings);assert.deepEqual(audit.sourceHashes,plan.sources);assert.equal(audit.planSha256,hash(planText));
assert.equal(audit.records.length,plan.clips.length);
const records=new Map(audit.records.map(r=>[r.id,r]));assert.equal(records.size,audit.records.length);
const c={window:{}};for(const level of levels)vm.runInNewContext(fs.readFileSync(resolveFile(level+'-example-audio.js'),'utf8'),c);
let bytes=0;
for(const clip of plan.clips){const r=records.get(clip.id);assert.ok(r,clip.id);assert.equal(r.input,clip.input);
 assert.match(r.file,/^audio\/examples\/n[12345]\/[a-f0-9]{24}\.mp3$/);const data=fs.readFileSync(resolveFile(r.file));assert.equal(data.length,r.bytes);assert.equal(hash(data),r.sha256);assert.ok(data.length>1000&&data.length<100*1024*1024);
 assert.ok(data.toString('ascii',0,3)==='ID3'||data[0]===255,'MP3 header');assert.ok(r.seconds>.15&&r.seconds<60);assert.ok(r.rms>50&&r.clippingRatio<.005);assert.ok(r.kana&&r.moras>0);bytes+=r.bytes;
}
const url=id=>{const r=records.get(id);return r.file+'?v='+r.sha256.slice(0,12);};
for(const l of levels){
 for(const [id,clips] of Object.entries(plan.banks[l]))assert.deepEqual(Array.from(c.window.JP_EXAMPLE_AUDIO[l][id]),clips.map(url));
 for(const [id,clips] of Object.entries(plan.grammar[l]))assert.deepEqual(Array.from(c.window.JP_GRAMMAR_AUDIO[l][id]),clips.map(url));
 for(const [id,clip] of Object.entries(plan.grammarQuestions[l]))assert.equal(c.window.JP_GRAMMAR_ANSWER_AUDIO[l][id],url(clip));
}
const inputs=plan.clips.map(c=>c.input);
assert.ok(inputs.includes('日曜日にうちにきませんか？'),'来ません pronunciation');
assert.ok(inputs.includes('子供たちは宇宙への興味をいだいて、図書館で星の本を探しています。'),'抱く=いだく');
assert.ok(inputs.includes('少女は子猫をだいて、獣医の所へ走っていきました。'),'抱く=だく');
console.log(`PASS: ${audit.records.length} MP3 files, ${Object.values(plan.banks).flatMap(b=>Object.values(b).flat()).length} vocabulary examples, ${Object.values(plan.grammar).flatMap(b=>Object.values(b).flat()).length} grammar examples; hashes, sources, readings, complete mappings, ${(bytes/1024/1024).toFixed(1)} MiB.`);
if(!process.env.PLAYWRIGHT_PATH){console.log('Set PLAYWRIGHT_PATH to check every playback button and decode every MP3 in Chrome.');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
(async()=>{
 const server=http.createServer((req,res)=>{const file=resolveFile('.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.mp3')?'audio/mpeg':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'text/css');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.played=[];window.spoken=[];window.Audio=class{constructor(src){this.src=src;}pause(){}play(){played.push(this.src);return Promise.resolve();}};window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return[];},speak(u){spoken.push(u.text);}}});});
  let vocabularyButtons=0,grammarButtons=0;
  for(const level of levels)for(const category of ['nouns','verbs','i_adjectives','na_adjectives','others']){
   await page.goto(base+level+'-'+category+'.html');
   do{
    const result=await page.evaluate(({level})=>{played=[];spoken=[];const buttons=[...document.querySelectorAll('[data-example-speak]')];const expected=buttons.map(b=>window.JP_EXAMPLE_AUDIO[level][b.dataset.exampleSpeak][Number(b.dataset.exampleIndex)]);buttons.forEach(b=>b.click());return{actual:played,expected,spoken};},{level});
    assert.deepEqual(result.actual,result.expected);assert.deepEqual(result.spoken,[]);vocabularyButtons+=result.actual.length;
    if(await page.locator('#word-next-page').isDisabled())break;await page.locator('#word-next-page').click();
   }while(true);
  }
  await page.goto(base+'grammar-overview.html');
  do{
   const result=await page.evaluate(()=>{played=[];spoken=[];const buttons=[...document.querySelectorAll('[data-guide-speak]')];const expected=buttons.map(b=>{const g=JP_GRAMMAR_GUIDE.find(g=>g.id===b.dataset.guideSpeak);return JP_GRAMMAR_AUDIO[g.level][g.id][Number(b.dataset.example)];});buttons.forEach(b=>b.click());return{actual:played,expected,spoken};});
   assert.deepEqual(result.actual,result.expected);assert.deepEqual(result.spoken,[]);grammarButtons+=result.actual.length;
   if(await page.locator('#guide-next').isDisabled())break;await page.locator('#guide-next').click();
  }while(true);
  assert.equal(vocabularyButtons,Object.values(plan.banks).flatMap(b=>Object.values(b).flat()).length);assert.equal(grammarButtons,2500);
  console.log(`All ${vocabularyButtons} vocabulary and ${grammarButtons} grammar playback buttons mapped correctly.`);
  // Decode actual compressed audio, separately from the event-spy checks above.
  const audioList=audit.records.map(r=>({url:r.file,seconds:r.seconds}));let decoded=0;
  for(let start=0;start<audioList.length;start+=250){const batch=audioList.slice(start,start+250);
   const count=await page.evaluate(async batch=>{const ctx=new AudioContext();let cursor=0,count=0;try{await Promise.all(Array.from({length:6},async()=>{while(cursor<batch.length){const item=batch[cursor++];const r=await fetch(item.url);if(!r.ok)throw Error(item.url);const decoded=await ctx.decodeAudioData(await r.arrayBuffer());if(decoded.numberOfChannels!==1||Math.abs(decoded.duration-item.seconds)>.15)throw Error('Bad MP3 '+item.url);count++;}}));}finally{await ctx.close();}return count;},batch);
   decoded+=count;if(decoded%1000===0||decoded===audioList.length)console.log('Chrome decoded '+decoded+'/'+audioList.length+' MP3 files.');
  }
  assert.equal(decoded,audit.records.length);assert.deepEqual(errors,[]);
  console.log('PASS: every published MP3 decoded and every example playback button checked in Chrome.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
