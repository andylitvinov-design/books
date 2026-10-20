# Tantra Reiki visual symbol — approved 2026-10-18

Owner direction: remove the Maya disk/calendar from **all Tantra Reiki advertising, landing pages, course cards, slides and video posters**. Use a recognizable **yin–yang / taijitu** mark instead.

## Canonical assets
- `/images/holistic-house/tantra-reiki-yin-yang-mark.svg`: transparent turquoise/gold mark for hero, labels and overlays.
- `/images/holistic-house/tantra-reiki-yin-yang-cover.svg`: landscape hero/poster/course-slide art with the same yin–yang geometry.

## Usage
- Use approved sunrise portraits and authentic existing Tantra photographs where appropriate; do **not** discard user-approved campaign photo designs merely to add a logo.
- Use the yin–yang brand mark on Tantra Reiki promotional surfaces, and the cover image whenever a dedicated symbolic image is needed.
- Keep EN/RU/ES, existing study/video links and conversion steps intact.
- Do not use `/library/maya-mysteries/media/post-217-1.jpg` (or other Maya calendar/disk imagery) for Tantra Reiki.
- **Do not alter** the separate Maya/Aztec Mysteries history, courses or archives: the prohibition is scoped to **Tantra Reiki branding**.
- The Level 1 page already contains an explicit turquoise/gold yin–yang SVG seal in `components/academy-record-page.tsx`.
- External Meta/Google Ads and Canva/Drive creatives, when available, should replace affected media with the revised yin–yang art before their next publication. This code change does **not** silently edit/publish existing paid ads.
- Test: `node --test tests/tantra-reiki-brand-symbol.test.mjs`.

## QA
Check desktop/mobile layouts, clipped graphics, correct source images in the academy card/video poster/Reiki Practitioner Tantra steps, open graph preview, and production SHA/alias before saying LIVE.

## Completed website placements (2026-10-18)
- Academy featured Tantra Reiki course and Academy English video-program poster (`components/academy-hub.tsx`, `components/academy-video-courses.tsx`).
- Free course cards and capture/selection widget (`components/academy-free-course-banner.tsx`, `components/academy-course-capture.tsx`).
- English guided Tantra Reiki meditation catalog and any reusers of that metadata (`data/academy/english-guided-meditations.ts`).
- Reiki Practitioner Tantra slides, milestones and choice cards (`data/academy/energywork-ai-curriculum.ts`).
- Tantra Reiki discover advertising landing keeps its approved sunrise photograph with a visible yin–yang overlay (`app/[locale]/academy/reiki/tantra-reiki/discover/page.tsx`).
- Original Tantra Reiki Level 1 already uses a yin–yang seal (`components/academy-record-page.tsx`).
- Maya Mysteries, Maya/Aztec education and historical source archives intentionally retain their authentic imagery.

External advertising dashboards, editable Canva creatives, and pre-existing Google Drive historical files are **not** automatically modified by a website release. Verify those separately before claiming full paid-ad coverage.
