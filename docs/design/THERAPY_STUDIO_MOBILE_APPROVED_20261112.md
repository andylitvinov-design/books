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
