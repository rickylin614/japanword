import csv
from collections import defaultdict
import re
import json

def categorize_verb(verb, kana):
    if not verb.endswith('る'):
        if verb.endswith('す'):
            return "他動詞"
        return "自動詞/他動詞"
    else:
        # Check kana before る
        if len(kana) >= 2:
            pre_ru = kana[-2]
            # typical transitive vs intransitive rules for e-ru vs a-ru
            # e.g. 決まる (a-ru, 自) vs 決める (e-ru, 他)
            ie_row = list('いきしちにひみりゐえけせてねへめれゑげぜでべぺぎじぢびぴ')
            if pre_ru in ie_row:
                return "通常為他動詞(下/上一段)"
            else:
                return "通常為自動詞(五段)"
        return "動詞"

def main():
    with open('n3.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    meanings = defaultdict(list)
    for i, row in enumerate(rows):
        m = re.sub(r'[、／/（）\(\)]', ' ', row['中文']).strip()
        words = [w for w in m.split() if w]
        for w in words:
            meanings[w].append(i)

    # find overlapping meanings
    similar_groups = defaultdict(set)
    for w, indices in meanings.items():
        if len(indices) > 1 and len(w) > 1:
            for idx in indices:
                similar_groups[w].add(idx)
    
    # Let's just create the final output string replacing the `中文` field
    # We will append (他動詞) or (自動詞) or (發音: xx)
    # But for a robust approach, if we find any word that shares a meaning word with another
    # We will modify its 中文
    
    indices_to_modify = set()
    for indices in similar_groups.values():
        indices_to_modify.update(indices)
        
    for idx in indices_to_modify:
        v = rows[idx]['動詞']
        k = rows[idx]['發音']
        # to avoid double tagging
        if '(發音:' not in rows[idx]['中文']:
            rows[idx]['中文'] = f"{rows[idx]['中文']} (發音: {k})"

    # write back to n3_annotated.csv
    with open('n3_annotated.csv', 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print("Annotated n3_annotated.csv created.")

if __name__ == '__main__':
    main()
