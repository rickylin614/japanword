const assert=require('node:assert/strict');
const {targetReading,collect}=require('../scripts/audio/vocabulary-speech-plan.cjs');
for(const [word,reading,type,surface,expected] of [
 ['明かす','あかす','v5s','明かさ','あかさ'],
 ['誤る','あやまる','v5r','誤っ','あやまっ'],
 ['受かる','うかる','v5r','受かり','うかり'],
 ['歩む','あゆむ','v5m','歩ん','あゆん'],
 ['生ける','いける','v1','生け','いけ'],
 ['来る','くる','vk','来ません','きません'],
 ['快い','こころよい','adj-i','快く','こころよく']
]){
 const w={word,reading,category:type==='adj-i'?'i_adjectives':'verbs',posCodes:[type]};
 assert.equal(targetReading(w,{surface,evidence:{reading}},{}),expected,word+' inflection must not use lemma reading');
}
assert.equal(targetReading({word:'箇条書',reading:'かじょうがき',posCodes:['n'],aliases:[]},{surface:'箇条書き',reading:'かじょうがき'},{}),'かじょうがき');
const plan=collect();
const shared=plan.clips.find(c=>c.refs.some(r=>r.level==='n1'&&r.sentence==='床の塵を、ほうきと塵取りで集めた。'));
assert.equal(shared.input,'床のちりを、ほうきとちりとりで集めた。','Shared examples must retain both reviewed target readings');
for(const text of ['焦らなくてもいいですよ。','誤って洗剤を飲んでしまいました。']){
 const ref=plan.clips.flatMap(c=>c.refs.map(r=>({c,r}))).find(({r})=>r.level==='n1'&&r.sentence===text);
 assert.ok(ref,text);
 assert.ok(!ref.c.input.includes('あせるなく')&&!ref.c.input.includes('あやまるて'),ref.c.input);
}
console.log('PASS: corpus lemma readings preserve inflected verb/adjective pronunciation and explicit surface readings.');
