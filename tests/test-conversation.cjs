const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../scripts/lib/paths.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
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
assert.equal(pitchCheck.auditSha256,hash(fs.readFileSync(resolveFile('speech/voicevox-audit.json'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(pitchCheck.checkedFiles,200);
assert.ok(pitchCheck.checks.every(c=>c.segments.every(s=>s.passed)));
assert.equal(audit.voices.a.name,'青山龍星');assert.equal(audit.voices.b.name,'四国めたん');
assert.equal(audit.renderer.generatorSha256,hash(fs.readFileSync(resolveFile(audit.renderer.generatorSnapshot||'generate-aizuchi-voicevox.cjs'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.renderer.shaperSha256,hash(fs.readFileSync(resolveFile(audit.renderer.shaperSnapshot||'shape-aizuchi-prosody.py'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.sourcePlanSha256,hash(fs.readFileSync(resolveFile('speech/aizuchi-plan.json'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(plan.sources['speech/aizuchi-review.txt'],hash(fs.readFileSync(resolveFile('speech/aizuchi-review.txt'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(plan.sources['conversation-data.js'],hash(fs.readFileSync(resolveFile('conversation-data.js'),'utf8').replace(/\r\n/g,'\n')));
assert.equal(audit.records.length,100);assert.equal(Object.keys(manifest.entries).length,100);
for(const [i,record] of audit.records.entries()){
  const word=context.window.JP_CONVERSATION.aizuchi[i];
  assert.equal(record.id,word.id);assert.equal(plan.entries[i].expression,word.word);
  assert.equal('A：'+record.dialogueInput.a+' B：'+record.dialogueInput.b,word.example);
  for(const [kind,key] of [['word','word'],['dialogue','example']]){
    const entry=record[kind];assert.match(entry.file,/^audio\/aizuchi\/\d{3}-(word|dialogue)\.wav$/);
    assert.equal(manifest.entries[word.id][key],entry.file+'?v='+entry.sha256.slice(0,12));
    const bytes=fs.readFileSync(resolveFile(entry.file));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
    assert.equal(hash(bytes),entry.sha256);assert.ok(entry.seconds>.15&&entry.seconds<30);assert.ok(entry.rms>50);
  }
  for(const query of Object.values(record.queries)){
    assert.equal(query.outputSamplingRate,24000);
    assert.ok(query.accent_phrases.flatMap(p=>p.moras).every(m=>Number.isFinite(m.pitch)&&m.pitch>=0&&m.vowel_length>0));
  }
  for(const measured of Object.values(record.acoustic))for(const segment of measured.segments){
    assert.equal(segment.passed,true,word.word);assert.ok(segment.voicedFrames>=5);
    const c=segment.contour;
    if(c.includes('尾升')||c==='短升 ↗')assert.ok(segment.deltaSemitones>1.5,word.word);
    else if(c.includes('平持')||c.includes('前降後平持'))assert.ok(Math.abs(segment.deltaSemitones)<1.5,word.word);
    else if(c.includes('先升後降')||c.includes('輕升後收'))assert.ok(segment.peakHz>segment.startHz*1.02&&segment.peakHz>segment.endHz*1.08,word.word);
    else assert.ok(segment.deltaSemitones< -1.5,word.word);
  }
}
console.log('VOICEVOX: all 100 phrase/100 dialogue files, source snapshots, hashes, independently measured WAV pitch contours and audio metadata passed.');
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
