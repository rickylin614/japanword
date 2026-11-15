"""Freeze vocabulary-checked listening candidates. JLPT levels follow the project's pinned word lists.
Review helper: PYTHONPATH=<fugashi/unidic_lite> python scripts/review/grade-listening.py
"""
import json,pathlib,re,unicodedata,hashlib,random,subprocess,sys
from fugashi import Tagger
import unidic_lite
root=pathlib.Path(__file__).resolve().parents[2]
all_candidates='--legacy-selection' not in sys.argv
previous=json.loads((root/'data/listening/approved-sentences.json').read_text(encoding='utf8')) if '--preserve-selection' in sys.argv else None
snapshot="""
const fs=require('fs'),vm=require('vm'),c={window:{JP_VOCABULARY:{}}};
for(const l of ['n5','n4','n3','n2','n1'])for(const suffix of ['data','examples'])vm.runInNewContext(fs.readFileSync('public/assets/data/'+l+'-'+suffix+'.js','utf8'),c);
console.log(JSON.stringify(c.window));
"""
d=json.loads(subprocess.check_output(['node','-e',snapshot],cwd=root,encoding='utf8'))
tag=Tagger('-d "'+unidic_lite.DICDIR+'"')
levels=['n5','n4','n3','n2','n1'];closed={'助詞','助動詞','補助記号','記号','空白'}
def norm(s):
 s=unicodedata.normalize('NFKC',s).split('-')[0]
 return ''.join(chr(ord(c)-96) if 'ァ'<=c<='ヶ' else c for c in s)
def digest(p):return hashlib.sha256(p.read_text(encoding='utf8').replace('\r\n','\n').encode()).hexdigest()
allowed={};forms={};result={'schemaVersion':1,'policy':'Cumulative pinned project vocabulary: N5 only; N4 includes N5; through N1. Particles, auxiliaries, punctuation and numeric literals are grammatical primitives. Unmatched lexical tokens are rejected.','analyzer':'Fugashi 1.5.2 / UniDic-lite 1.0.8','sourceHashes':{},'levels':{}}
result['sourceHashes']['scripts/review/grade-listening.py']=digest(pathlib.Path(__file__))
for level in levels:
 words=[w for rows in d['JP_VOCABULARY'][level].values() for w in rows]
 for w in words:
  ref={'level':level,'wordId':w['id']}
  for s in [w['word']]:
   forms.setdefault(s,ref);allowed.setdefault(norm(s),ref)
  ts=list(tag(w['word']))
  if len(ts)==1:
   lemma=norm(ts[0].feature.lemma or w['word'])
   kanji=set(re.findall('[一-龯]',w['word']))
   if not kanji or kanji & set(re.findall('[一-龯]',lemma)):allowed.setdefault(lemma,ref)
 for f in [level+'-data.js',level+'-examples.js']:
  result['sourceHashes']['public/assets/data/'+f]=digest(root/'public/assets/data'/f)
 def check(s):
  ts=list(tag(s));proof=[];unknown=[];i=0
  while i<len(ts):
   t=ts[i]
   if t.feature.pos1 in closed or re.fullmatch('[0-9０-９]+',t.surface):
    proof.append({'surface':t.surface,'type':'grammar' if t.feature.pos1 in closed else 'number','pos':t.feature.pos1});i+=1;continue
   matched=False
   for j in range(min(len(ts),i+8),i,-1):
    text=''.join(x.surface for x in ts[i:j])
    if text in forms:
     proof.append({'surface':text,'type':'vocabulary',**forms[text]});i=j;matched=True;break
   if matched:continue
   candidates=[norm(t.surface),norm(t.feature.lemma or t.surface),norm(t.feature.orthBase or t.surface)]
   kanji=set(re.findall('[一-龯]',t.surface))
   key=next((k for k in candidates if k in allowed and (not kanji or kanji & set(re.findall('[一-龯]',k)))),None)
   if key is not None:
    proof.append({'surface':t.surface,'lemma':t.feature.lemma,'type':'vocabulary',**allowed[key]});i+=1;continue
   unknown.append(t.surface);i+=1
  return proof,unknown
 # Negative probes guard the level boundary, including homophonic spellings.
 if level=='n5':
  assert not check('電車で学校へ行きます。')[1]
  assert check('革命が起きました。')[1], 'N1 vocabulary leaked into N5'
 if level=='n4':
  assert check('付いて来てください。')[1], '付く must not be admitted through 点く'
  assert check('主権を守ります。')[1], 'N1 vocabulary leaked into N4'
 if level in ['n3','n2']:
  assert check('主権を守ります。')[1], 'N1 vocabulary leaked into lower level'
 assert check('qxzvを見ます。')[1], 'Unknown vocabulary must be rejected'
 accepted=[];seen=set();rejected=0
 # Revalidate the pinned transcripts and remap their indexes when card variants
 # are inserted. Never silently replace the learner's existing question bank.
 if previous:
  for old in previous['levels'][level]:
   b=d['JP_VOCABULARY_EXAMPLES'][old['sourceLevel']][old['wordId']]
   es=b.get('variants',[b]+b.get('usageExamples',[]))
   matches=[(ix,e) for ix,e in enumerate(es) if e['sentence']==old['transcript'] and e['translation']==old['translation']]
   assert len(matches)==1,(level,old['transcript'],'pinned example changed')
   ix,e=matches[0];proof,unknown=check(e['sentence'])
   assert not unknown,(level,e['sentence'],unknown)
   accepted.append({**old,'index':ix,'proof':proof})
  assert len(accepted)==len(previous['levels'][level])
  result['levels'][level]=accepted
  print(level,len(accepted),'pinned sentences revalidated and indexes remapped')
  continue
 # Prefer this level's examples; only backfill N4 with checked lower-level sentences.
 # A page's label is not a sentence's lexical grade. For N5, also inspect
 # other pages, while the same strict N5-only vocabulary gate still applies.
 sources=([level]+[x for x in levels if x!=level] if level=='n5' else [level]+(['n5'] if level=='n4' else [])) if all_candidates else [level]+list(reversed(levels[:levels.index(level)]))
 for src in sources:
  ws=[w for rows in d['JP_VOCABULARY'][src].values() for w in rows]
  pool=[]
  for w in ws:
   b=d['JP_VOCABULARY_EXAMPLES'][src][w['id']]
   for ix,e in enumerate(b.get('variants',[b]+b.get('usageExamples',[]))):
    s=e['sentence']
    if s in seen:continue
    seen.add(s);proof,unknown=check(s)
    if unknown:rejected+=1;continue
    pool.append({'sourceLevel':src,'wordId':w['id'],'index':ix,'transcript':s,'translation':e['translation'],'proof':proof})
  random.Random(20261109+levels.index(level)).shuffle(pool)
  accepted.extend(pool if all_candidates else pool[:500-len(accepted)])
  if not all_candidates and len(accepted)>=500:break
 assert len(accepted)>0 if all_candidates else len(accepted)==500,(level,len(accepted))
 result['levels'][level]=accepted
 print(level, len(accepted),'approved sentences;',rejected,'rejected while selecting')
(root/'data/listening/approved-sentences.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
