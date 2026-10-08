# Temple Studies — recovered Russian PsiMaster video library (2026-10-08)

## Source of truth and preservation

The historical PsiMaster public **Бесплатные Видео-Курсы** menu lists six original course collections. The separate archive of energy practices was also recovered in `data/academy/psimaster-media.generated.json`. All records retain exact source page URLs and original Russian lesson titles. The existing preservation corpus is **45 lesson references / 41 distinct public YouTube IDs**, because four meditations are cross-listed in two original collections.

Source: [PsiMaster](https://psimaster.net/). Manifest: `data/academy/psimaster-media.generated.json`. This catalog is a recovery of **verified public links from the archived site**, **not an exhaustive claim about every upload to the owner's YouTube channel**.

## Placement on Russian Temple Studies

| Stage | Original collection | Source taxonomy ID | Original links | Unique items shown |
|---|---|---:|---:|---:|
| 2. Greek Mysteries | Курс Греческие Мистерии. Канал Деметры. | 12478 | 5 | 5 |
| 2. Greek Mysteries | Курс Мистерии Диониса | 12471 | 7 | 7 |
| 3. Egyptian Mysteries | Курс Жречество Египта. Осирис | 12472 | 7 | 7 |
| 4. World Traditions | Архетипы Майя (видео) | 12327 | 6 | 6 |
| 5. Symbols & Elements | Курс Сила Планет | 12477 | 11 | 11 |
| 5. Symbols & Elements | Медитации Силы и Защиты | 12468 | 7 | 3 (4 also in Planetary Power) |
| 6. Initiatory Practice | Практики энергоподдержки | 12312 | 2 | 2 |
| **TOTAL** | **Seven collections** | | **45** | **41** |

Stages 1 and 7 retain their curriculum and source documents without adding unrelated video material. Reused recordings are listed once on the Temple landing page; the original catalog entries and source links remain intact. The UI explains the four repeated links rather than silently omitting them.

## UX and technical rules

- Russian route: `/ru/academy/temple-studies` (same existing seven-stage learning path).
- Above the stages: 5-area video index with direct anchors and accurate unique video counts.
- Within each stage: collapsible original-course groups; numbered Russian lessons and concise original-course descriptions; PsiMaster provenance link.
- Video: existing `AcademyVideoPlayer`, poster-first/click-to-play, lazy YouTube no-cookie iframe, no background playback.
- Thumbnail: remote `i.ytimg.com` with `unoptimized`; avoids storing optimized copies in Vercel Function Storage.
- No regeneration, no YouTube publication, no Drive playback, no large MP4 in GitHub.
- EN/ES current page architecture and seven-stage texts remain unchanged.

## Acceptance checklist

- `node --test tests/temple-studies.test.mjs` validates exact archive coverage, 41 unique IDs, 7 source collections, metadata and non-repeating links.
- Whole-repo `npm run test:unit`, `npm run lint`, `npm run build`, `tsc --noEmit` and existing CI must be checked.
- Verify click-to-play, visible poster, source links, exact original titles and mobile presentation on preview, especially stages Greek, Egypt, Traditions, Symbols and Initiation.
- New live deployment can be verified only after Vercel daily deployment quota permits it. A GitHub merge alone does not establish production availability.
- An unrelated app-browser check may fail at `/en/app/tests?selection=pending` versus expected `?plan=`; track separately rather than masking it in Temple code.
