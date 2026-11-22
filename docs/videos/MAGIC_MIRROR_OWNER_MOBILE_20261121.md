# Magic Mirror · owner-approved mobile entrance and Video Therapy (21 November 2026)

**Canonical route/state:** `/{en,ru,es}/holistic-support/mandala`, anonymous client, Video/Goal workspace. The **first approved screenshot** shows Video Therapy compact input and four categories, the **second** shows its Basic/Pro/VIP menu, the **third** shows the new entry page with two directions and three formats. These are sequential real states, **not** three independent routes.

## Before → after
- **Before**: former first-screen `For Me / For Work / Present` 4×4×4 chooser and small one-line wish; existing player/Canvas/MP4 stays mounted below. The prior on-tap Next/category chain navigates to the authentic Ideas → Goal.
- **After landing**: original site header + bottom 7-action dock, wide sunrise Magic Mirror hero, two tall photo cards: **Video Therapy for Myself** and **Videos for Others** (gift and social), three genuinely selectable preferences: Simple Video 250 XP / Live Photo 500 XP / Cinematographic Video 1000 XP, one **Plan & Generate Video** CTA. Choosing therapy opens the second screen; Others starts the preserved present/social/working creator, never a second renderer.
- **After therapy**: hero, real intro-video poster button (delegates to the existing `data-video-therapy-intro="ready"` playback, never a fake duplicate video), three-step ribbon, **large multiline text composer**, plus/photo to original advanced controls, keyboard dictation focus, **AI Ideas** dropdown Basic / Pro / VIP and **Guide me** help, four canonical first-level categories then exactly four canonical subcategories and four topics. The green **Get AI Suggestions & Script** action uses the original local taxonomy-to-Ideas-Goal handoff. No generation, payment, credit deduction, SMS or external model call on selecting a card, choosing a tier or pressing this CTA.

## Behavior mapping
- Welcome `data-hh-mirror-enter=me` → therapy start; `others` → present, change to Work using existing scope buttons.
- `data-hh-mirror-video-format` / `data-hh-mirror-tier-option` → local preferred `MirrorVideoFormat` in MirrorResolution. The current protected downstream renderer's server catalog/authorization remains authoritative. **Do not interpret the UI tier as a provider or billing-ready capability**; pending #5348 governs real credits and #5337 governs consented HeyGen photo animations.
- Composer typed-wish → `classifyMyTubeRequest` canonical 4×4×4, otherwise default selected card; `onComplete` → one `mirrorResolveRef` (retains consent, secure routing) → existing Ideas → Goal. Business 4 work formats and present taxonomy remain intact.
- Poster → existing real introduction, no autoplay. Plus and media → approved advanced options; mic → mobile keyboard focus; no microphone permission requested automatically.
- EN/RU/ES localized throughout; `data-hh-mirror-advanced` remains closed until deliberate action. No new consent, tracking, external endpoint, cost, data store or extra player.

## Geometry + media
Reference is a **tall 768px-wide portrait composition**, not a promise to fit the entire vertical page in one small iPhone viewport. For mobile CSS 320/354/390/430: side padding 12–16px, 2 tall direction cards, full-width multi-line composer (~117px text area + 46px toolbar), 2×2 category grid, 3 format columns, fixed existing bottom dock, 44px main touch controls where feasible. Color palette ivory #FFF9F3, forest #143d3a, emerald #067a67. The source uses verified first-party high-resolution sun/water/mountain assets; the original generated person portrait embedded in the screenshot is **not** a separately licensed site asset. Exact photograph-level matching needs an approved source photograph. No mockup screenshot may be pasted as an entire site surface.

## Implementation and acceptance
- Existing source: `components/mandala-magic-mirror-goal.tsx` + co-located CSS, original `mandala-free-video-studio.tsx` and single `MandalaAutoVideoDirector` untouched.
- Updated focused source and browser contracts: `tests/mandala-magic-mirror-mobile.test.mjs`, `scripts/verify-affirmation-voice-browser.mjs`. Browser checks landing → therapy, format toggling, other/work branch, 4×4×4, real Ideas navigation and 320/354/390/430 overflow, with EN/RU/ES.
- **LIVE acceptance still requires** exact HEAD Core, Specialist WebKit/Chromium, actual screenshots/overlay at route/state, protected merge, normal hourly publisher Vercel READY+matching canonical SHA and manual real iPhone session. No new manual production build permitted.
