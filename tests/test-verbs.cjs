const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../scripts/lib/paths.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {forms}=require('../scripts/build/build-verbs.cjs');
const examples=[
 ['行く','v5k-s',['行きます','行って','行かない','行った']],
 ['来る','vk',['来ます','来て','来ない','来た']],
 ['くる','vk',['きます','きて','こない','きた']],
 ['する','vs-i',['します','して','しない','した']],
 ['する','v5r',['すります','すって','すらない','すった']],
 ['愛する','vs-s',['愛します','愛して','愛さない','愛した']],
 ['あいする','vs-s',['あいします','あいして','あいさない','あいした']],
 ['接する','vs-s',['接します','接して','接しない','接した']],
 ['関する','vs-s',['関します','関して','関しない','関した']],
 ['属する','vs-s',['属します','属して','属さない','属した']],
 ['応ずる','vz',['応じます','応じて','応じない','応じた']],
 ['おうずる','vz',['おうじます','おうじて','おうじない','おうじた']],
 ['在る','v5r-i',['在ります','在って','ない','在った']],
 ['問う','v5u-s',['問います','問うて','問わない','問うた']],
 ['うる','v2a-s',['えます','えて','えない','えた']],
 ['くださる','v5aru',['くださいます','くださって','くださらない','くださった']],
 ['帰る','v5r',['帰ります','帰って','帰らない','帰った']],
 ['食べる','v1',['食べます','食べて','食べない','食べた']],
 ['泳ぐ','v5g',['泳ぎます','泳いで','泳がない','泳いだ']],
 ['読む','v5m',['読みます','読んで','読まない','読んだ']],
 ['話す','v5s',['話します','話して','話さない','話した']]
];
for(const [w,p,expected] of examples)assert.deepEqual(forms(w,p),expected,w);
const context={window:{JP_VOCABULARY:{}}};const audit=JSON.parse(fs.readFileSync(resolveFile('sources/verb-conjugation-audit.json')));
for(const [level,count] of Object.entries({n3:374,n4:159,n5:109})){
 vm.runInNewContext(fs.readFileSync(resolveFile(level+'-data.js'),'utf8'),context);
 const bank=context.window.JP_VOCABULARY[level].verbs;assert.equal(audit[level].length,count);
 assert.equal(new Set(audit[level].map(w=>w.id)).size,count);
 assert.deepEqual(audit[level].map(w=>w.id),Array.from(bank,w=>w.id));
 for(const w of audit[level]){const source=bank.find(b=>b.id===w.id);assert.equal(w.word,source.word);assert.equal(w.reading,source.reading);for(const f of Object.values(w.forms)){assert.ok(f.written);assert.match(f.reading,/^[ぁ-ゖー]+$/);}}
}
console.log('PASS: 642 verbs match category IDs exactly; godan, ichidan, special suru, irregular, honorific and kana inflections verified.');
