# Tantra Reiki — source preservation audit (2026-10-11)

## Sources
- Original English site: https://psitrends.com/studies/tantra
- Original Russian site: https://psitrends.com/ru/cat-train-ru/advanced-ru/tantra-ru
- Canonical source snapshot: data/academy/tantra-reiki-full.generated.json — 102 EN and 190 RU blocks, unchanged.
- Original RU-to-EN translation: data/academy/tantra-reiki-ru-en.generated.json — 190 blocks, unchanged.
- Also checked source inventories for PsiMaster and archived PsiTrends Joomla/Quix backups. No further independent complete Tantra Reiki course appeared in their indexed records. Do not conflate generic Tantra or Reiki Yggdrasil with Tantra Reiki.
- Related later Meetup workshops are distinct event-specific programmes. Their registration terms are not imported into the historical nine-level course.

## Newly restored distinct original English passages
- Block 4: historical Academy introduction. In the Academy history disclosure under the teacher at page end.
- Block 5: original English Osho Tantra Reiki introduction (different from translated Russian preface). In the original Master Teacher programme.
- Blocks 6–68: full original Master Teacher curriculum; already restored by PR #311, retained verbatim.
- Blocks 75–78 and 81–82: Academy history and historical method of practical initiation. In the bottom Academy history disclosure, with archive attribution.
- Blocks 86–87 (Litten) and 89 (Margaret): unique original participant accounts removed from the public page by previous deduplication. Restored in an optional source-backed testimonial disclosure, in the original English language.
- Blocks 93–97: five distinct original author event themes (love/contact, unity, sensuality, growth, archetypal mysteries). Restored under the original event photos; RU/ES faithful editorial translations.
- Original testimonial Olga at block 84 overlaps the Russian Level 1 text account already present; do not reproduce twice.

## Newly restored Russian author text
- Blocks 35, 38, 41, 44, 47: detailed descriptions of attunements for Levels 5–9. Restored in the matching level's expandable attunements panel, RU original and EN mapped translation; ES faithful editorial translation.
- Blocks 158–167: historical personal biography / professional descriptions; preserved at the very end inside the teacher section. Duplicate 168–177 is not rendered again.
- All nine source-backed original research passages and their historical full research transcript remain visible or expandable (prior PR #311).
- RU block 182 is entirely included as the closing sentence of block 181: stored in source, not displayed twice.

## Purposeful exclusions
- Historical duplicated booking/diagnostic banners, repeating about-me rows, standalone source-photo headings, scraper-induced split copies, legacy offers/fees and tracking boilerplate are not restored as new reader content.
- The Academy's historical credentials and claims, and references to healing or certification, are explicitly attributed as source-era statements, not medical or professional guarantees.
- Long original source passages remain preserved verbatim in the snapshot. No source JSON was mutated.

## QA and release gates
1. Verify source-coverage tests, lint, Next/TypeScript build and supported browser journeys.
2. Merge into latest safe production branch without overwriting other work.
3. Deploy only latest safe HEAD after Vercel quota allows, then inspect EN/RU/ES production pages and available original media.
4. Verify source details, Litten/Margaret, event themes and Level 5–9 setting notes while the biography + registration appear only at the end.
