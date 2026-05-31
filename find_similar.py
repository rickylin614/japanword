import csv
from collections import defaultdict
import re

with open('n3.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Find duplicates or similarities
meanings = defaultdict(list)
for i, row in enumerate(rows):
    # normalize meaning: remove punctuation
    m = re.sub(r'[、／/（）\(\)]', ' ', row['中文']).strip()
    words = [w for w in m.split() if w]
    for w in words:
        meanings[w].append(i)

# Find indices that share meaning words and appear multiple times
similar_groups = defaultdict(set)
for w, indices in meanings.items():
    if len(indices) > 1 and len(w) > 1: # ignore single char overlapping like "的"
        # store the exact indices that share this word
        for idx in indices:
            similar_groups[w].add(idx)

# Let's print out what we found
for w, indices in similar_groups.items():
    print(f"Shared word: {w}")
    for idx in indices:
        print(f"  - {rows[idx]['動詞']}: {rows[idx]['中文']} ({rows[idx]['發音']})")

