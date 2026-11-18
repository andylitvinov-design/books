# Holistic House · Video Studio → Therapy · approved mobile UI (12 Nov 2026)

## Scope / decision
Owner approved mobile-first warm ivory + emerald design with large photographic hero and spacious touch controls. Existing top row of six workspaces becomes Goal → Ideas → Montage → PRO → Ready → Therapy. Internal workspace key remains effects for compatibility; older Hypno effects engine is retained under Therapy → Practice → Optional visual and audio effects, not presented as the main therapy composer.

Inside Therapy, the FIRST action is a two-choice format switch:
- Single practice: one editable, immediate local meditation script; optional authenticated, consented free AI draft using the existing Meditation Writer API.
- 8-session course: one coherent eight-topic outline and the first text; further texts 2–8 can be generated locally, one-by-one on user request, and edited or read by the existing voice preview. This is NOT eight completed narrated videos; mastered course/video/audio delivery remains issue #2503.

Then three subtabs: Meditation / Voice / Practice. Meditation reuses MandalaPersonalMeditation with the current goal, technique, pacing and optional focus accents; user explicitly generates and edits text locally, or selects an AI draft with separate imagery + external-provider opt-in. The approved video concept is reduced in the browser to audited theme, visual-motif, style and exclusion codes via buildMandalaWriterRequest; raw user narrative, imagery, profile, and notes are not sent to Gemini or OpenRouter. The server validates Psychologist Mind suitability, provider free-only gates and seven-part quality review. A model result is labelled AI only after modelUsed=true and validated provider response; otherwise the local script is labelled truthfully. Voice reuses the existing device voice / consented cloud narration and MandalaAffirmationVoice phrase voice implementation. Practice offers navigation to voice/narration and to the original video phrase editor in Ideas; extra legacy Hypno visual/audio effects are in an opt-in disclosure.

## Guardrails
- No autonomous API purchase, voice generation, film render, checkout, CRM or medical diagnosis.
- Cloud voice consent unchanged. AI text is never requested on page load; separate user action, two visible consents, same-origin authenticated POST, existing server quotas and free model flags are mandatory. Failures, missing auth, unsafe output or disabled free quota show a local script, not an invented provider success.
- Eight-session option must not be described as eight delivered videos or clinical therapy. Session scripts 2–8 are local, distinct, on-demand and cannot trigger external model calls or payment.
- No new DB schema, API route, extra hero player, duplicate video renderer or second public editor.
- EN/RU/ES mirror; target 320–430px, accessible touch targets.
- Original Hypno wave/quiet-speech/binaural tests remain reachable via Practice > Optional effects.

## Acceptance gates
Node unit and targeted tests; lint, typecheck, build; macOS WebKit video/audio/export and no-bill checks; mobile screenshots. Exact PR HEAD Core/Specialist and hh-merge-check; protected merge to production codex/public-book-library; Vercel READY with matching canonical holistichouse.vercel.app alias. Real narration, private delivery, payment and eight mastered assets are separate pending gates.

## AI LIVE verification (separate from local script acceptance)
- Require exact-HEAD tests plus real authenticated provider request before claiming free AI LIVE. Vercel BRIEF + PRODUCTION_APPROVED flags must remain OFF until confirmed free quota/credentials, privacy and server acceptance. Running with unavailable flags visibly falls back to local authoring.
- Tests must cover guest local authoring, no pre-consent requests, real 7-segment provider provenance, 401/403/422/429/503/fallback, concurrent edits and cancelled requests, 8 individual local scripts, no duplicate editor, and unchanged WebKit voice/Hypno consent and real MP4 gates.

## Superseding owner design decision · 18 November 2026: compact Therapy Voice
Owner approved a warmer large-type Voice card based on the provided lotus screenshot, keeping the classical sitewide header and fixed dock. Exact route/state: public Video Studio /en|ru|es/holistic-support/mandala, top Therapy, internal Voice. This is a visual specification, not a screenshot pasted as a static fake UI.

Four real tabs: Meditation / Voice / Practice / My Course. Remove Single practice / 8-session format switch. My Course reuses the eight-day plan plus local on-demand script writer; it is NOT eight finished video therapies. Ready single/course deep-link targets actual new tab. Voice shows only one actual phrase/voice narrator, 3 voices per gender with separate real Listen samples, record/upload my voice, device-voice demo, real free narration CTA, optional settings and edit text. No duplicated script panel or repetitive introduction. EN/RU/ES controls at 320/354/390/430 and 44px minimum tap sizes; warm ivory #FBF5E9, card #FFFCF7, text #143D3A, emerald #087E61.

Short **explicit and revocable** cloud provider consent remains required before any selected-text POST (details are expandable), even though long “I agree” copy is removed. Existing provider constraints, health/test-text privacy, voice generation, WAV mixing and attachment unchanged. No unapproved costs. Visual overlay, provider sound, exact protected CI and live alias/SHA are separately required acceptance evidence.


## 18 Nov 2026 · owner-approved A/B script review (supersedes the mobile first-screen layout above)

Approved owner screenshot: Therapy Studio on the existing `/{en,ru,es}/holistic-support/mandala` route in the sixth `Therapy` workspace. This **replaces** the previous default `Single practice / 8-session course` format switch and long filter form; it does not create a second editor or remove the legacy eight-day course engine.

1. Four compact tabs in one row: **Meditation / Voice / Practice / My Course** (RU/ES translated); the previous two-option format switch is removed. My Course opens the existing on-demand eight-session editor. Ready → meditation/course deep links must still open the correct tab.
2. The default Meditation tab immediately shows **two distinct locally prepared, scenario-aware scripts**, A and B. The tab switch changes the **full text in one readable panel**; no video thumbnails or repeated cards. Script source must be accurately labelled locally composed, not AI/provider-created.
3. Initial scripts aim for **approximately 30 seconds of narration**, not 3–12 minutes. The reviewer can approve either script and move to Voice, edit the currently selected script, or request two different local variants. No AI provider call, paid render, audio charge, subscription, storage or export occurs on initial screen load or choice change. Explicit voice-provider consent remains mandatory.
4. The previously proposed **60-second video repeating a 30-second clip** is not approved as working until the actual timeline/export repeat, voice continuity and video/sound E2E are independently implemented and verified. This release therefore uses 30-second scripts only; do not show a fake 60-second media state.
5. Keep the original video Canvas/editor under Goal/Montage/Ready. Hide it from the Therapy text-acceptance view to maximize space. Keep the existing page header, navigation, protected consent and optional audio-effect controls.
6. Acceptance: script options differ in EN/RU/ES; theme and short user goal affect text, crisis instructions block selecting a practice; choose B then Voice passes the actual approved B text to existing local/cloud voice (with opt-in), edits invalidate stale narration. Verify 320/354/390/430 iPhone/WebKit, button states, no horizontal overflow, no overlays, root browser errors, and existing course/Ready audio gates. A page screenshot or HTTP 200 is not E2E proof.

**Status at design approval:** implementation/CI/deployment are separate release gates; do not mark LIVE until Vercel READY/production SHA/canonical alias and the meaningful browser flow have been checked.

### Release repair and preserved Voice design
The 18 November production Voice redesign remains the single narrator. A/B approval passes the **exact** chosen text in client memory to the existing consent-gated voice editor. Phrase-only 40-character validation is retained for Ideas; a distinct approved meditation transcript of at most 650 characters is used for the Therapy Voice mode. A changed/rejected meditation invalidates previously attached audio. The mandatory macOS WebKit acceptance must run for the existing `feat/therapy-*` PR branch rather than be skipped by job filters. No new job, voice provider, payment, app route or release trigger is added.
