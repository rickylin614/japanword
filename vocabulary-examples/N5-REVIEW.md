# N5 recheck — 2026-10-31

All 698 published entries were rechecked against their Japanese form/reading, the original English gloss, retained JMdict evidence, and the authored Japanese/Traditional Chinese example. Counts remain nouns 293, verbs 109, i-adjectives 60, na-adjectives 30, and others 206. Every entry has an example; the bank now has 449 distinct sentences. Shared examples are not counted as additional vocabulary.

## Substantive correction

`n5-jmdict-1157170` is irregular **する** (JMdict `vs-i`, “to do”), not godan **刷る** (“to print”). The old Chinese gloss “印刷（刷る）” and example form “すりました” were wrong. The gloss is now “做；進行”, and the example is “毎朝、運動をします。” / “我每天早上運動。” The published vocabulary and generated `n5.csv` use the same corrected meaning; forms remain します／して／しない／した. The vocabulary ID, reading, source rows, and classification are preserved.

## Other corrections

- Added the elementary price-question meaning of **いくら**, using “このかばんはいくらですか。” The dictionary also supports the existing “no matter how” sense, retained as a secondary gloss.
- Added the gratitude sense of **どうも**, “按” for **押す**, and clearer basic meanings of **お風呂**, **大変**, and **ころ**. The master translation file `sources/n5-zh.json` and published glosses agree for all 698 entries.
- Clarified the omitted “rather than the stairs” in the elevator example's Chinese translation, and made **がる**'s translation natural Chinese.
- Rewrote awkward combined examples for 車／自動車, 父／母／両親, 晩御飯／夕飯, and 汚い／服. Each word retains its own natural context; unrelated words are not forced into one sentence.
- Used explicit **ゆうべ** and **わたくし** in their example texts to keep the selected readings visible and avoid ambiguity with さくや／わたし. Actual synthesized voice quality still depends on the device.

Seven Chinese vocabulary glosses and 22 example records changed. No vocabulary was added, removed, renumbered or reclassified.

## Regression checks

`test-vocabulary-examples.cjs` checks the irregular-vs-godan distinction against the retained dictionary entry, master/published N5 gloss equality, the primary price sense, explicit homograph readings, and the actual example forms for **all 109 N5 verbs**, including polite, negative, progressive and potential forms. Its browser checks inspect every card and page, pronunciation call parameters, action order, search, favorites, themes and four widths. `test.js`, `test-verbs.cjs` and `test-verified.cjs` verify the generated quiz data, inflections, source/ID integrity and existing vocabulary coverage.
