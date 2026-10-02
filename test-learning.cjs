const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const root = __dirname;
const context = {window:{}};
vm.createContext(context);
for(const file of ['grammar-data.js','vocabulary-data.js','n2-data.js','n3-data.js','n4-data.js','n5-data.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const {JP_GRAMMAR:grammar,JP_VOCABULARY:vocabulary} = context.window;
const ids=new Set();
for(const [level,bank] of Object.entries(grammar)) {
  assert.ok(bank.length>100);
  assert.equal(new Set(bank.map(q=>q.sentence)).size,bank.length);
  for(const q of bank) {
    assert.ok(!ids.has(q.id));ids.add(q.id);
    assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);
    assert.equal(q.options.filter(x=>x===q.answer).length,1);
    assert.equal(q.sentence.split('【　】').length,2);
    assert.ok(q.explanation && q.hint);
  }
  console.log(`${level}: ${bank.length} unique grammar contexts / ${new Set(bank.map(q=>q.pattern)).size} patterns`);
}
for(const [level,categories] of Object.entries(vocabulary)) for(const [category,bank] of Object.entries(categories)) {
  assert.equal(bank.length,JSON.parse(fs.readFileSync(path.join(root,'sources',level+'-audit.json'),'utf8')).counts[category]);assert.equal(new Set(bank.map(w=>w.word+'|'+w.reading)).size,bank.length);
  assert.equal(new Set(bank.map(w=>w.jmdictId)).size,bank.length);
  for(const word of bank) {assert.ok(word.id&&word.word&&word.reading&&word.meaning&&word.pos);assert.match(word.reading,/^[ぁ-ゖァ-ヶー]+$/u);assert.ok(!ids.has(word.id));ids.add(word.id);}
  console.log(`${level} ${category}: ${bank.length} vocabulary entries`);
}
if (!process.env.PLAYWRIGHT_PATH) {console.log('Data checks passed. Set PLAYWRIGHT_PATH for browser checks.');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
async function main() {
  const server=http.createServer((req,res)=>{
    const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/plain; charset=utf-8');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'chrome'});
    const page=await browser.newPage();const errors=[];
    await page.addInitScript(()=>{
      window.spoken=[];
      window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'ja-JP',name:'Test Japanese'}],cancel(){},speak(utterance){window.spoken.push({text:utterance.text,lang:utterance.lang});}}});
    });
    page.on('pageerror',e=>errors.push(e.message));
    const base=`http://127.0.0.1:${server.address().port}`;
    const go=file=>page.goto(`${base}/${file}`);
    const pages=['layout.html','index.html','grammar.html','sources.html',...['nouns','verbs','i_adjectives','na_adjectives','others'].map(c=>`n2-${c}.html`),...['n3','n4'].flatMap(l=>['nouns','verbs','i_adjectives','na_adjectives','adjectives','others'].map(c=>`${l}-${c}.html`)),...['nouns','verbs','i_adjectives','na_adjectives','others'].map(c=>`n5-${c}.html`),...['n3.html','n4.html','n5.html']];
    for(const width of [360,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      for(const file of pages) {
        await go(file);
        await page.waitForFunction(()=>!document.body.textContent.includes('載入中'));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${file}: overflow at ${width}`);
        if(width===360 && file==='layout.html') await page.screenshot({path:path.join(root,'mobile-preview.png'),fullPage:true});
        if(width===1440 && file==='layout.html') await page.screenshot({path:path.join(root,'desktop-preview.png'),fullPage:true});
        if(width===390 && file==='n3.html') await page.screenshot({path:path.join(root,'verbs-mobile-preview.png'),fullPage:true});
        if(width===1440 && file==='n3.html') await page.screenshot({path:path.join(root,'verbs-desktop-preview.png'),fullPage:true});
        if(width===390 && file==='n2-i_adjectives.html') await page.screenshot({path:path.join(root,'n2-mobile-preview.png'),fullPage:false});
      }
    }
    await go('layout.html');
    assert.match(await page.locator('.stats').innerText(),/5233/);
    for(const level of ['n3','n4','n5'])assert.equal(await page.locator(`.card a[href="${level}.html"]`).count(),1);
    for(const category of ['nouns','verbs','i_adjectives','na_adjectives','others'])assert.equal(await page.locator('.card a[href="n5-'+category+'.html"]').count(),1);
    const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).filter(h=>!h.startsWith('#')));
    for(const link of links){const res=await page.request.get(`${base}/${link}`);assert.ok(res.ok(),link);}
    await page.locator('#theme').click();await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await go('n3-nouns.html');await page.locator('.favorite').first().click();await page.reload();await page.selectOption('#scope','favorites');assert.equal(await page.locator('.word-card').count(),1);
    await page.fill('#search','不存在的詞彙');assert.ok(await page.locator('#word-start').isDisabled());
    await page.fill('#search','');await page.selectOption('#scope','all');await page.fill('#search','えいきょう');assert.equal(await page.locator('.word-card').count(),1);
    await page.locator('#word-start').click();await page.locator('#word-prompt-speech').click();assert.equal(await page.evaluate(()=>spoken.at(-1).text),'えいきょう');assert.equal(await page.locator('#word-feedback').innerText(),'');await page.fill('#reading-answer','エイキョウ');await page.locator('button[type=submit]').click();assert.match(await page.locator('#word-feedback').innerText(),/答對/);await page.locator('#word-speech').click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');await page.locator('#word-next').click();assert.match(await page.locator('#word-practice').innerText(),/答對 1 \/ 1/);
    await page.locator('#word-close').click();await page.selectOption('#word-mode','meaning');await page.locator('#word-start').click();await page.getByRole('button',{name:'影響',exact:true}).click();assert.match(await page.locator('#word-feedback').innerText(),/答對/);
    for(const level of ['n5','n4','n3']) {
      await go(`grammar.html?level=${level}`);await page.selectOption('#grammar-scope','wrong');await page.locator('#start').click();assert.match(await page.locator('#empty-pool').innerText(),/沒有錯題/);
      await page.selectOption('#grammar-scope','all');await page.locator('#start').click();
      await page.locator('#question-speech').click();assert.match(await page.evaluate(()=>spoken.at(-1).text),/空欄/);
      for(let i=0;i<4;i++){await page.locator('[data-listen]').nth(i).click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');}
      assert.equal(await page.locator('#feedback').innerText(),'');assert.ok(await page.locator('.option').first().isEnabled());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('#reveal').click();assert.match(await page.locator('#feedback').innerText(),/已加入待複習/);
      await page.locator('#speech').click();assert.ok(!(await page.evaluate(()=>spoken.at(-1).text)).includes('空欄'));
      assert.ok(await page.locator('[data-listen]').first().isEnabled());
      assert.ok(await page.locator('.option').first().isDisabled());
      await page.locator('#exit').click();await page.reload();await page.locator('#resume').click();assert.match(await page.locator('.quiz-top').innerText(),/2 \/ 10/);
      for(let i=1;i<10;i++) {
        const sentence=await page.locator('#sentence').innerText();const q=grammar[level].find(q=>q.sentence===sentence);assert.ok(q);
        await page.locator('.option').filter({hasText:q.answer}).last().click();
        assert.match(await page.locator('#feedback').innerText(),/答對了/);
        await page.locator('#next').click();
      }
      assert.match(await page.locator('.summary-number').innerText(),/9 \/ 10/);
      await page.locator('[data-review-speech]').click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');
      await page.locator('#retry').click();const sentence=await page.locator('#sentence').innerText();const q=grammar[level].find(q=>q.sentence===sentence);
      await page.locator('.option').filter({hasText:q.answer}).last().click();await page.locator('#next').click();assert.equal(await page.locator('.summary-number').innerText(),'1 / 1');
      await page.locator('#again').click();await page.selectOption('#grammar-scope','wrong');await page.locator('#start').click();assert.match(await page.locator('#empty-pool').innerText(),/沒有錯題/);
      await page.selectOption('#grammar-scope','new');await page.selectOption('#size','105');await page.locator('#start').click();assert.match(await page.locator('.quiz-top').innerText(),/1 \/ 95/);
    }
    await page.setViewportSize({width:360,height:800});await page.screenshot({path:path.join(root,'grammar-mobile-preview.png'),fullPage:true});
    for(const l of ['n3','n4'])for(const category of ['nouns','adjectives','others'])for(const mode of ['reading','meaning']){
      await go(`${l}-${category}.html`);await page.selectOption('#word-mode',mode);await page.locator('#word-start').click();await page.locator('#word-prompt-speech').click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');assert.equal(await page.locator('#word-feedback').innerText(),'');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    for(const l of ['n3','n4','n5']){
      await go(`${l}.html`);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已載入'));
      assert.equal(await page.locator('link[href="learning.css"]').count(),1);
      assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await page.locator('#legacy-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
      await page.locator('#legacy-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await page.locator('button[onclick="speakText()"]').click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');
      await page.locator('button[onclick="checkAnswer()"]').click();await page.getByRole('button',{name:'🔊 聽答案發音',exact:true}).click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');
    }
    for(const level of ['n2','n3','n4','n5'])for(const category of ['nouns','verbs','i_adjectives','na_adjectives','others']){
      await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('jp-learning-v1'));s.favorites=[];localStorage.setItem('jp-learning-v1',JSON.stringify(s));});
      await go(`${level}-${category}.html`);
      const count=await page.evaluate(({level,category})=>window.JP_VOCABULARY[level][category].length,{level,category});
      assert.equal(await page.locator('.word-card').count(),Math.min(60,count));
      const first=await page.locator('.word-card h2').first().innerText();
      if(count>60){await page.locator('#word-next-page').click();assert.notEqual(await page.locator('.word-card h2').first().innerText(),first);await page.locator('#word-prev-page').click();}
      await page.locator('[data-speak]').first().click();assert.equal(await page.evaluate(()=>spoken.at(-1).lang),'ja-JP');
      await page.locator('.word-card summary').first().click();assert.match(await page.locator('.word-card details').first().innerText(),/JMdict/);
      const sourceHref=await page.locator('.word-card details a').first().getAttribute('href');assert.ok(sourceHref.includes('/'+level+'.csv#L'));
      await page.fill('#search',first);assert.ok(await page.locator('.word-card').count()>0);await page.fill('#search','');
      await page.locator('.favorite').first().click();await page.reload();await page.selectOption('#scope','favorites');assert.equal(await page.locator('.word-card').count(),1);
      for(const mode of ['reading','meaning']){
        await page.selectOption('#word-mode',mode);await page.locator('#word-start').click();
        const word=await page.locator('#word-practice h2').innerText();const item=await page.evaluate(({level,category,word})=>window.JP_VOCABULARY[level][category].find(w=>w.word===word),{level,category,word});
        await page.locator('#word-prompt-speech').click();assert.equal(await page.evaluate(()=>spoken.at(-1).text),item.reading);
        assert.equal(await page.locator('#word-feedback').innerText(),'');
        if(mode==='reading'){await page.fill('#reading-answer',item.reading);await page.locator('button[type=submit]').click();}
        else await page.getByRole('button',{name:item.meaning,exact:true}).click();
        assert.match(await page.locator('#word-feedback').innerText(),/答對/);
        await page.locator('#word-next').click();assert.match(await page.locator('#word-practice').innerText(),/答對 1 \/ 1/);await page.locator('#word-close').click();
      }
      await page.selectOption('#scope','all');await page.locator('#word-start').click();assert.match(await page.locator('.quiz-top').innerText(),/1 \/ 20/);
    }
    // Old favorites migrate once, unmatched entries remain reviewable, grammar history is untouched.
    await go('n3-nouns.html');
    const migration=await page.evaluate(()=>{const [oldId,newId]=Object.entries(window.JP_VOCABULARY_MIGRATION).find(([id])=>id.startsWith('n3-'));const retired=window.JP_RETIRED_VOCABULARY.find(w=>w.level==='n3');return {oldId,newId,retired};});
    await page.evaluate(({oldId,newId,retired})=>localStorage.setItem('jp-learning-v1',JSON.stringify({favorites:[oldId,newId,retired.id],answers:{'grammar-sentinel':{correct:true}},sessions:{keep:{test:true}}})),migration);
    await page.reload();await page.reload();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jp-learning-v1')));
    assert.deepEqual(saved.favorites.sort(),[migration.newId,migration.retired.id].sort());assert.equal(saved.answers['grammar-sentinel'].correct,true);assert.equal(saved.sessions.keep.test,true);
    assert.match(await page.locator('#retired-favorites').innerText(),/舊版收藏/);await page.locator('[data-old-speak]').click();assert.equal(await page.evaluate(()=>spoken.at(-1).text),migration.retired.reading);
    await page.locator('[data-old-remove]').click();assert.ok(await page.locator('#retired-favorites').isHidden());
    for(const level of ['n3','n4']){await go(level+'-adjectives.html');const total=await page.evaluate(l=>window.JP_VOCABULARY[l].i_adjectives.length+window.JP_VOCABULARY[l].na_adjectives.length,level);assert.ok((await page.locator('#word-count').innerText()).includes('/ '+total+' 詞'));}
    await go('n4-nouns.html');await page.selectOption('#vocabulary-category','verbs');await page.waitForURL('**/n4-verbs.html');await page.selectOption('#vocabulary-level','n3');await page.waitForURL('**/n3-verbs.html');
    await page.setViewportSize({width:390,height:844});await go('n3-nouns.html');await page.screenshot({path:path.join(root,'n3-mobile-preview.png'),fullPage:false});
    await page.setViewportSize({width:1440,height:1000});await go('n4-nouns.html');await page.screenshot({path:path.join(root,'n4-desktop-preview.png'),fullPage:false});
    await go('n5-nouns.html');await page.selectOption('#vocabulary-category','i_adjectives');await page.waitForURL('**/n5-i_adjectives.html');await page.selectOption('#vocabulary-level','n4');await page.waitForURL('**/n4-i_adjectives.html');await page.selectOption('#vocabulary-level','n5');await page.waitForURL('**/n5-i_adjectives.html');
    await page.setViewportSize({width:390,height:844});await go('n5-nouns.html');await page.locator('.word-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'n5-mobile-preview.png'),fullPage:false});
    const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}});});
    const blockedPage=await blocked.newPage();await blockedPage.goto(`${base}/layout.html`);assert.match(await blockedPage.locator('#storage-note').innerText(),/未開放儲存/);await blocked.close();
    assert.deepEqual(errors,[]);
    console.log('Chrome checks passed: 29 pages x 4 viewport widths; N2/N3/N4/N5 source links, search, favorites migration, 20 banks x 2 quiz modes; all existing verb links/themes; N2 sources, pagination, favorites, readings/meanings/audio; existing grammar score, resume, wrong-answer retry, unseen pool and storage failure.');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
