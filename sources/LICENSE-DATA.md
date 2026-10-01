# N2 vocabulary data attribution and licence

The N2 dataset is a derived vocabulary study resource, not an official JLPT examination or syllabus.

## JMdict

Japanese lexical forms, readings, part-of-speech codes and English dictionary glosses are derived from JMdict, copyright Jim Breen and the Electronic Dictionary Research and Development Group (EDRDG).

- Project: https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project
- Licence statement: https://www.edrdg.org/edrdg/licence.html
- Creative Commons Attribution-ShareAlike 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- Legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode
- JSON conversion: https://github.com/scriptin/jmdict-simplified

The N2 derived data (`n2-data.js`, matching evidence, and Chinese translations of the vocabulary glosses) is distributed under CC BY-SA 4.0. The application code is separate. No endorsement by the original authors is implied. The modifications consist of filtering by the named N2 list, selecting matching senses, classifying each entry once, merging aliases, and adding Traditional Chinese translations and provenance metadata. The Chinese translations are project-authored translations, not a separately certified Chinese dictionary.

## JLPT level list

- Open Anki JLPT Decks by jamsinclair and contributors: https://github.com/jamsinclair/open-anki-jlpt-decks
- Original deck provenance: https://github.com/chyyran/jlpt-anki-decks
- Original JLPT resource: Jonathan Waller, https://www.tanos.co.uk/jlpt/
- Permission: https://www.tanos.co.uk/jlpt/sharing/ (Creative Commons BY for non-sold materials)

The GitHub project identifies its code licence as MIT; the source data attribution and inherited dictionary licences continue to apply. The repository is used as a fixed source snapshot, not as an independent second authority for the Tanos classification.

## Scope and refresh

JLPT does not publish a current complete vocabulary list: https://www.jlpt.jp/tw/reference/pdf/guidebook_s_e.pdf (FAQ Q7). Level labels here are solely the referenced study-list labels.

See `download.json` for exact versions and `n2-audit.json` for SHA-256, merged rows and exclusions. Each accepted entry carries the original CSV row number(s), JMdict sequence number, matching sense index(es), and dictionary POS codes. `n2-overrides.json` records manual disambiguations. No approximate string matching is used.

For dictionary updates run `powershell -File fetch-n2-sources.ps1 -LatestDictionary`, rebuild and review the audit, add or amend reviewed glosses keyed by JMdict ID, then publish and retest. Check the upstream dictionary at least monthly for an actively served deployment, following the EDRDG licence statement. The level-list revision is intentionally pinned because row-based overrides must be reviewed before changing it.

The complete dictionary ZIP/JSON is a build dependency; it is not necessary to serve it with the web application. The checked subset is retained in `n2-dictionary-evidence.json` for offline validation.
