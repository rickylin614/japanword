const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = __dirname;
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'grammar-source/legacy-grammar.js'),'utf8'),context);
const banks = context.window.JP_GRAMMAR;
const guide = [];
const sentences = new Set();
for (const level of ['n5','n4','n3']) {
  const bank = banks[level];
  for (let i=0;i<105;i+=5) {
    const items=bank.slice(i,i+5), q=items[0], id=`${level}-legacy-${i/5+1}`;
    items.forEach(q=>q.grammarId=id);
    guide.push({id,level,title:q.hint,pattern:q.pattern,connection:q.explanation,explanation:q.explanation,questionIds:items.map(q=>q.id),examples:items.map(q=>q.sentence.replace('【　】',q.answer))});
  }
  const blocks=fs.readFileSync(path.join(root,`grammar-source/${level}.txt`),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n\s*\r?\n/);
  assert.equal(blocks.length,40,`${level}: usage groups`);
  blocks.forEach((block,index)=>{
    const [header,...lines]=block.split(/\r?\n/);
    const [title,answer,wrong,connection,explanation]=header.split('::');
    assert.ok(title&&answer&&wrong&&connection&&explanation,header);
    const examples=lines.join('').split('|'), id=`${level}-extra-${String(index+1).padStart(2,'0')}`;
    assert.equal(examples.length,index===39?5:10,header);
    const items=examples.map(sentence=>({id:`${level}-g-${bank.length+1}`,sentence,answer,options:[answer,...wrong.split('/')],hint:title,explanation,pattern:answer,grammarId:id}));
    items.forEach(q=>{q.id=`${level}-g-${bank.length+1}`;bank.push(q);});
    guide.push({id,level,title,pattern:answer,connection,explanation,questionIds:items.map(q=>q.id),examples:examples.map(s=>s.replace('【　】',answer))});
  });
  assert.equal(bank.length,500);
  for(const q of bank){
    assert.equal(q.sentence.split('【　】').length,2,q.id);
    assert.equal(new Set(q.options).size,4,q.id);
    assert.ok(!sentences.has(q.sentence),`Duplicate: ${q.sentence}`);
    sentences.add(q.sentence);
  }
}
fs.writeFileSync(path.join(root,'grammar-data.js'),'/* 原創情境題；分級為學習安排，非官方 JLPT 試題。由 build-grammar.cjs 生成。 */\nwindow.JP_GRAMMAR = '+JSON.stringify(banks,null,2)+';\nwindow.JP_GRAMMAR_GUIDE = '+JSON.stringify(guide,null,2)+';\n');
console.log('Built 1500 unique grammar contexts and 183 usage units; legacy IDs preserved.');
