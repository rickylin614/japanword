"""Flag N1 example surface/reading mismatches with an independent Japanese analyzer.
This is an editorial aid; a clean report is not proof of translation accuracy.
"""
import json, pathlib, re, unicodedata, subprocess
from fugashi import Tagger
import unidic_lite
root = pathlib.Path(__file__).resolve().parents[2]
review_dir = root/'artifacts/n1-review'
review_dir.mkdir(parents=True, exist_ok=True)
snapshot = """
const fs=require('fs'),vm=require('vm');const c={window:{JP_VOCABULARY:{}}};
for(const f of ['n1-data','n1-examples'])vm.runInNewContext(fs.readFileSync('public/assets/data/'+f+'.js','utf8'),c);
const {collect}=require('./scripts/audio/vocabulary-speech-plan.cjs');const pronunciation={};
for(const clip of collect().clips)for(const r of clip.refs)if(r.level==='n1'&&r.wordId)pronunciation[r.wordId+':'+r.index]=r.pronunciation;
console.log(JSON.stringify({words:Object.values(c.window.JP_VOCABULARY.n1).flat(),examples:c.window.JP_VOCABULARY_EXAMPLES.n1,pronunciation}));
"""
data = json.loads(subprocess.check_output(['node','-e',snapshot], cwd=root, encoding='utf8'))
tagger = Tagger('-d "' + unidic_lite.DICDIR + '"')
def norm(s):
    s = unicodedata.normalize('NFKC', s or '')
    s = ''.join(chr(ord(c)-96) if 'ァ' <= c <= 'ヶ' else c for c in s)
    s = re.sub('([おこごそぞとどのほぼぽもよろをぉょ])う', r'\1ー', s)
    s = re.sub('([えけげせぜてでねへべぺめれぇ])い', r'\1ー', s)
    return s.replace('を','お')
flags=[]
checked=0
for w in data['words']:
    base=data['examples'][w['id']]
    for i,e in enumerate(base.get('variants',[base])):
        checked+=1
        target=e['surface'];sentence=e['sentence'];start=sentence.find(target);end=start+len(target)
        cursor=0;tokens=[];aligned=True
        for token in tagger(sentence):
            a=sentence.find(token.surface,cursor);b=a+len(token.surface);cursor=b
            if a < end and b > start:
                if a < start or b > end: aligned=False
                tokens.append(token)
        expected=data['pronunciation'].get(w['id']+':'+str(i))
        actual=''.join(t.feature.kana or t.surface for t in tokens)
        if expected and aligned and norm(expected)!=norm(actual):
            flags.append(dict(id=w['id'],word=w['word'],reading=w['reading'],kind=e.get('kind','common'),surface=target,expected=expected,analyzer=actual,sentence=sentence,translation=e['translation']))
        elif expected and not aligned:
            flags.append(dict(id=w['id'],word=w['word'],kind=e.get('kind','common'),surface=target,expected=expected,analyzer='partial-token',sentence=sentence,translation=e['translation']))
report={'checked':checked,'flags':flags}
(root/'artifacts/n1-review/morphology.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'checked':checked,'flags':len(flags)},ensure_ascii=False))
# Detailed candidates stay in the ignored report, avoiding a several-page dump.
