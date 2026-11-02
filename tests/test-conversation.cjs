const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../scripts/lib/paths.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const {useAlternateModel}=require('../scripts/audio/aizuchi-model-routing.cjs');
for(const expression of ['へえ','へぇ','へー','ええ、わかります','えー','ああ','あぁ','あー'])assert.equal(useAlternateModel({expression}),true,expression);
assert.equal(useAlternateModel({expression:'なるほど'},'ええ、そのとおりです。'),true,'Route extended replies as a whole');
assert.equal(useAlternateModel({expression:'そうですね'}),false);
assert.equal(useAlternateModel({expression:'はい',context:'A：ああ。 B：はい。'}),false,'A scene must not select the B model');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(resolveFile('conversation-data.js'),'utf8'), context);
for (const [kind, bank] of Object.entries(context.window.JP_CONVERSATION)) {
  assert.equal(bank.length,100);
  assert.equal(new Set(bank.map(w=>w.word)).size,100);
  assert.equal(new Set(bank.map(w=>w.id)).size,100);
  bank.forEach((w,i)=>{
    assert.equal(w.rank,i+1);
    for (const field of ['word','reading','meaning','tag','note','example','translation']) assert.ok(w[field]?.trim(),`${kind} #${i+1}: ${field}`);
    assert.match(w.reading,/^[ぁ-ゖー、？…]+$/u);
    if(kind==='aizuchi') assert.match(w.example,/^A：.+ B：.+/);
    else assert.ok(w.example.includes(w.word),w.word);
  });
}
console.log('Conversation data: 100 unique entries per category, complete readings, notes and examples.');
const crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
vm.runInNewContext(fs.readFileSync(resolveFile('aizuchi-audio.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(resolveFile('word-audio.js'),'utf8'),context);
const manifest=context.window.JP_AIZUCHI_AUDIO;
const audit=JSON.parse(fs.readFileSync(resolveFile('speech/voicevox-audit.json'),'utf8'));
const plan=JSON.parse(fs.readFileSync(resolveFile('speech/aizuchi-plan.json'),'utf8'));
const pitchCheck=JSON.parse(fs.readFileSync(resolveFile('speech/prosody-check.json'),'utf8'));
const vowelCheck=JSON.parse(fs.readFileSync(resolveFile('speech/aizuchi-vowel-check.json'),'utf8'));
assert.equal(vowelCheck.auditSha256,hash(fs.readFileSync(resolveFile('speech/voicevox-audit.json'),'utf8').replace(/\r\n/g,'\n')));
assert.deepEqual(vowelCheck.records.map(r=>r.rank),[6,10,28,96]);
assert.equal(pitchCheck.auditSha256,hash(fs.readFileSync(resolveFile('speech/voicevox-audit.json'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(pitchCheck.checkedFiles,200);
assert.equal(pitchCheck.checkedSegments,0);assert.equal(pitchCheck.manualPitchProcessing,false);
assert.ok(pitchCheck.checks.every(c=>c.passed&&c.renderingMode==='native'&&c.segments.length===0));
assert.equal(audit.voices.a.name,'青山龍星');assert.equal(audit.voices.b.name,'四国めたん');
assert.equal(audit.renderer.generatorSha256,hash(fs.readFileSync(resolveFile(audit.renderer.generatorSnapshot||'generate-aizuchi-voicevox.cjs'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.renderer.routingSha256,hash(fs.readFileSync(path.join(PROJECT_ROOT,'scripts/audio/aizuchi-model-routing.cjs'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.renderer.mode,'native-only');assert.equal(audit.renderer.manualPitchProcessing,false);
assert.equal(audit.voices.alternate.provider,'AivisSpeech');assert.equal(audit.voices.alternate.name,'まお');
assert.match(manifest.credit,/AivisSpeech:まお/);
assert.equal(audit.sourcePlanSha256,hash(fs.readFileSync(resolveFile('speech/aizuchi-plan.json'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(plan.sources['speech/aizuchi-review.txt'],hash(fs.readFileSync(resolveFile('speech/aizuchi-review.txt'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(plan.sources['conversation-data.js'],hash(fs.readFileSync(resolveFile('conversation-data.js'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.records.length,100);assert.equal(Object.keys(manifest.entries).length,100);
for(const [i,record] of audit.records.entries()){
  const word=context.window.JP_CONVERSATION.aizuchi[i];
  assert.equal(record.id,word.id);assert.equal(plan.entries[i].expression,word.word);
  assert.equal('A：'+record.dialogueInput.a+' B：'+record.dialogueInput.b,word.example);
  assert.equal(record.contour,plan.entries[i].contour);
  assert.equal(record.contour,'自然回應');
  for(const part of ['word','b']){
    assert.equal(record.rendering[part].mode,'native');
    assert.equal(record.rendering[part].postSynthesisPitchShift,false);
    assert.equal(record.rendering[part].manualMoraPitch,false);
    assert.equal(record.rendering[part].interrogativeUpspeak,false);
    assert.deepEqual(record.acoustic[part].segments,[]);
  }
  assert.equal(record.rendering.word.synthesisInput,record.wordInput);
  const spokenText=s=>s.replace(/[。？?…、\s]/gu,'');
  assert.equal(spokenText(record.rendering.b.synthesisInput),spokenText(record.dialogueInput.b));
  const expectedProvider=useAlternateModel(plan.entries[i],record.dialogueInput.b)?'AivisSpeech':'VOICEVOX';
  assert.equal(record.providers.b,expectedProvider);assert.equal(manifest.entries[word.id].provider,expectedProvider);
  assert.equal(record.renderer.generatorSha256,audit.renderer.generatorSha256);
  assert.equal(manifest.entries[word.id].contour,undefined);
  const checkedVowel=vowelCheck.records.find(r=>r.rank===record.rank);
  if(checkedVowel){assert.equal(checkedVowel.sha256,record.word.sha256);assert.ok(checkedVowel.passed&&checkedVowel.voicedFrames>=25&&checkedVowel.medianPeriodicity>checkedVowel.minimumPeriodicity);}
  for(const [kind,key] of [['word','word'],['dialogue','example']]){
    const entry=record[kind];assert.match(entry.file,/^audio\/aizuchi\/\d{3}-(word|dialogue)\.wav$/);
    assert.equal(manifest.entries[word.id][key],entry.file+'?v='+entry.sha256.slice(0,12));
    const bytes=fs.readFileSync(resolveFile(entry.file));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
    assert.equal(hash(bytes),entry.sha256);assert.ok(entry.seconds>.15&&entry.seconds<30);assert.ok(entry.rms>50);
  }
  for(const [part,query] of Object.entries(record.queries)){
    assert.equal(query.outputSamplingRate,24000);
    assert.ok(query.accent_phrases.flatMap(p=>p.moras).every(m=>Number.isFinite(m.pitch)&&m.pitch>=0&&m.vowel_length>=(part!=='a'&&record.providers.b==='AivisSpeech'?0:Number.MIN_VALUE)));
  }
}
console.log('VOICEVOX: 100 phrases/100 dialogues; native-only intonation, four alternate-model regressions, no manual contours, source snapshots and hashes passed.');
if(!process.env.PLAYWRIGHT_PATH) { console.log('Set PLAYWRIGHT_PATH to include browser checks.'); process.exit(0); }
const {chromium} = require(process.env.PLAYWRIGHT_PATH);
(async()=>{
  const server = http.createServer((req,res)=>{
    const file=resolveFile('.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(PROJECT_ROOT+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.wav')?'audio/wav':'text/css');
      res.end(data);
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.spoken=[];
      window.recordings=[];
      window.Audio=class{constructor(src){this.src=src;this.paused=false;}play(){window.recordings.push(this);return Promise.resolve();}pause(){this.paused=true;}};
      window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){window.spoken.push({text:u.text,lang:u.lang});}}});
    });
    const base=`http://127.0.0.1:${server.address().port}/`;
    await page.goto(base+'aizuchi.html');
    const decoded=await page.evaluate(async files=>{const context=new AudioContext();try{for(const item of files){const response=await fetch(item.file);if(!response.ok)throw Error(item.file);const audio=await context.decodeAudioData(await response.arrayBuffer());if(audio.numberOfChannels!==1||Math.abs(audio.duration-item.seconds)>.02)throw Error('Invalid WAV '+item.file);}return files.length;}finally{await context.close();}},audit.records.flatMap(r=>[r.word,r.dialogue]));
    assert.equal(decoded,200);
    assert.ok(!/[↗↘→]/u.test(await page.locator('.expression-prosody').allTextContents().then(t=>t.join(''))));
    console.log('Chrome decoded all 200 aizuchi WAV files.');
    for(const home of ['index.html','layout.html']){
      await page.goto(base+home);
      for(const kind of ['aizuchi','gitaigo']) assert.equal(await page.locator(`.conversation-home a[href="${kind}.html"]`).count(),1);
    }
    for(const kind of ['aizuchi','gitaigo']){
      await page.goto(base+kind+'.html');
      assert.equal(await page.locator('.expression-card').count(),20);
      assert.match(await page.locator('.expression-card').first().innerText(),/#001/);
      await page.click('#expression-next');
      assert.match(await page.locator('.expression-card').first().innerText(),/#021/);
      await page.click('#expression-next');await page.click('#expression-next');await page.click('#expression-next');
      assert.match(await page.locator('.expression-card').last().innerText(),/#100/);
      assert.equal(await page.locator('#expression-next').isDisabled(),true);
      await page.selectOption('#expression-size','100');
      assert.equal(await page.locator('.expression-card').count(),100);
      await page.selectOption('#expression-tag',kind==='aizuchi'?'正式':'觸感');
      const count=await page.locator('.expression-card').count();
      assert.ok(count>0&&count<100);
      assert.ok((await page.locator('.expression-card > .tag').allTextContents()).every(t=>t.includes(kind==='aizuchi'?'正式':'觸感')));
      await page.selectOption('#expression-tag','all');
      await page.fill('#expression-search',kind==='aizuchi'?'ホントウ':'ワクワク');
      assert.ok(await page.locator('.expression-card').count()>0);
      await page.fill('#expression-search','no-such-entry');
      assert.equal(await page.locator('.expression-card').count(),0);
      assert.equal(await page.locator('#expression-next').isDisabled(),true);
      await page.fill('#expression-search',kind==='aizuchi'?'真的嗎':'興奮期待');
      assert.ok(await page.locator('.expression-card').count()>0);
      await page.fill('#expression-search','');
      await page.locator('[data-part="word"]').first().click();
      await page.locator('[data-part="example"]').first().click();
      const spoken=await page.evaluate(()=>window.spoken);
      if(kind==='aizuchi'){
        assert.equal(spoken.length,0);
        const recordings=await page.evaluate(()=>window.recordings);
        assert.equal(recordings.at(-2).src,manifest.entries['aizuchi-1'].word);
        assert.equal(recordings.at(-1).src,manifest.entries['aizuchi-1'].example);
        assert.equal(recordings.at(-2).paused,true);
        assert.match(await page.locator('.expression-audio-credit').textContent(),/VOICEVOX:四国めたん/);
        assert.match(await page.locator('.expression-audio-credit').textContent(),/AivisSpeech:まお/);
        assert.equal(await page.locator('.expression-prosody').count(),100);
        const decoded=await page.evaluate(async()=>{
          const ctx=new AudioContext();let count=0;
          try{for(const e of Object.values(window.JP_AIZUCHI_AUDIO.entries))for(const part of ['word','example']){
            const response=await fetch(e[part]);if(!response.ok)throw Error(e[part]);
            const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
            if(decoded.duration<=.15||decoded.numberOfChannels!==1)throw Error('Invalid audio '+e[part]);count++;
          }}finally{await ctx.close();}return count;
        });
        assert.equal(decoded,200);
    assert.ok(!/[↗↘→]/u.test(await page.locator('.expression-prosody').allTextContents().then(t=>t.join(''))));
      }else{
        assert.equal(spoken.length,0);
        const recordings=await page.evaluate(()=>window.recordings);
        assert.equal(recordings.at(-2).src,context.window.JP_WORD_AUDIO.gitaigo['gitaigo-1'].word);
        assert.equal(recordings.at(-1).src,context.window.JP_WORD_AUDIO.gitaigo['gitaigo-1'].example);
      }
      await page.click('#theme');
      assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await page.click('#theme');
      await page.locator('#study-menu > summary').click();
      assert.equal(await page.locator(`#study-menu a[href="${kind}.html"]`).isVisible(),true);
      assert.equal(await page.locator(`#study-menu a[href="${kind}.html"]`).getAttribute('aria-current'),'page');
      await page.keyboard.press('Escape');
      for(const width of [360,390,768,1440]){
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${kind} width ${width}`);
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: both home entries, pagination, filters, kana/Chinese search, empty state, speech, theme, menu, 4 viewport widths.');
  } finally {await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
