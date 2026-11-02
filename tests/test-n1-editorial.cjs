const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {resolveFile}=require('../scripts/lib/paths.cjs');
const c={window:{JP_VOCABULARY:{}}};
for(const f of ['n1-data.js','n1-examples.js','grammar-data.js'])vm.runInNewContext(fs.readFileSync(resolveFile(f),'utf8'),c);
const words=Object.values(c.window.JP_VOCABULARY.n1).flat(),bank=c.window.JP_VOCABULARY_EXAMPLES.n1;
const word=term=>words.find(w=>w.word===term),example=term=>bank[word(term).id];
for(const [term,positive,negative] of [
 ['黒字',/盈餘/,/赤字/],['出動',/出動/,/下班/],['購入',/不值得考慮/,/完全不會有問題/],
 ['弁償',/賠償/,/喜歡替換/],['見渡す',/玉米田/,/小麥田/]
]){assert.match(example(term).translation,positive,term);assert.doesNotMatch(example(term).translation,negative,term);}
for(const [term,expected] of [['ひいては',/国全体の発展/],['お使い',/お使いに行った/],['とって',/鍋のとって/],['もてる',/みんなにもてて/],['シック',/シックな色合い/]])assert.match(example(term).sentence,expected,term+' selected sense');
assert.doesNotMatch(word('突く').meaning,/突襲/);assert.doesNotMatch(word('酪農').meaning,/乳酪/);
assert.match(example('ご覧なさい').note,/指示語氣/);
const questions=c.window.JP_GRAMMAR.n1;
assert.ok(questions.some(q=>q.sentence.replace('【　】',q.answer)==='あの本を読んでからというもの、ものの見方が変わった。'));
assert.ok(!questions.some(q=>q.sentence.replace('【　】',q.answer).includes('読んて')));
assert.ok(questions.some(q=>q.sentence.replace('【　】',q.answer)==='経営者として許されるまじき対応だった。'),'まじき must not acquire an unintended double negative');
console.log('PASS: N1 corrected translation polarity, homograph senses, directives, te-connection and criticism tone regressions.');
