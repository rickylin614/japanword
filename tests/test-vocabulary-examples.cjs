const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../scripts/lib/paths.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root=PROJECT_ROOT;
const context = {window:{JP_VOCABULARY:{}}};
for(const level of ['n5','n4','n3','n2','n1']) for(const file of [level+'-data.js',level+'-examples.js',level+'-example-audio.js']) vm.runInNewContext(fs.readFileSync(resolveFile(file),'utf8'),context);
const levels = ['n5','n4','n3','n2','n1'];
const audit=JSON.parse(fs.readFileSync(resolveFile('vocabulary-examples/audit.json'),'utf8'));
for(const [file,expected] of Object.entries(audit.files)){
  const actual=crypto.createHash('sha256').update(fs.readFileSync(resolveFile(file),'utf8').replace(/\r\n/g,'\n')).digest('hex');
  assert.equal(actual,expected.sha256LF,'Audit snapshot is stale: '+file);
}
for(const level of levels){
  const allWords=Object.values(context.window.JP_VOCABULARY[level]).flat();
  const allExamples=context.window.JP_VOCABULARY_EXAMPLES[level];
  assert.equal(audit.levels[level].covered,allWords.length);
  assert.equal(audit.levels[level].total,allWords.length);
  assert.deepEqual(Object.keys(allExamples).sort(),allWords.map(w=>w.id).sort());
  for(const word of allWords){
    const e=allExamples[word.id];
    assert.ok(e.surface && e.sentence.includes(e.surface),word.id);
    assert.match(e.translation,/[\u3400-\u9fff]/u);
    assert.ok(!/[<>|\n\t]/.test(e.sentence+e.translation),word.id);
    if(e.source){
      assert.match(e.source.jaId,/^\d+$/);assert.match(e.source.zhId,/^\d+$/);
      assert.equal(e.source.license,'CC BY 2.0 FR');
      assert.equal(e.evidence.reading,word.reading);
      assert.ok(e.source.originalTranslation);
    }
    if(word.category==='verbs'){
      assert.deepEqual(Array.from(e.variants,v=>v.kind),['dictionary','te','common'],word.id);
      assert.equal(new Set(e.variants.map(v=>v.sentence)).size,3,word.id);
      for(const v of e.variants){assert.ok(v.sentence.includes(v.surface),word.id);assert.match(v.translation,/[\u3400-\u9fff]/u);}
      assert.match(e.variants[1].form,/[てで]$/u,word.id);
      assert.match(e.variants[1].reading,/^[ぁ-ゖー]+[てで]$/u,word.id);
      assert.equal(e.variants[2].sentence,e.sentence);
    }else assert.equal(e.variants,undefined,word.id);
  }
  assert.equal(audit.levels[level].verbEntries,context.window.JP_VOCABULARY[level].verbs.length);
  assert.equal(audit.levels[level].verbExamples,context.window.JP_VOCABULARY[level].verbs.length*3);
  execFileSync(process.execPath,[resolveFile('build-vocabulary-examples.cjs'),level,'--check'],{stdio:'inherit'});
}
const banks = context.window.JP_VOCABULARY.n5;
const examples = context.window.JP_VOCABULARY_EXAMPLES.n5;
const words = Object.values(banks).flat();
assert.equal(words.length,698);
assert.deepEqual(Object.keys(examples).sort(),words.map(w=>w.id).sort());
for(const word of words){
  const example=examples[word.id];
  assert.ok(example.sentence.includes(example.surface),word.word);
  assert.match(example.translation,/[\u3400-\u9fff]/u);
  assert.ok(!example.sentence.includes('春天'),word.word);
}
function example(word,reading){const w=words.find(w=>w.word===word&&(!reading||w.reading===reading));return examples[w.id];}
// Sense/reading regression cases: opening vs opening something, doing vs printing,
// day one vs duration, the suffix meaning "no matter how", and formal pronouns.
assert.match(example('開く').sentence,/窓が開いています/);
assert.match(example('開ける').sentence,/ドアを開けて/);
assert.match(example('する').translation,/運動/);
assert.equal(example('する').surface,'します');
assert.doesNotMatch(example('する').sentence,/すりました/);
assert.match(example('一日','ついたち').sentence,/毎月一日/);
assert.match(example('一日','いちにち').sentence,/一日働いて/);
assert.match(example('一月').surface,/ひと月/);
assert.match(example('いくら').sentence,/いくらですか/);
assert.match(example('私','わたくし').sentence,/いたします/);
assert.notEqual(example('私','わたくし').sentence,example('私','わたし').sentence);
assert.notEqual(example('中','じゅう').sentence,example('中','なか').sentence);
assert.equal(example('昨夜').surface,'ゆうべ');
assert.equal(example('私','わたくし').surface,'わたくし');
const n5Glosses=JSON.parse(fs.readFileSync(resolveFile('sources/n5-zh.json'),'utf8'));
for(const word of words)assert.equal(word.meaning,n5Glosses[word.jmdictId],word.id+' published gloss differs from source');
const suru=words.find(w=>w.word==='する');
assert.equal(suru.jmdictId,'1157170');assert.ok(suru.posCodes.includes('vs-i'));
assert.match(suru.meaning,/做/);assert.doesNotMatch(suru.meaning,/印刷/);
const n5Evidence=JSON.parse(fs.readFileSync(resolveFile('sources/n5-dictionary-evidence.json'),'utf8'));
assert.ok(n5Evidence.words.find(w=>w.id===suru.jmdictId).sense[0].gloss.some(g=>g.text==='to do'));
assert.match(words.find(w=>w.word==='いくら').meaning,/多少錢/);
assert.match(words.find(w=>w.word==='どうも').meaning,/謝謝/);
// Validate every N5 verb example's actual form, not just whether a substring exists.
// This catches using a godan printing verb's すりました for irregular する.
const {forms:verbForms}=require('../scripts/build/build-verbs.cjs');
for(const word of banks.verbs){
  const type=word.posCodes.find(p=>p.startsWith('v')&&!['vi','vt'].includes(p));
  const allowed=new Set();
  for(const lemma of new Set([word.word,word.reading,({'終る':'終わる','曲る':'曲がる'})[word.word]].filter(Boolean))){
    const [masu,te,nai,ta]=verbForms(lemma,type);const stem=masu.slice(0,-2);
    [lemma,masu,te,nai,nai+'で',ta,...['ました','ません','ませんか','ましょう'].map(t=>stem+t),...['います','いました','いません'].map(t=>te+t)].forEach(f=>allowed.add(f));
    if(type.startsWith('v5')){
      const e={う:'え',く:'け',ぐ:'げ',す:'せ',つ:'て',ぬ:'ね',ぶ:'べ',む:'め',る:'れ'}[lemma.at(-1)];
      if(e)allowed.add(lemma.slice(0,-1)+e+'ます');
    }
  }
  assert.ok(allowed.has(examples[word.id].surface),word.word+' mismatched example inflection: '+examples[word.id].surface);
}
function selected(level,word,reading){const w=Object.values(context.window.JP_VOCABULARY[level]).flat().find(w=>w.word===word&&(!reading||w.reading===reading));return context.window.JP_VOCABULARY_EXAMPLES[level][w.id];}
assert.match(selected('n4','ベル').translation,/門鈴/);
assert.match(selected('n4','直る').translation,/修好/);
assert.match(selected('n4','味噌').translation,/味噌/);
assert.match(selected('n3','抱く','いだく').translation,/懷抱/);
assert.match(selected('n3','大家').translation,/房東/);
assert.match(selected('n3','アウト').translation,/出界/);
assert.match(selected('n3','いただきます').translation,/開動/);
assert.match(selected('n2','そば').translation,/蕎麥/);
assert.match(selected('n2','あらわす').translation,/撰寫/);
assert.match(selected('n2','しめる').translation,/潮濕/);
assert.match(selected('n2','まく').translation,/圍巾/);
assert.match(selected('n2','何分').translation,/畢竟/);
assert.match(selected('n2','御','おん').sentence,/御社/);
assert.match(selected('n2','琴','きん').translation,/古琴/);
assert.match(selected('n2','塩辛').translation,/鹽漬發酵/);
assert.match(selected('n2','卑怯').translation,/卑鄙/);
// Linguistic regressions found during the N2–N4 recheck (2026-11-01).
assert.equal(selected('n3','デモ').surface,'デモ');
assert.match(selected('n3','デモ').translation,/示威/);
assert.doesNotMatch(selected('n3','デモ').sentence,/それでも/);
assert.equal(selected('n2','する').surface,'刷りました');
assert.match(selected('n2','する').translation,/印了三十份/);
assert.match(selected('n3','切れる').sentence,/ひも.*切れました/);
assert.match(selected('n3','切れ').sentence,/二切れ/);
assert.match(selected('n2','切れ').sentence,/品切れ/);
assert.equal(selected('n3','今日','こんにち').surface,'こんにち');
assert.match(selected('n3','行き').sentence,/京都行きです/);
assert.match(selected('n3','気味','きみ').sentence,/気味が悪い/);
assert.match(selected('n2','気味','ぎみ').sentence,/風邪気味/);
assert.match(selected('n4','太る').sentence,/太りました/);
assert.match(selected('n4','見つかる').sentence,/鍵が.*見つかりました/);
assert.match(selected('n3','前者').translation,/前者比後者更優雅/);
assert.match(selected('n3','後者').translation,/前者比後者更優雅/);
assert.match(selected('n3','発行').translation,/下週/);
assert.match(selected('n2','占う').translation,/請.*幫我占卜/);
for(const level of levels){
  const all=Object.values(context.window.JP_VOCABULARY[level]).flat();
  const source=JSON.parse(fs.readFileSync(resolveFile('sources',level+'-zh.json'),'utf8'));
  for(const word of all)assert.equal(word.meaning,source[word.jmdictId],word.id);
  for(const w of all.filter(w=>w.posCodes.includes('vs-s')))assert.equal(w.category,'verbs',w.word);
}
const variants=(level,word,reading)=>selected(level,word,reading).variants;
assert.equal(variants('n5','来る')[1].reading,'きて');
assert.equal(variants('n5','居る')[1].reading,'いて');
assert.equal(variants('n5','要る')[1].reading,'いって');
assert.ok(variants('n5','要る')[1].note);
assert.equal(variants('n5','行く')[1].form,'行って');
assert.equal(variants('n3','問う')[1].form,'問うて');
assert.equal(variants('n2','応ずる')[1].form,'応じて');
assert.equal(variants('n2','応ずる')[1].reading,'おうじて');
assert.equal(variants('n3','愛する')[1].form,'愛して');
assert.equal(variants('n2','する')[0].form,'刷る');
assert.equal(variants('n2','する')[1].form,'刷って');
assert.match(variants('n3','遭う')[0].sentence,/にわか雨/);
assert.match(variants('n5','会う')[0].sentence,/友達/);
assert.match(variants('n3','明ける')[0].sentence,/梅雨/);
assert.match(variants('n5','開ける')[0].sentence,/窓/);
assert.match(variants('n4','空く','あく')[0].sentence,/予定/);
assert.match(variants('n3','抱く','いだく')[0].sentence,/希望/);
assert.match(variants('n3','抱く','だく')[0].sentence,/赤ちゃん/);
console.log('N1–N5: all 7904 entries covered; readings, selected senses, attribution and reproducible builds passed.');
if(!process.env.PLAYWRIGHT_PATH){console.log('Set PLAYWRIGHT_PATH for browser checks.');process.exit(0);}
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=resolveFile('.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end();return;}
      res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':'text/css');
      res.end(data);
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.addInitScript(()=>{
      window.spoken=[];
      window.played=[];
      window.Audio=class{constructor(src){this.src=src;}pause(){}play(){played.push(this.src);return Promise.resolve();}};
      window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
      Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){window.spoken.push({text:u.text,lang:u.lang});}}});
    });
    const base=`http://127.0.0.1:${server.address().port}/`;
    for(const level of levels) for(const [category,bank] of Object.entries(context.window.JP_VOCABULARY[level])){
      const examples=context.window.JP_VOCABULARY_EXAMPLES[level];
      await page.goto(base+`${level}-${category}.html`);
      let visited=0;
      while(true){
        const rendered=await page.locator('.word-card').evaluateAll(cards=>cards.map(card=>({id:card.querySelector('[data-example-speak]')?.dataset.exampleSpeak,closed:!card.querySelector('.word-examples').open,sections:[...card.querySelectorAll('.word-example')].map(e=>({kind:e.dataset.exampleKind,sentence:e.querySelector('.example-sentence')?.textContent,translation:e.querySelector('.example-translation')?.textContent,surface:e.querySelector('mark')?.textContent,credit:e.querySelector('.example-source')?.textContent})),actionsFirst:!!(card.querySelector('.word-actions').compareDocumentPosition(card.querySelector('.word-examples'))&Node.DOCUMENT_POSITION_FOLLOWING)})));
        assert.ok(rendered.length);
        assert.equal(await page.locator('.word-card > details:not(.word-examples)').count(),0);
        assert.equal(await page.getByText('詞性與來源核對',{exact:true}).count(),0);
        for(const card of rendered){
          assert.ok(card.id);assert.equal(card.closed,true);assert.equal(card.actionsFirst,true);
          const expected=examples[card.id].variants||[examples[card.id]];
          assert.equal(card.sections.length,expected.length);
          for(let i=0;i<expected.length;i++){const actual=card.sections[i],e=expected[i];assert.equal(actual.kind,e.kind||'common');assert.equal(actual.sentence,e.sentence);assert.equal(actual.translation,e.translation);assert.equal(actual.surface,e.surface);if(e.source)assert.match(actual.credit,/Tatoeba/);}
        }
        visited+=rendered.length;
        const firstCard=page.locator('.word-card').first();
        assert.equal(await firstCard.locator('.word-example').first().isVisible(),false);
        await firstCard.locator('.word-examples > summary').click();
        assert.equal(await firstCard.locator('.word-example').first().isVisible(),true);
        for(let i=0;i<rendered[0].sections.length;i++){
          await firstCard.locator('[data-example-speak]').nth(i).click();
          const played=await page.evaluate(()=>window.played.at(-1));
          assert.equal(played,context.window.JP_EXAMPLE_AUDIO[level][rendered[0].id][i]);
        }
        await firstCard.locator('.word-examples > summary').click();
        assert.equal(await firstCard.locator('.word-example').first().isVisible(),false);
        assert.equal(await page.locator('#word-practice').isHidden(),true);
        if(await page.locator('#word-next-page').isDisabled())break;
        await page.click('#word-next-page');
      }
      assert.equal(visited,bank.length);
      await page.fill('#search',bank[0].reading);
      assert.ok(await page.locator('.word-example').count());
      await page.locator('.favorite').first().click();await page.reload();
      await page.selectOption('#scope','favorites');
      assert.ok(await page.locator('.word-example').count());
      for(const width of [360,390,768,1440]){
        await page.setViewportSize({width,height:900});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${category} ${width}px`);
        assert.equal(await page.locator('.word-card').first().evaluate(card=>card.querySelector('.word-actions').getBoundingClientRect().bottom <= card.querySelector('.word-examples').getBoundingClientRect().top),true);
        await page.locator('.word-examples > summary').first().click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${category} open ${width}px`);
        await page.locator('.word-examples > summary').first().click();
      }
      await page.locator('#theme').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await page.locator('#theme').click();
    }
    for(const level of ['n3','n4']){
      await page.goto(base+level+'-adjectives.html');
      assert.equal(await page.locator('.word-card').count(),await page.locator('.word-example').count());
    }
    await page.evaluate(()=>localStorage.setItem('jp-learning-v1',JSON.stringify({favorites:['n2-jmdict-1384840'],answers:{},sessions:{}})));
    await page.goto(base+'n2-others.html');
    await page.selectOption('#scope','favorites');
    assert.equal(await page.locator('.word-card').count(),1);
    assert.equal(await page.locator('.word-card > p[lang=ja]').textContent(),'ぎれ');
    assert.equal(await page.locator('.favorite').getAttribute('data-favorite'),'n2-jmdict-2518850');
    assert.match(await page.locator('.word-example').textContent(),/品切れ/);
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: all 7904 cards, 1336 verbs x 3 variants; collapsed by default, expand/collapse, each variant speech, credits, search, favorites, themes, 4 widths and combined adjective pages.');
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
