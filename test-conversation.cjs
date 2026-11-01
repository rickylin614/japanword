const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'conversation-data.js'),'utf8'), context);
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
if(!process.env.PLAYWRIGHT_PATH) { console.log('Set PLAYWRIGHT_PATH to include browser checks.'); process.exit(0); }
const {chromium} = require(process.env.PLAYWRIGHT_PATH);
(async()=>{
  const server = http.createServer((req,res)=>{
    const file=path.resolve(__dirname,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(__dirname+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{
      if(err){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'text/css');
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
      assert.ok(spoken.slice(-2).every(u=>u.lang==='ja-JP'));
      assert.equal(spoken.at(-2).text,context.window.JP_CONVERSATION[kind][0].reading);
      assert.equal(spoken.at(-1).text,context.window.JP_CONVERSATION[kind][0].example.replace(/[AB]：/g,''));
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
