const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {PUBLIC_DIR,resolveFile}=require('../scripts/lib/paths.cjs');
const c={window:{}};
for(const file of ['vocabulary-data.js','n5-data.js','n4-data.js','n3-data.js','n2-data.js','n1-data.js'])vm.runInNewContext(fs.readFileSync(resolveFile(file),'utf8'),c);
const levels=['n5','n4','n3','n2','n1'],categories=['nouns','verbs','i_adjectives','na_adjectives','others'];
const labels={nouns:'名詞',verbs:'動詞',i_adjectives:'い形容詞',na_adjectives:'な形容詞',others:'其餘詞性'};
const entries=levels.flatMap(level=>categories.flatMap(category=>Array.from(c.window.JP_VOCABULARY[level][category],word=>({word,level,category}))));
const html=fs.readFileSync(path.join(PUBLIC_DIR,'search.html'),'utf8');
assert.ok(html.includes('data-page="search"'));
for(const level of levels)for(const suffix of ['-data.js','-examples.js','-example-audio.js'])assert.ok(html.includes(level+suffix));
assert.ok(html.includes('word-audio.js'));
assert.ok(fs.readFileSync(resolveFile('shared-shell.js'),'utf8').includes("search.href='search.html'"));
if(!process.env.PLAYWRIGHT_PATH){console.log('PASS: global search page, five-level data/examples/audio assets and shared navigation.');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.resolve(PUBLIC_DIR,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(PUBLIC_DIR+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'text/css');res.end(bytes);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const context=await browser.newContext(),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(()=>{window.played=[];window.Audio=class{constructor(src){this.src=src;}pause(){}play(){played.push(this.src);return Promise.resolve();}};});
    const base='http://127.0.0.1:'+server.address().port+'/';
    await page.goto(base+'search.html');
    assert.equal(await page.locator('.nav-links>a[href="search.html"]').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('.word-card').count(),0);assert.match(await page.locator('#global-search-count').textContent(),new RegExp(String(entries.length)));
    assert.equal(await page.locator('#global-search-pagination').isHidden(),true);
    const input=page.locator('#global-search');
    for(const level of levels)for(const category of categories){
      const word=entries.find(e=>e.level===level&&e.category===category).word;
      await input.fill(word.word);const card=page.locator(`[data-word-id="${word.id}"]`);
      assert.equal(await card.count(),1,level+' '+category);assert.equal(await card.locator('.tag').textContent(),level.toUpperCase()+' · '+labels[category]);
    }
    const target=entries.find(e=>e.level==='n5'&&e.word.word==='食べる');assert.ok(target);
    for(const query of ['食べる','たべる','タベル','ﾀﾍﾞﾙ','吃','n5 食べる']){await input.fill(query);assert.equal(await page.locator(`[data-word-id="${target.word.id}"]`).count(),1,query);}
    const aliased=entries.find(e=>e.word.aliases?.some(a=>a.word&&a.word!==e.word.word));assert.ok(aliased);
    await input.fill(aliased.word.aliases.find(a=>a.word!==aliased.word.word).word);assert.equal(await page.locator(`[data-word-id="${aliased.word.id}"]`).count(),1);
    await input.fill('食べる');assert.equal(await page.locator('.word-examples[open]').count(),0);
    const card=page.locator(`[data-word-id="${target.word.id}"]`);
    await card.locator('[data-favorite]').click();assert.equal(await card.locator('[data-favorite]').getAttribute('aria-pressed'),'true');
    await card.locator('[data-speak]').click();assert.equal(await page.evaluate(id=>played.at(-1)===JP_WORD_AUDIO.levels.n5[id],target.word.id),true);
    await card.locator('.word-examples>summary').click();assert.equal(await card.locator('.word-example').count(),4);
    await card.locator('[data-example-speak]').first().click();assert.equal(await page.evaluate(id=>played.at(-1)===JP_EXAMPLE_AUDIO.n5[id][0],target.word.id),true);
    const other=await context.newPage();await other.goto(base+'favorites.html');await other.locator(`[data-favorite="${target.word.id}"]`).click();
    await page.waitForFunction(id=>document.querySelector(`[data-favorite="${id}"]`).getAttribute('aria-pressed')==='false',target.word.id);await other.close();
    await input.fill('n5');assert.equal(await page.locator('.word-card').count(),50);await page.click('#global-search-next');assert.match(await page.locator('#global-search-count').textContent(),/第 2/);
    await input.fill('不存在的搜尋詞xyz');assert.equal(await page.locator('.word-card').count(),0);assert.equal(await page.locator('#global-search-pagination').isHidden(),true);
    await input.fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#global-search-list img').count(),0);
    await input.fill('食べる');await page.reload();assert.equal(await input.inputValue(),'食べる');assert.ok(await card.count());
    for(const width of [320,360,390,768,1440]){
      await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
      assert.equal(await page.locator('.nav-links>a[href="search.html"]').isVisible(),true);
      const bar=await page.locator('#global-search-pagination').boundingBox();assert.ok(Math.abs(bar.y+bar.height-900)<2);
    }
    fs.mkdirSync(path.join(__dirname,'../artifacts/screenshots'),{recursive:true});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'../artifacts/screenshots/search-mobile.png')});
    await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'../artifacts/screenshots/search-desktop.png')});
    for(const file of ['layout.html','favorites.html','n5.html','50.html','sources.html','listening.html']){await page.goto(base+file);assert.equal(await page.locator('.nav-links>a[href="search.html"]').count(),1,file);}
    assert.deepEqual(errors,[]);
    console.log('PASS: five levels / all parts of speech, Japanese/Chinese/kana/aliases, multi-keyword query, cards/audio/favorites/cross-tab sync, pagination/reset, URL restore, safe rendering, global navigation and five widths.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
