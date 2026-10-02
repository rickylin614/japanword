const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const load=file=>{const c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),c);return JSON.parse(JSON.stringify(c.window));};
const {JP_GRAMMAR:banks,JP_GRAMMAR_GUIDE:guide}=load('grammar-data.js'), legacy=load('grammar-source/legacy-grammar.js').JP_GRAMMAR;
const ids=new Set(),sentences=new Set(),members=new Set();
assert.equal(guide.length,183);
assert.equal(new Set(guide.map(g=>g.id)).size,183);
for(const [level,bank] of Object.entries(banks)){
  assert.equal(bank.length,500);assert.equal(guide.filter(g=>g.level===level).length,61);
  for(let i=0;i<105;i++){const {grammarId,...q}=bank[i];assert.deepEqual(q,legacy[level][i],`${level} legacy ${i}`);}
  for(const [i,q] of bank.entries()){
    assert.equal(q.id,`${level}-g-${i+1}`);assert.ok(!ids.has(q.id));ids.add(q.id);
    assert.ok(!sentences.has(q.sentence));sentences.add(q.sentence);
    assert.equal(q.sentence.split('【　】').length,2);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);
    assert.equal(q.options.filter(a=>a===q.answer).length,1);assert.ok(q.hint&&q.explanation&&q.grammarId);
    const full=q.sentence.replace('【　】',q.answer);
    assert.ok(!/(?:んて|んたら|とようと|ろようと|もようと)/.test(full),q.id+': '+full);
  }
}
for(const g of guide){
  assert.ok(g.title&&g.connection&&g.explanation);assert.ok([5,10].includes(g.questionIds.length));
  assert.equal(g.examples.length,g.questionIds.length);
  g.questionIds.forEach((id,i)=>{assert.ok(!members.has(id));members.add(id);const q=banks[g.level].find(q=>q.id===id);assert.ok(q);assert.equal(q.grammarId,g.id);assert.equal(q.sentence.replace('【　】',q.answer),g.examples[i]);});
}
assert.equal(members.size,1500);
console.log('PASS: 1500 unique questions, 183 linked usage units, options/blanks/conjugation regressions, all 315 original questions unchanged.');
