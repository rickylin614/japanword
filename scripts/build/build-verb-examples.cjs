const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {resolveFile} = require('../lib/paths.cjs');
const {forms} = require('./build-verbs.cjs');
const levels = ['n5','n4','n3','n2','n1'];
// Each context is a complete, independently edited sentence, keyed by stable ID.
const contexts = new Map();
const spelling = {'来る@きたる#1591270':'来たる','口吟む':'口ずさむ','損う':'損なう','交す':'交わす','落る':'落ちる','楽む':'楽しむ','終る':'終わる','曲る':'曲がる','落す':'落とす','下る@さがる':'下がる','下す@おろす':'下ろす','押える':'押さえる','代る':'代わる','剥す':'剥がす','反る@かえる':'かえる','する@する#1298670':'刷る','為る@する':'する','為る@なる':'なる','浮ぶ':'浮かぶ','落着く':'落ち着く','引受る':'引き受ける','付合う':'付き合う'};
for (const level of levels) {
  const c = {window:{JP_VOCABULARY:{}}};
  vm.runInNewContext(fs.readFileSync(resolveFile(level+'-data.js'),'utf8'),c);
  const words = c.window.JP_VOCABULARY[level].verbs;
  const source = JSON.parse(fs.readFileSync(resolveFile('vocabulary-examples','verbs-'+level+'.json'),'utf8'));
  assert.deepEqual(Object.keys(source).sort(),Array.from(words,w=>w.id).sort(),level+' verb source coverage');
  for (const word of words) {
    const row = source[word.id];
    const type = word.posCodes.find(p=>p.startsWith('v')&&!['vi','vt'].includes(p));
    const lemma = spelling[word.word+'@'+word.reading+'#'+word.jmdictId]||spelling[word.word+'@'+word.reading]||spelling[word.word]||word.word;
    const expected = {dictionary:[lemma,word.reading],te:[forms(lemma,type)[1],forms(word.reading,type)[1].replace(/[ァ-ヶ]/gu,c=>String.fromCharCode(c.charCodeAt(0)-96))]};
    for (const kind of ['dictionary','te',...(row.common?['common']:[])]) {
      const e = row[kind];
      assert.ok(e?.surface&&e.sentence?.includes(e.surface)&&e.translation&&e.reading,word.id+' incomplete '+kind);
      assert.match(e.sentence,/[。？！][」』]?$/u,word.id);
      assert.match(e.translation,/[\u3400-\u9fff]/u,word.id);
      assert.ok(!/[<>|\n\t{}]/u.test(e.sentence+e.translation),word.id+' source artifacts');
      if (expected[kind]) {
        assert.equal(e.surface,expected[kind][0],word.id+' '+kind+' conjugation');
        assert.equal(e.reading,expected[kind][1],word.id+' '+kind+' reading');
      }
    }
    // Prevent the old shared-prefix dictionary/te template from returning.
    assert.notEqual(row.dictionary.sentence.split(row.dictionary.surface)[0],row.te.sentence.split(row.te.surface)[0],word.id+' shared sentence frame');
    contexts.set(word.id,row);
  }
}
function contextFor(word) {
  const row=contexts.get(word.id);
  assert.ok(row,'Missing authored verb contexts: '+word.id);
  return row;
}
function examplesFor(word) {
  const row=contextFor(word);
  return [['dictionary','原型'],['te','て形']].map(([kind,label])=>({kind,label,form:row[kind].surface,...row[kind]}));
}
function commonFor(word) {const e=contextFor(word).common;return e?{...e}:undefined;}
module.exports={examplesFor,commonFor};
if(require.main===module) console.log(contexts.size+' verbs: complete independent contexts, conjugations and readings checked.');
