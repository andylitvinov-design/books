# PsiMaster video course E2E / source order audit — 2026-10-23

## Scope: original PsiMaster *video course* pages

All seven public taxonomy pages classified `AcademyVideo` were independently fetched with their rendered YouTube embed URLs, in original page order:

| Route | PsiMaster term | Source videos | Source ↔ manifest order |
| --- | --- | ---: | --- |
| videos/planetary-power | 12477 | 11 | 11/11 exact IDs & sequence |
| videos/egypt-osiris | 12472 | 7 | 7/7 |
| videos/greek-mysteries-dionysus | 12471 | 7 | 7/7 |
| videos/strength-protection | 12468 | 7 | 7/7 |
| videos/maya-archetypes | 12327 | 6 | 6/6 |
| videos/greek-mysteries-demeter | 12478 | 5 | 5/5 |
| videos/energy-pump-ups | 12312 | 2 | 2/2 |
| **Total** | | **45** | **45/45** |

None of the seven course-page original iframe IDs are missing or in a different order. Original course videos have **41 unique IDs** because four are intentionally referenced by more than one course; preserve these references, do not de-duplicate across different course lessons.

At the beginning of this task, production `/ru/academy/videos/*` rendered all **45 Play buttons**, correctly ordered by source, but as independent thumbnail grids under the long course description. There was no numbered lesson list, one-at-a-time player, or next/previous flow.

## UI change

- All seven native video course pages now render one poster-first video player **above** historical text, with numbered, source-ordered, fully visible lesson buttons, a total count, and previous/next lesson navigation.
- Clicking another lesson unmounts the existing iframe (so simultaneous playback cannot occur) and returns to its poster, with no autoplay until Play is explicitly pressed.
- The same existing YouTube embed player and direct YouTube fallback are reused, with EN/RU/ES button labels. No new YouTube uploads or AI renders.
- 320–430 px: one-column player then list; long titles wrap; existing routes stay unchanged.
- Non-video Academy programme pages and the separate Academy video library are unchanged.

## Other videos on the old site (separate provenance)

A targeted audit of the 22 PsiMaster Academy programme pages and 17 supplements found some additional **non-video-course** embeds. For example, the archived imagery-therapy programme (term 12308) links two original video introductions (EhQPjuyNCS4, m03fo3CW7Eo); the canonical Reiki Yggdrasil sources also link external videos by Nikolai Zhuravlev, e.g. term 12182. Those are **not** the seven video-course playlists above, and should not be silently reclassified as Andrey-authored lessons or cloned into the Yggdrasil curriculum. Full site-wide YouTube/video ownership and playback verification is a separate inventory/reconciliation question.

## Required release evidence

1. `node --test tests/academy-psimaster-video-sequence.test.mjs tests/academy-migration.test.mjs tests/public-youtube-inline-playback.test.mjs`.
2. CI checks, typecheck, lint and successful Vercel build.
3. Production READY/commit/alias and live HTML: seven course routes, `data-video-lesson-count` values matching 11/7/7/7/6/5/2, one player per page, all numbered lesson controls with exact IDs and order, and direct original YouTube watch fallback.
4. Actual click/play across course playlists on iPhone/desktop or browser automation before asserting full video playback E2E, since HTML/render alone does not verify YouTube provider availability.

**Status:** change proposed in PR; not yet verified on production.
