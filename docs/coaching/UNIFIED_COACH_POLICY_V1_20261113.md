# Unified Coach Mind: shared dialogue-policy integration

Goal: use the existing Holistic Intelligence Coach Mind RU/EN role policy for the existing My Coach and private Coaching Brain pathways. Personas remain styles rather than separate models.

Scope:
- Shared pure policy: current turn, confirmed client phase, next move, no-advice and correction priority.
- Generated answers cannot repeat a recent coach question; two consecutive coach questions cause a no-question response or reviewed offline fallback.
- Offline answers remain labelled offline; no invented AI success, account save, booking or clinical interpretation.
- Existing authentication, separate consent, zero-cost/ZDR provider gate, rate budget, safety, reports and privacy are preserved. No new model, GPU, key, endpoint, database, cron or service.
- ES retains prior persona instruction and compatibility.
- The My Coach UI file is currently owned by open #4560, #4574 and #4563; fixing its client-only userCount progress must follow their protected merge/ownership handoff. No overwrite of their HEAD here.
- Qwen ownership is not evidence of live Qwen inference; the existing My Coach model remains separate unless a verified consent-compatible shared provider is available.

Validation: authored RU/EN cases, 20 long synthetic contexts, duplicate-guard, offline boundaries, existing protected CI. Unit checks are not independent real model evidence. LIVE requires serving Vercel SHA and real signed-in reply (mode=ai, not offline).

Related epics: https://github.com/andylitvinov-design/books/issues/4016 and https://github.com/andylitvinov-design/books/issues/4367
Release contract: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md

## P0 first-turn social repair (13 Nov 2026)

An owner screenshot showed My Coach Alex responding to "Привет как дела" by asking how to measure an unstated goal. Added greeting-only RU/EN/ES classification, shared Coach Mind rapport guidance, an output guard against premature goal metrics, and a clearly offline-labelled authored greeting. After the user states a real goal the established coaching protocol resumes; no invented user state, new model, API, consent bypass, voice/UI changes or expenses. Real signed-in multi-turn inference remains a separate acceptance gate.

## Client-side offline handoff and legacy voice test correctness

`MyCoachLiveDialogue.sendMessage` previously bypassed the shared Coach Mind whenever the model probe was unavailable and advanced a hard-coded GROW question by userCount. The existing, browser-only fallback now invokes `coachingBrainStageDecision`, `selectCoachingBrainMethod` and `offlineCoachingBrainReply` from the same already-imported pure coaching module. Safety/stop still win; the original `coachStagePrompt` remains a last-resort backup only. The mode and offlineReason remain visible without transmitting client text to an unverified model. This covers a greeting-only first turn in the real iPhone UI path. No voice/ASR/TTS implementation is changed.

The original `tests/coaching-live-voice.test.mjs` asserted the deleted `currentCoachPrompt` token even though the current UI renders `conversationPanel`. Its one-word assertion is updated to the actually rendered transcript, matching existing separate voice PR #4560. The substantive behavior assertions remain intact; this is not a bypass of browser/voice tests. Coordinate the simultaneous voice/Groq PRs before resolving any merge conflict; no other lines of their active branches are modified.
