"""Editorial aid: inspect verb context overlap and independent token readings.
Requires fugashi and unidic_lite. Reports are candidates for human/AI review,
not automatic evidence that Japanese or translations are correct.
"""
import json, pathlib, re, subprocess, unicodedata
from difflib import SequenceMatcher
from fugashi import Tagger
import unidic_lite
root = pathlib.Path(__file__).resolve().parents[2]
out = root/'artifacts/verb-context-review'
out.mkdir(parents=True, exist_ok=True)
snapshot = r"""
const fs=require('fs'),vm=require('vm');const c={window:{JP_VOCABULARY:{}}};const rows=[];
for(const l of ['n5','n4','n3','n2','n1']){for(const s of ['data','examples'])vm.runInNewContext(fs.readFileSync('public/assets/data/'+l+'-'+s+'.js','utf8'),c);for(const w of c.window.JP_VOCABULARY[l].verbs)rows.push({...w,level:l,examples:c.window.JP_VOCABULARY_EXAMPLES[l][w.id].variants});}
console.log(JSON.stringify(rows));
"""
rows=json.loads(subprocess.check_output(['node','-e',snapshot],cwd=root,encoding='utf8'))
tagger=Tagger('-d "'+unidic_lite.DICDIR+'"')
def norm(s):
    return ''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in unicodedata.normalize('NFKC',s or ''))
def nouns(s):
    return {t.feature.orthBase or t.surface for t in tagger(s) if t.feature.pos1 in ['名詞','代名詞'] and t.feature.pos2 not in ['非自立可能','数詞']}
flags=[]; readings=[]; details=[]
for w in rows:
    examples=w['examples']; contexts=[]
    for e in examples:
        s=e['sentence'];surface=e['surface'];start=s.find(surface);end=start+len(surface)
        context=s[:start]+s[end:];contexts.append(context)
        cursor=0;tokens=[];aligned=True
        for t in tagger(s):
            a=s.find(t.surface,cursor);b=a+len(t.surface);cursor=b
            if a<end and b>start:
                tokens.append(t)
                if a<start or b>end:aligned=False
        actual=''.join(t.feature.kana or t.surface for t in tokens)
        if e.get('reading') and (not aligned or norm(e['reading'])!=norm(actual)):
            readings.append(dict(level=w['level'],id=w['id'],word=w['word'],kind=e['kind'],surface=surface,expected=e['reading'],actual=actual,aligned=aligned,sentence=s))
    for i,j in [(0,1),(0,2),(1,2)]:
        ratio=SequenceMatcher(None,contexts[i],contexts[j]).ratio()
        a,b=nouns(contexts[i]),nouns(contexts[j]);union=a|b;similar=len(a&b)/len(union) if union else 0
        if ratio>.57 or (similar>=.65 and a and b):
            flags.append(dict(level=w['level'],id=w['id'],word=w['word'],pair=[i,j],ratio=round(ratio,3),nouns=[sorted(a),sorted(b)],sentences=[examples[i]['sentence'],examples[j]['sentence']]))
    details.append(dict(id=w['id'],level=w['level'],word=w['word'],nouns=[sorted(nouns(c)) for c in contexts]))
report=dict(checkedVerbs=len(rows),checkedExamples=len(rows)*3,overlapCandidates=flags,readingCandidates=readings,contexts=details)
(out/'context-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(dict(verbs=len(rows),examples=len(rows)*3,overlapCandidates=len(flags),readingCandidates=len(readings)),ensure_ascii=False))
