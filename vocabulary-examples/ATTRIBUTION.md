# Vocabulary example provenance

The four example banks cover every published N2–N5 vocabulary ID. They are separate from the JMdict-derived vocabulary definitions. These are learning examples, not official JLPT questions or externally certified example sentences.

## Original additions and corrections

`n5.txt`, `n4.txt`, `n3.txt`, and `n2.txt` contain the project's authored additions and corrections. Targets include the dictionary spelling, an explicit reading for homographs, and the actual inflected form when necessary. Several compatible words may share a sentence. Completeness counts are vocabulary entries, not claims of an equal number of unique sentences.

`verbs-n5.txt` through `verbs-n2.txt` contain the project's original, verb-specific contexts and Chinese translations for dictionary and te-form examples. `build-verb-examples.cjs` derives the exact forms/readings, with explicit level-specific contexts where a shared dictionary entry has different selected meanings. These additions cover all 934 published verb entries. The third, common-usage example retains the original authored/corpus sentence and its attribution. All three examples are different within each verb card; cross-level overlap is counted as entries rather than unique sentences. Common usage is an editorial learning choice, not a corpus frequency claim.

Particular corrections include ベル as a bell rather than a person's name, 大家 as a landlord rather than an authority, 抱く（いだく）as holding a hope, 直る as a repaired object, そば as noodles, 塩辛 as fermented seafood, あらわす as writing a book, しめる as becoming damp, and まく as winding. Nouns such as 決まり and 祝い use nominal contexts rather than accidentally matched verb stems. Honorific prefixes, counters, transitive/intransitive pairs and homographs use their selected meanings/readings.

## Tatoeba selection

- Provider: [Tatoeba](https://tatoeba.org/)
- Text export information: [Tatoeba downloads](https://tatoeba.org/en/downloads)
- Reuse guidance: [Using the Tatoeba corpus](https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus)
- Licence: [Creative Commons Attribution 2.0 France](https://creativecommons.org/licenses/by/2.0/fr/)
- Export snapshot retrieved: 2026-10-31; exact upstream archive URLs, byte sizes and SHA-256 fingerprints are retained in `audit.json`.

The pinned `n4-corpus.json`, `n3-corpus.json` and `n2-corpus.json` files retain each Japanese sentence ID and contributor, Mandarin translation ID and contributor, original Chinese text, and whether the pair has a direct translation link or shares a translation pivot. Shared-pivot pairs are explicitly labelled; they must not be represented as direct Japanese-to-Chinese translations. Japanese and Chinese originals can be inspected using `https://tatoeba.org/en/sentences/show/<id>`.

Chinese text was converted to Traditional Chinese with OpenCC's `s2twp` configuration. Corrections requiring a different sentence are authored in the corresponding `.txt` file and override the corpus entry. The displayed source panel links to both original sentences, names their contributors (or indicates no assigned contributor), and supplies the licence link. No source audio is copied; pronunciation uses the device's Japanese speech synthesis.

The 2026-11-01 N2–N4 editorial recheck also corrected selected corpus translations in place. These records retain the original Chinese translation and all attribution fields; `source.modified` identifies the project-reviewed translation and date. See `N2-N4-REVIEW.md` and the entry-level before/after record in `N2-N4-REVIEW.json`.

Candidates were screened using Japanese token boundaries, observed base spelling, dictionary reading, and Chinese meaning anchors. Unanchored pairs were inspected for the selected sense; unsuitable pairs were replaced. This process and structural/browser checks do not constitute external linguistic certification. Live corpus updates are not automatically imported.

`prepare-example-candidates.py` is an optional offline authoring aid, not a browser or publishing dependency. It requires fugashi 1.5.2, unidic-lite 1.0.8 and opencc-python-reimplemented 0.1.7. Full upstream archives and Python packages are kept outside this repository; only the pinned selection is distributed.

## Rebuild and verification

Run `node build-vocabulary-examples.cjs <level>` for each level, `node build-pages.cjs`, then `node write-example-audit.cjs`. Publishing uses the pinned text/JSON files and requires no corpus download or Python package. `--audit` reports gaps; `--check` detects stale published output. `test-vocabulary-examples.cjs` checks full coverage, meanings/readings at regression cases, provenance, and generated hashes. With `PLAYWRIGHT_PATH` set, it inspects all 5,233 cards across every category and page, including source panels, speech calls, action placement, search, favorites, themes, and four screen widths.
