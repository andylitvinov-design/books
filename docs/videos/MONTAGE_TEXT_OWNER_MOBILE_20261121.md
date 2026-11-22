# Montage → Text · owner-approved mobile design · 21 November 2026

## Page identity and visual source
Canonical website: https://holistichouse.vercel.app/en/holistic-support/mandala
EN / RU / ES routes, public guest or signed-in user, Video Studio / Montage workspace editor / Text panel. Reference: latest owner-approved in-chat screenshot with cream-sunrise header, three progress steps, phrase categories and large bottom actions. Previous Text screenshot had 7 tightly spaced rows and a short interior scroll. The source image is a visual mock, not a working UI or evidence of actual 250 XP charge or HeyGen generation.

## Existing page reused; no extra generator
The source owner is components/mandala-free-video-studio.tsx. Reuse original MandalaVideoIdeas, original planIdeaSelection, Canvas/MP4 caption data, original provider-independent phrase editing, audio/video preview, Voice consent, Story, Ready and server-side credit catalog. Only a scoped Text-only hero and progress strip are added, with new CSS module. The hero uses an existing first-party landscape poster instead of pretending the generated woman's photo is licensed stock or stored in customer library.

## Visual and interaction acceptance
| Area | Intended owner-approved implementation |
| --- | --- |
| Hero | Forest sunrise, editorial white serif headline, contextual supporting/celebration subtitle; reuse licensed poster |
| Progress | 3 real steps: Style, Audio, Text & Phrases; back steps clickable, current step marked |
| Main card | Warm ivory card, ~26 px radius, larger heading and EN/RU/ES language choices |
| Phrase topics | Swipeable actual buttons Support, Congratulations, Motivation, Love, Peace, Custom. Each of five presets has seven EN/RU/ES samples. Custom opens real manual form. First visit preserves actual goal-sensitive proposals. |
| Phrase rows | 56 px minimum height, 44 px select and Play/Edit, 14–18 px copy. One natural page scroll, no nested phrase scroll |
| Actions | Real More Phrases, Write a Phrase, Record a Phrase, Preview and Continue to Create. Continue calls existing Story onCreate (not a render or debit). Optional direct Ready kept in disclosure |
| Credit | Display server-confirmed creditCatalog.priceCredits only if applicable; never hardcode sample 250 XP or charge on a selection |
| Privacy | Preserve existing photo, recording, stored content and voice consent. No provider call or paid video render |

## Actual checks
Before publish: structural preflight only; focused Node contracts in tests/video-studio-montage-text-owner-mobile.test.mjs. Full Next TypeScript/lint/build and source browser E2E require protected exact-head CI. Real same-route/stage Chromium and WebKit screenshots at 320, 354, 390, 430 CSS px should compare against owner's approved reference with documented cropping/landmarks; neither mockup nor Node contracts establishes pixel fidelity. Test category toggle, all phrases 5 minimum and 10 maximum, edited phrase retention, EN→RU→ES, viewport overflow, bottom dock, Play and Edit, voice permissions, next step and no XP debit. Physical iPhone Safari/private audio delivery needs independent E2E evidence.

## Concurrency and release
Separate in-flight #5357 Style/Audio and #5145 desktop text/Ideas PRs may overlap code: do not overwrite, skip or force merge. GitHub branch protection/exact-head Core and Specialist, browser tests and hh-merge-check must pass. Production publishing is via existing hourly Vercel GitHub workflow ONLY; do not manually deploy or use paid HeyGen. LIVE means alias READY + deployed production SHA + functioning browser; pending verification is not LIVE.

Status at authoring: CODE STAGED FOR CI; not yet merged, rendered-QA-passed, or LIVE.
