# Holistic House · Video Studio → Therapy · approved mobile UI (12 Nov 2026)

## Scope / decision
Owner approved mobile-first warm ivory + emerald design with large photographic hero and spacious touch controls. Existing top row of six workspaces becomes Goal → Ideas → Montage → PRO → Ready → Therapy. Internal workspace key remains effects for compatibility; older Hypno effects engine is retained under Therapy → Practice → Optional visual and audio effects, not presented as the main therapy composer.

Inside Therapy, the FIRST action is a two-choice format switch:
- Single practice: one local meditation draft.
- 8-session course: existing local planner makes an eight-session topic outline and draft of session 1, NOT eight completed narrated videos. Full-course production remains under issue #2503.

Then three subtabs: Meditation / Voice / Practice. Meditation reuses MandalaPersonalMeditation with the current goal, technique, pacing and optional focus accents; user explicitly generates and edits text locally. Voice reuses the existing device voice / consented cloud narration and MandalaAffirmationVoice phrase voice implementation. Practice offers navigation to voice/narration and to the original video phrase editor in Ideas; extra legacy Hypno visual/audio effects are in an opt-in disclosure.

## Guardrails
- No autonomous API purchase, voice generation, film render, checkout, CRM or medical diagnosis.
- Cloud voice consent unchanged; only local text until explicit user provider action.
- Eight-session option must not be described as eight delivered videos or clinical therapy.
- No new DB schema, API route, extra hero player, duplicate video renderer or second public editor.
- EN/RU/ES mirror; target 320–430px, accessible touch targets.
- Original Hypno wave/quiet-speech/binaural tests remain reachable via Practice > Optional effects.

## Acceptance gates
Node unit and targeted tests; lint, typecheck, build; macOS WebKit video/audio/export and no-bill checks; mobile screenshots. Exact PR HEAD Core/Specialist and hh-merge-check; protected merge to production codex/public-book-library; Vercel READY with matching canonical holistichouse.vercel.app alias. Real narration, private delivery, payment and eight mastered assets are separate pending gates.
