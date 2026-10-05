# Academy EN / RU parity audit

Date: 2026-10-05

## Result

Holistic House Academy now has an explicit English/Russian presentation layer across the preserved course corpus.

### PsiTrends
- Logical course/video/archive routes: **34**
- Routes with native EN+RU source records: **8**
- Single-source-language routes: **26**
- Single-source-language routes with an opposite-language presentation layer: **26 / 26**

### PsiMaster
- Published Academy/Archive routes: **22**
- Native source language: Russian
- Routes with complete English editorial translation: **22 / 22**
- English translations retain the same block count and block-type order as the curated Russian source.

### Legacy video titles
- Recovered PsiMaster media records: **45**
- Records with Russian lesson title: **45 / 45**
- Records with English lesson title: **45 / 45**

## Rendering policy

For `/ru/academy/...`:
1. use native Russian curated source when available;
2. otherwise use the curated Russian translation of the preserved English source.

For `/en/academy/...`:
1. use native English curated source when available;
2. otherwise use the curated English translation of the preserved Russian source.

The original source URL and source language remain visible in provenance. A translated-source notice is shown when the displayed body is not in the original source language.

## Safety policy

Translations are not used to reintroduce legacy:
- prices / registration contacts;
- medical or cure guarantees;
- qualification/certification promises;
- guaranteed supernatural or business outcomes.

Video titles are localized independently from the verified YouTube IDs, so media provenance is unchanged.

## Data files

- `data/academy/legacy-translations.generated.json`
- `data/academy/psimaster-translations.generated.json`
- `data/academy/psimaster-media.generated.json`
- `docs/psimaster-academy-translation-manifest.csv`
