/* Derive quiz CSVs from the exact published vocabulary banks, never from spelling guesses. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
function forms(text,type){
  const stem=text.slice(0,-1);
  if(type==='vk')return text==='来る'?['来ます','来て','来ない','来た']:['きます','きて','こない','きた'];
  if(type==='vs-i')return ['します','して','しない','した'];
  if(type==='v2a-s')return text==='得る'?['得ます','得て','得ない','得た']:['えます','えて','えない','えた'];
  if(['v1','v1-s'].includes(type)){assert.ok(text.endsWith('る'),text);return ['ます','て','ない','た'].map(s=>stem+s);}
  const endings={う:['い','わ','って'],く:['き','か','いて'],ぐ:['ぎ','が','いで'],す:['し','さ','して'],つ:['ち','た','って'],ぬ:['に','な','んで'],ぶ:['び','ば','んで'],む:['み','ま','んで'],る:['り','ら','って']};
  assert.ok(type.startsWith('v5')&&endings[text.at(-1)],`${text}: unsupported ${type}`);
  let [i,a,te]=endings[text.at(-1)];
  if(type==='v5k-s')te='って';
  if(type==='v5u-s')te='うて';
  if(type==='v5aru')i='い';
  const neg=type==='v5r-i'?'ない':stem+a+'ない';
  return [stem+i+'ます',stem+te,neg,stem+te.replace(/て$/,'た').replace(/で$/,'だ')];
}
function build(){
  const context={window:{JP_VOCABULARY:{}}},audit={};
  for(const level of ['n3','n4','n5']){
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,level+'-data.js'),'utf8'),context);
    const bank=context.window.JP_VOCABULARY[level].verbs;
    const rows=[['id','動詞','中文','發音','ます形','て形','ない型','た形','異寫','活用類別']];
    audit[level]=[];
    for(const w of bank){
      const types=w.posCodes.filter(p=>p.startsWith('v')&&!['vi','vt'].includes(p));assert.equal(types.length,1,w.id);
      const type=types[0];
      // Published dictionary spellings omit okurigana in these entries; retain the lemma, expand in inflections.
      const spelling=({'落る':'落ちる','楽む':'楽しむ'})[w.word]||w.word;
      const written=forms(spelling,type),kana=forms(w.reading,type);
      const values=written.map((s,i)=>s===kana[i]?s:`${s}(${kana[i]})`);
      rows.push([w.id,w.word,w.meaning,w.reading,...values,w.aliases.join('|'),type]);
      audit[level].push({id:w.id,word:w.word,reading:w.reading,posCode:type,forms:Object.fromEntries(['masu','te','nai','ta'].map((k,i)=>[k,{written:written[i],reading:kana[i]}]))});
    }
    const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
    fs.writeFileSync(path.join(__dirname,level+'.csv'),csv);
    console.log(`${level}: ${bank.length} verbs aligned with published category`);
  }
  fs.writeFileSync(path.join(__dirname,'sources/verb-conjugation-audit.json'),JSON.stringify(audit,null,2)+'\n');
}
module.exports={forms,build};if(require.main===module)build();
