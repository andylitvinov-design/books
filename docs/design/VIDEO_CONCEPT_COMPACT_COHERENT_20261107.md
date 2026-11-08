# Video Studio — Compact Concept and coherent personalization (2026-11-07)

**Release target:** existing `MandalaVideoConcept` in Montage, not a second editor or provider.
**Owner request:** compact first screen, safe-area and fixed approval above unified mobile navigation, meaningful editorial suggestions, all 38 parameters available by disclosure. Retain signed-in editing, guest approval, original licensed-media and source checks.

## Mobile presentation
- Intro fits one short paragraph. One context line distinguishes user goal from canonical classified topic (one line only when identical).
- Central Main Idea is *editorial copy* and must **not** repeat a taxonomy label or claim a therapeutic outcome.
- Exactly four immediate decisions in two columns: Style, Meaning, Motif, Scenario; their source is visible.
- Four goal-related emotional stages in a small 2×2 grid; 4 semantic beats remain in the existing separate disclosure.
- One action group with **Approve & continue** and **Edit concept** stays visible above the real unified bottom navigation; its buttons work without layout-specific duplicated handlers.
- Expand **All 38 parameters** to inspect canonical labels/values/provenance; unknown fields display as unknown instead of being invented.
- Installed iOS safe-area top and lower nav insets preserved for 320/354/375/390/430 px; no fixed-height clipping.
- Keep English/Russian/Spanish parity, `prefers-reduced-motion`, keyboard focus and existing guest-sign-in overlay.

## Semantics
- Explicit goal and timed audio transcript have priority. Automatically recommended Ideas phrases are **not evidence** of family, audience, symptoms or biographical facts.
- Audience inferred **only** from direct recipient wording such as “for my mother”, “for clients”; simply mentioning a parent/relationship or “family” in Ideas never sets Audience.
- Anxiety without a known reason: meaning axis `anchor`, allowed motif `nest` (shelter), non-forcing, goal-specific 4-stage emotional arc and source-accurate four editorial beat descriptions. No diagnosis, cure claims or personal relationship story.
- Gift/congratulation: appropriate warm main message and flower motif where allowed; presentation: clear value proposition without promises. Any explicit selected user's allowed motif takes precedence.
- Main Idea, style, symbol, scenario and emotional stages remain editorial until the existing media source/rights/final export checks validate physical clips.
- `parameters[].source` differentiates `speech`, `goal`, `editorial`, `unavailable`, `ideas_voice`, `audio`, `settings`, `editor`. Client display exposes extracted-from-audio vs extracted-from-goal vs suggested vs synchronized.
- No new API call, billing, voice copying, local storage of audio transcript, duplicated timeline, new data tables or model dependency.

## Acceptance
1. New focused tests guard RU/EN/ES anxiety and recipient intent, duplicate Goal/Topic avoidance, 4-episode personalized arc, source metadata and 38 parameters.
2. New UI source contracts guard exactly four summary highlights, all 38 fields hidden in disclosure, one primary approval CTA ahead of details, edit auth gate and CSS safe-area/dock.
3. Existing `tests/mandala-video-concept.test.mjs` and `tests/mandala-audio-smart-concept.test.mjs` still run from the existing Mandala CI workflow. No new workflow or runner.
4. Current production-base exact-head Core/TypeScript/build, macOS WebKit voice/video, Public Services, actionlint, Guard and `hh-merge-check` must all pass before protected merge.
5. LIVE proof requires merged SHA, Vercel production READY SHA/descendant and `holistichouse.vercel.app` alias mapped to that READY deployment; PR GREEN alone is not LIVE.
