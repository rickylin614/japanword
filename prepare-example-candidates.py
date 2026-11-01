"""Offline authoring aid, not a runtime or publishing dependency.

Usage: python prepare-example-candidates.py <working-directory>
Inputs: words.json (published vocabulary), pairs-expanded.json (Tatoeba exports).
Dependencies: fugashi==1.5.2, unidic-lite==1.0.8,
opencc-python-reimplemented==0.1.7. Outputs are candidates, not approved examples.
No substring-only matches: Japanese morphology/reading and Chinese meaning
anchors are retained as evidence for editorial selection and correction.
"""
import sys, pathlib, json, re, unicodedata, collections
from fugashi import Tagger
import unidic_lite
from opencc import OpenCC

root = pathlib.Path(sys.argv[1])
data = json.loads((root / 'words.json').read_text(encoding='utf8'))
pairs_file = root / 'pairs-expanded.json'
if not pairs_file.exists(): pairs_file = root / 'pairs.json'
pairs = json.loads(pairs_file.read_text(encoding='utf8'))
tagger = Tagger('-d "' + unidic_lite.DICDIR + '"')
convert = OpenCC('s2twp')

def norm(s):
    if not s: return ''
    return ''.join(chr(ord(c)-96) if 'ァ' <= c <= 'ヶ' else c for c in unicodedata.normalize('NFKC',s))

words = {}
for level in ['n4','n3','n2']:
    for bank in data['JP_VOCABULARY'][level].values():
        for w in bank: words[w['id']] = w
by_form = collections.defaultdict(list)
for w in words.values():
    if w.get('affix') or len(w['word']) < 2: continue
    by_form[norm(w['word'])].append(w)

def anchors(w):
    gloss = re.sub(r'（[^）]*）|\([^)]*\)', '', w['meaning'])
    result=[]
    for p in re.split(r'[；;、／/，,]',gloss):
        p = p.strip('…～~的地； ')
        if len(p) >= 2:
            result.append(p)
            if len(p)>4:result.extend(p[i:i+2] for i in range(len(p)-1))
    return result

def pos_matches(w, feature):
    # A noun such as 決まり must not be matched to 決まります's verb stem.
    nominal = w['category']=='nouns' or (w['category']=='others' and any(p in ['n','n-adv','n-t'] for p in w['posCodes']))
    independent_verb = any(re.match(r'^(?:v[1-9]|vk$|vz$|vs-i$|vs-s$|vs-c$|v-unspec$)',p) for p in w['posCodes'])
    if nominal and feature.pos1 in ['動詞','形容詞','助動詞'] and not independent_verb: return False
    if w['category']=='verbs':
        if feature.pos1 != '動詞': return False
        if any(p.startswith('v5') for p in w['posCodes']) and '五段' not in (feature.cType or ''): return False
        if 'v1' in w['posCodes'] and '一段' not in (feature.cType or ''): return False
    return True

word_anchors={key: anchors(w) for key,w in words.items()}
results = collections.defaultdict(list)
token_cache = {}
for pair in pairs:
    ja = pair['ja']; zh = convert.convert(pair['zh'])
    if not 7 <= len(ja) <= 60 or not 3 <= len(zh) <= 75: continue
    if not re.search('[ぁ-ゖ]',ja) or not re.search('[。？！!?]$',ja): continue
    if any(c in ja+zh for c in ['\n','\t','|','<','>']): continue
    if ja not in token_cache:
        tokens = list(tagger(ja)); found={}
        for i,t in enumerate(tokens):
            f=t.feature
            # UniDic lemmas merge spellings/senses (e.g. 治る/直る).
            # Keep the observed spelling's base, never silently substitute a lemma.
            forms=[f.orthBase]
            for form in forms:
                for w in by_form.get(norm(form),[]):
                    if not pos_matches(w,f):continue
                    if f.pos2=='固有名詞' and w['word'] not in ['アジア','アフリカ','ヨーロッパ','アメリカ','イギリス']:continue
                    if norm(w['reading']) == norm(f.kanaBase):
                        found[w['id']]={'surface':t.surface,'reading':w['reading'],'lemma':form,'method':'lemma+reading'}
            surface='';reading=''
            for u in tokens[i:i+7]:
                surface += u.surface
                reading += u.feature.kana or u.surface
                for w in by_form.get(norm(surface),[]):
                    if not pos_matches(w,t.feature):continue
                    if t.feature.pos2=='固有名詞' and w['word'] not in ['アジア','アフリカ','ヨーロッパ','アメリカ','イギリス']:continue
                    if 'conj' in w['posCodes'] and (surface!=t.surface or t.feature.pos1!='接続詞'):continue
                    if norm(reading)==norm(w['reading']) and (not re.fullmatch('[ァ-ヶー]+',w['word']) or re.fullmatch('[ァ-ヶー]+',surface)):
                        found[w['id']]={'surface':surface,'reading':w['reading'],'lemma':w['word'],'method':'token-boundaries+reading'}
        token_cache[ja]=found
    for key,evidence in token_cache[ja].items():
        matched=[a for a in word_anchors[key] if a in zh]
        # Keep unanchored alternatives for manual translation, never auto-approve.
        score=abs(len(ja)-21)+abs(len(zh)-16)*0.3
        score+= 18 if re.search('トム|メアリー|ジョン|アメリカ',ja) else 0
        score+= 10 if pair.get('pivotId') else 0
        score+= 5 if any(c in ja for c in ['「','『','"']) else 0
        score-= 45 if matched else 0
        results[key].append(dict(pair,translation=zh,evidence=evidence,anchors=matched,score=round(score,2)))
for key, candidates in results.items():
    unique={}
    for c in sorted(candidates,key=lambda c:(c['score'],int(c['jaId']))):
        if c['ja'] not in unique: unique[c['ja']]=c
    results[key]=list(unique.values())[:5]
(root/'candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({level:{'total':sum(len(b) for b in data['JP_VOCABULARY'][level].values()),'candidates':sum(1 for key in results if key.startswith(level+'-')),'anchored':sum(1 for key,cs in results.items() if key.startswith(level+'-') and any(c['anchors'] for c in cs))} for level in ['n4','n3','n2']}))
