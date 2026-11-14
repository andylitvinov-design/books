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
