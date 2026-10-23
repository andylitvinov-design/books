# PsiMaster course-video inventory — 23 October 2026

## Coverage and verification boundaries

Source inventory: `docs/psimaster-public-video-source-inventory-20261023.json`

- **147** classified source taxonomy records total.
- **76** educational-source records inspected: 22 Academy programme pages + 7 designated video courses + 17 supplements + 19 canonical duplicates + 10 historical archives + 1 missing-trustworthy-body source. All 76 URLs were fetched on retry; a retrieved navigation shell for term 12434 still does *not* establish a usable course body.
- **170 video references across those pages**, resolving to **140 distinct YouTube IDs**.
- **114 distinct IDs already represented** in at least one existing Holistic House video data source: `data/academy/psimaster-media.generated.json`, `data/academy/psimaster-supplemental-media.generated.json`, `data/academy/media.generated.json`, or `data/academy/yggdrasil-curriculum.json`.
- **26 distinct source-linked IDs not yet indexed** by these four data sources.
- The original seven standalone PsiMaster video courses remain complete: **45 placements, 41 distinct videos, source order matched**. The Egyptian Priesthood new interactive course uses the 7 original Osiris videos without duplicating them; original Imagery Therapy / Mirrorland page received two original introductory videos.

**These counts describe link discovery, not YouTube ownership, permissions, functioning embedded playback, transcripts, or all videos ever uploaded to YouTube / private storage.** Some links appear on canonical-duplicate pages and should be treated as supplementary citations instead of a second version of the curriculum.

## Where the 26 unindexed IDs belong

| Source programmes | Missing original source IDs | Handling |
| --- | --- | --- |
| Western European Tarot & Sephiroth, source term 12182 | `7-En6Gzd_cw`, `1oV-hhRYuWs`, `2JsrM1pjwT0`, `2coGfxGbVr8`, `AkqHOXfk5fU`, `4VW1YI21T7Q`, `Wq6SFWL4rhs`, `ikgIoCgDpYw`, `ESktGxYqDFQ`, `63CfFqybj50` | Grouped as **Reiki Yggdrasil / Western Magic source references**. Multiple verified descriptions credit Nikolai Zhuravlev. Do not present as Andrey-authored footage or duplicate the stronger canonical curriculum. |
| Reiki Yggdrasil Basic, terms 12200/12206/12323/12397/12415 | `FxOE-cEAnP4`, `PiZhuunFpHU` | Grouped as **Reiki Yggdrasil / Basic Course source references**. `PiZhuunFpHU` publicly identifies an Andrey introduction, but authorship/rights, lesson position and provider playback should be reconfirmed before canonical insertion. |
| Temple Magic — Egyptian & Greek sources, term 12353 | `eGmMz9z1Puk`, `BwBlVerwAhY`, `5WaDYO4A7RI`, `YjZh0cJbBi0` | Grouped under Yggdrasil **Temple Magic source archive**, not invented as Osiris course days. |
| Eastern Magic, term 12356 | `cdfzUaqRa68`, `HBwy34WFpPM`, `uuthxpk4Fn8`, `cXcsjY4K8kk` | Grouped under Yggdrasil **Eastern Magic source archive**. Some video metadata credits the external school; source links retained for review. |
| Temple Studies / ancient ritual material, terms 12207, 12416, 12395 | `w3t5RUJ0RFM`, `Nkl1ox3UJCs` | Grouped as **Temple Studies external references**. The former points to a separate School of Ethnopsychologists; the latter to Maria Kardi. Review credit/rights. |
| Historical testimonials / media archive, terms 12393/12399/12402 | `m9RfDgK76PU`, `5oj0BIbLT4w`, `thhX4iRjOEQ`, `wbnmhNcJiXA` | **Archive/testimonials, not course lessons.** No historic therapy result or old CTA becomes a current factual claim. |

A video may occur on multiple source pages. The JSON is grouped by original page and linked learning direction; it intentionally retains the source and never edits the canonical lesson order.

## Practical next step

1. For the **26 source-linked but unindexed videos**, review title, copyright, owner and actual YouTube availability. Publish only source-backed/approved video material; avoid duplicates and unnecessary YouTube reuploads.
2. Expand **one learning course at a time** with the already proven seven-stage, one-concept-per-screen format from Egyptian Priesthood. Next candidate: the verified Greek Demeter or Dionysus video family; keep original video IDs and sequence.
3. For Egyptian Priesthood, complete real click/Play/iPhone 320–430 px and, if wanted, add separate **consented server-side My Courses** progress with owner-scoped RLS. The initial release's self-marked watched status and slide position are **browser-local**; reflection text is not persisted.

Do not call #136 or a full site-wide video migration complete solely on a successful build or these source count checks.
