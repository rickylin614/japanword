// Compare mora sequences, preserving long vowels, geminates and voicing.
const kana=s=>s.normalize('NFKC').replace(/[ァ-ヶ]/gu,c=>String.fromCharCode(c.charCodeAt(0)-96));
function moras(reading){const out=[];for(const c of kana(reading)){if(/[ゃゅょぁぃぅぇぉゎ]/u.test(c)&&out.length)out[out.length-1]+=c;else out.push(c);}return out;}
const unvoice=s=>s.normalize('NFD').replace(/[\u3099\u309a]/gu,'').normalize('NFC');
function distance(a,b){
 a=moras(a);b=moras(b);const insert=x=>(x==='っ'||x==='ー') ? 0.55 : 1;
 let prev=[0];for(const x of b)prev.push(prev.at(-1)+insert(x));
 for(let i=0;i<a.length;i++){const row=[prev[0]+insert(a[i])];for(let j=0;j<b.length;j++){const sub=a[i]===b[j]?0:unvoice(a[i])===unvoice(b[j]) ? 0.35 : 1;row.push(Math.min(prev[j+1]+insert(a[i]),row[j]+insert(b[j]),prev[j]+sub));}prev=row;}
 return Number((prev.at(-1)/Math.max(a.length,b.length)).toFixed(4));
}
function comparison(a,b){
 const x=moras(a),y=moras(b),differences=[];
 for(let i=0;i<Math.max(x.length,y.length);i++)if(x[i]!==y[i])differences.push(`第 ${i+1} 拍「${x[i]||'無'}／${y[i]||'無'}」`);
 return `辨音：${a}＝${x.join('・')}（${x.length} 拍）；${b}＝${y.join('・')}（${y.length} 拍）。差異在${differences.join('、')}。`;
}
function glosses(word,singles){
 const aliases={車:['汽車','車子'],本:['書本'],花:['鮮花','花朵'],犬:['小狗'],猫:['小貓']};
 return [...new Set([...(aliases[word.word]||[]),...word.meaning.replace(/（[^）]*）|\([^)]*\)/gu,'').split(/[；;、\/，,]/u).map(s=>s.trim())])]
  .filter(s=>/^[\u3400-\u9fff]+$/u.test(s)&&s.length<=10&&(s.length>=2||singles.includes(s))).sort((a,b)=>b.length-a.length);
}
function lexicalClass(word){
 const p=word.posCodes[0];
 if(word.category==='verbs')return 'verb';
 if(['n','n-adv','n-t','n-pr'].includes(p))return 'noun';
 if(p==='adj-i')return 'i-adjective';if(p==='adj-na')return 'na-adjective';
 if(p==='adv'||p==='adv-to')return 'adverb';
 if(p==='pn')return 'pronoun';if(p==='adj-pn')return 'adnominal';
 if(p==='int')return 'interjection';
 return null; // Do not turn an affix, counter or interjection into a noun choice.
}
module.exports={kana,moras,distance,comparison,glosses,lexicalClass};
