# Mandala Video Studio — approved six-panel mobile quick builder

**29 October 2026 · owner approves the FIRST generated visual reference**, not the later preview-first mock. Canonical route: `/{ru,en,es}/holistic-support/mandala`, guest/local video editor, no OAuth or private cabinet state. Production branch at start: `codex/public-book-library`, verified SHA `04f9af3b290610ce28bf7ca055ea68dca443ed7a`, Vercel project `super10/codex-public-book-library`, production alias `holistichouse.vercel.app`. No second route or paid provider.

## Reference identity and composition

The approved image is a **design mock**, not a live web capture or a replacement for the site's separate Holistic Support dashboard. Its single scrolled editor is cream, eucalyptus green, soft ivory, rounded ~20px cards, 14–21px type, 44px+ controls and fixed existing five-tab site dock (owned by the parent app shell). Reference widths: the generated screenshot is taller/wider than a 390px browser viewport; compare **structure and geometry** with local WebKit at 320/354/390/430, not direct raw pixel score across different dimensions.

Six owner-approved regions, top to bottom, each mapped to real existing state/actions:

| Region | Reference content | Source of truth and action |
| --- | --- | --- |
| 1. Theme and goal | six horizontal chips, one wish field | `theme`, `wish`, `selectCategory`; goal remains browser-local |
| 2. My imagery | photo picker plus five original scene posters | `onPickPhoto`, `backgroundOnly`, photo consent, `moneyScene/otherScene`; posters are source-backed, never treated as a user portrait |
| 3. Hypnoaffirmations | ready/test/personal options | original `AffirmationSettings`; ready toggles opt-in; test/personal opens the real protected editor, no silent test read |
| 4. Visual style | six thumbnail presets | available first-party video/template scene plus actual brightness/speed; artwork is indicative where a theme has only Canvas sources |
| 5. Audio | type chips, recommended track, native listen and attach | original first-party WAV catalogue, `audioKind`, `chooseMusic`, upload in expanded editor |
| 6. Editing and format | 9:16/16:9/1:1, 10/20/30/60s, large/small/brief text | original `aspect`, `duration`, `affirmations.visibility` and MediaRecorder |

**One primary create video button** calls the existing photo/rights-gated `startFromHero` → `createVideo`. It never sends a third-party render request. Recording progress and genuine download remain available; no downloaded file is claimed until a real Blob exists. Optional existing personal eight-session course remains accessible, not automatically generated. Original full editor, tests, film templates, audio, custom phrases, therapeutic session planner and export stay mounted inside an expandable **advanced editor**; this is not a duplicate renderer.

## Privacy and limitations

- Personal photo and wishes remain local. Loading private tests requires separate account sign-in and consent through the original module; a chip is not permission.
- No new DB, migrations, provider credits, Stripe charges, HeyGen/Kling/Runway calls, CRM record, YouTube publication or auto-save.
- Short-frame phrases are experimental; no proven subliminal change, treatment or income promise. All translation keys RU/EN/ES.
- Mobile touch targets >=44px, horizontally scrolling preset rails without page overflow, safe-area docking preserved.
- Scenarios must check ordinary guest playback, upload rights, real recorded visual+audio bytes, correct native source, click error states, 320/354/390/430, CSS overflow and EN/RU/ES.

## Visual release acceptance

Compare the reference and rendered page as **same role and intent**, but record that raw overlay/pixel-match is not comparable without recreating the generated reference under identical 390px geometry. Browser script now checks six-section order, linked filter state, photo/default privacy and no horizontal overflow before expanding the old browser E2E script; CI source/geometry alone does not prove visual parity. Physical owner's iPhone Safari Play, full recording/Share→Files and speaker, and exact release SHA/READY/alias must be reported separately.

## Current release state

Code on PR branch. Do **not** mark live until current-head GH Actions pass, safe merge into `codex/public-book-library`, Vercel deployment READY SHA and aliases, and meaningful RU/EN/ES browser evidence. Conflicting open editor PRs #2518, #2520, #2521 and #2522 must be reconciled before merging any change that overlaps `mandala-free-video-studio.tsx`.
