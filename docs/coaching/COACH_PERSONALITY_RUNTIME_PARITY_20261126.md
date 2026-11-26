# Coach Personality Dialogue v2 · runtime parity and evaluation
Follow-up to merged #5702 / CP-07, CP-09, CP-11–13. Preserve existing privacy, method evidence, consent and provider restrictions. No new service or extra inference.

## Implemented in this slice
- Gemini Free Live checkpoint appends whole, compact delivery hints to the existing mandatory guidance only if they fit its 620-character budget. The existing authorized method, opening, profile and course text wins; no extra request or pre-speech guarantee. Reconnect cue preserves identity.
- Eight coaches × ten independently authored fictional mini-dialogues (80); all RU/EN/ES (240). One relevant example is selected by authorized stage/mode for text prompts, explicitly not a client fact or a script to repeat. Direct questions and social chat receive no scripted example.
- 60 deterministic Director input situations × eight personas × three locales = 1440 policy checks, including 96 persona/scenario holdout combinations. These are not 480 independently authored natural multi-turn transcripts, nor evidence of real-model quality. The holdout is not in runtime prompts.
- 24 optional practice templates (eight coaches × three Clarity days) × three locales, plus a pure first-day homework offer adapter. The adapter requires an authoritative reviewed timebox receipt, at least 1200 active seconds and exact unresolved protocol questions. Reject disconnect/pause/other days and skip confirmed or client-skipped rows. No new storage or grant. It is not yet wired to Daybook UI/persistence.

## Dependency handoff (do not overwrite active branches)
- #5690/#5692 thematic checkpoint changes must preserve the compact personality wrapper and authoritative 620 limit.
- #5696 owns approved media registry/playback. Consume only server-reviewed semantic cues and actual speech phases; never claim this voice guidance plays an approved clip or generate new media.
- #5700/#5701 own the three-day Daybook and course results. Use the practice catalog as optional separate presentation; call homework adapter only from the verified server-owned logical-session close receipt, not from an untrusted clarityTimeLimitReached client annotation. Keep exact missing fields, review and persistence. No homework on interruption.
- Still open: authoritative timebox/resume integration and persisted Daybook readback; per-coach reaction asset coverage and seam QA; complete 480 independently authored multi-turn benchmark, blind model/voice human acceptance, mobile and signed-in production E2E. Do not call these LIVE until verified. No extra deployment outside the existing hourly publisher.
