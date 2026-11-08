"""Independent reading flags for all added nonverb cases; editorial aid, not semantic proof."""
import json,pathlib,re,unicodedata
from fugashi import Tagger
import unidic_lite
root=pathlib.Path(__file__).resolve().parents[2]
words=json.loads((root/'artifacts/word-guides/words.json').read_text(encoding='utf8'))
tagger=Tagger('-d "'+unidic_lite.DICDIR+'"')
def norm(s):
 s=unicodedata.normalize('NFKC',s)
 s=''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in s)
 s=re.sub('([おこごそぞとどのほぼぽもよろをぉょ])う',r'\1ー',s)
 s=re.sub('([えけげせぜてでねへべぺめれぇ])い',r'\1ー',s)
 return s.replace('を','お')
flags=[];checked=0
for level in ['n5','n4','n3','n2','n1']:
 guides=json.loads((root/f'data/vocabulary/guides/{level}.json').read_text(encoding='utf8'))
 for w in (w for w in words if w['level']==level):
  for e in guides[w['id']].get('usageExamples',[]):
   checked+=1;s=e['sentence'];target=e['surface'];a=s.index(target);b=a+len(target);cursor=0;tokens=[];aligned=True
   for token in tagger(s):
    x=s.find(token.surface,cursor);y=x+len(token.surface);cursor=y
    if x<b and y>a:
     if x<a or y>b:aligned=False
     tokens.append(token)
   actual=''.join(t.feature.kana or t.surface for t in tokens)
   if not aligned or norm(actual)!=norm(e['reading']):flags.append(dict(level=level,id=w['id'],word=w['word'],lemmaReading=w['reading'],**e,analyzer=actual,aligned=aligned))
report={'checked':checked,'flags':flags}
(root/'artifacts/word-guides/morphology.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'checked':checked,'flags':len(flags)}))
