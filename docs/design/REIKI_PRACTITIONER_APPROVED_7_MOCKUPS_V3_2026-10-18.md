# Reiki Practitioner · Approved 7-screen mockups / large-type portrait V3

**Owner request:** 2026-10-18. **Course:** `/en|ru/academy/principles-of-energywork/learn`. **Source of truth:** GitHub's production branch `codex/public-book-library`. Continue the V2 airy-sky design and the p1 five-lesson / 53-screen course.

## Saved visual originals
The **actual seven approved original PNG mockups** and smaller preview WebPs have been saved in the user's personal ChatGPT Library, not embedded as flattened UI:

`/Holistic House/Reiki Practitioner/Approved Mockups 2026-10-18/`

The folder also contains `Holistic_House_Reiki_Practitioner_Approved_Mockups_2026-10-18.zip`, with seven original 863 × 1822 PNGs, seven preview WebPs and README.

| Mockup | Course content |
| --- | --- |
| 01-welcome | Opening, 5-stage rail, sunrise woman, three systems, start CTA |
| 02-reiki-experience | Four large Reiki-experience choices, one selected, concise guidance |
| 03-symbolic-flight | Woman and natural sunrise in photo banner above lesson description |
| 04-flight-video | Preserve **real original click-to-play** meditation video, enlarged player |
| 05-gentle-pause | One humane, concise instruction; large 2-minute timer, optional radio feedback |
| 06-meditation-reflection | Readable prompt and large private text field, no forced answer during learning |
| 07-tantra-spring-of-life | Readable Tantra Reiki lesson with human-centred sunrise photo |

The course's **all 53 screens**, not just these seven examples, share the same text-size and navigation improvements.

## Implementation contract

- Use the **existing, locally owned** `/images/holistic-house/reiki-approved-sunrise-v3.webp` (the meditating woman from the prior owner-approved concept), layered over the existing local `reiki-heaven-sky.svg` for subtle background presence throughout the course.
- Show the same photographic character more prominently on the welcome, symbolic flight, and opening Tantra Reiki screens. Preserve other existing meaningful artwork and never replace the actual YouTube video/poster with fictitious playback.
- Prioritize phone readability: large headings (~30–39 CSS px), body text (~14–16 px), answer cards (~14–15.5 px), stage labels at least ~10.5 px, progress text 13+ px and 49–55 px primary touch controls. On short 320px screens long cards may scroll **inside** the slide, with the CTA kept visible.
- Retain light blue/white glass, soft dawn-sunrise warmth, accessible text contrast and visible keyboard focus. Do **not** paste a screenshot mockup as the whole webpage. Browser address bars shown in mockups are illustrative, not site UI.
- Keep original five steps in fixed sequence (Flight to the Sun → Tantra Reiki → Kundalini Reiki → Reiki Yggdrasil → Personal Reiki Initiation), with correct 53-screen progress, EN/RU copy and option IDs.
- Preserve the real original video IDs, existing video player with no autoplay, media failure UI, opt-in/private authenticated saving, journal/report requirement only before requesting teacher review, all question data and current schema `2026-10-18.p1`. No video generation, change in personal-initiation availability or automated initiation.
- Do not enable new Vercel image transformations for the owner-approved small local portrait: any added portrait art uses `unoptimized`. Never use Drive share URLs or large MP4 files on the website.

## Source / QA

- `components/energywork-ai-learner.tsx` — `data-course-portrait="v3"`, photo substitutions restricted to welcome, Flight lesson and Tantra lesson.
- `components/energywork-ai-learner.module.css` — V3 overrides after approved V2; original V2 style and sky preserved.
- `tests/reiki-practitioner-portrait-v3.test.mjs` — source-level regression.
- `scripts/verify-reiki-all-slides-browser.mjs` — guest-only full 53-screen Chromium/WebKit journey at 320/375/390/430px; retest in release CI.
- Production verification needs exact source commit, Vercel READY, alias `holistichouse.vercel.app` and public course EN/RU readback. Do not equate build success with physical iPhone or authenticated personal data QA.

## Concurrent course expansion (18 October 2026)

The seven approved image mockups show **45 total screens**, because they were created before PR #970. The live curriculum is now **53 screens** after new human-reviewed meditation feedback, verified community-voice screens and chapter celebrations. **Use the real 53-screen progress and preserve these added elements**; do not hard-code the number in the interface from the historical mockups. V3 styles also enlarge their notes, buttons and headings.

## Improved approved local image

The production photographic asset is a clean text-free crop from owner-approved mockup 03: `public/images/holistic-house/reiki-approved-sunrise-v3.webp` (756 × 478, about 42 KB, WebP). It replaces the previous miniature photo **only within the V3 presentation**. The original mockup PNGs remain unmodified in the Library archive. No fake video screenshot or extra publishing platform is used.
