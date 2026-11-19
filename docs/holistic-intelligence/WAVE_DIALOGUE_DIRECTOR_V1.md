# Wave Dialogue Director v1 — implementation and acceptance

**Code:** `lib/holistic-support/dialogue-director.mjs` (shared, pure); `tests/dialogue-director.test.mjs`.

## Purpose
One five-stage nonclinical coordinator for Secretary Mind, voluntary Secretary Psychologist, Coach and verified Consultant recommendations. No second AI model, no Qwen requirement, no provider calls, no background job, no new persisted transcript. Stages: `contact → understand → explore (when consented) → recommend → handoff`. A selected service and a clear booking request can skip irrelevant questions.

**Evidence, not turn counts.** Every turn recovers explicit current-client facts (situation, desired change, challenge, attempts, format constraint) from a bounded window. Explicit corrections override older guesses; assistant text never creates evidence. `completenessPercent` is *only the percentage of fields explicitly covered*, not psychological certainty or calibrated accuracy. A factual question is answered by the existing verified FAQ/Consultant before any psychological question. No-advice/no-sales boundaries and pauses remain authoritative.

## Contracts
- Server alone validates safety, authentication, separate role consent, signed continuation state, published service identity, cost and CRM send.
- `nextAction` is advice to the existing host, not an executed side effect. `limits.canBook/canPay/canSendToCRM=false` is invariant.
- At most one optional new question and two verified options. If source-verified suggestions are absent, do not create them or claim successful booking.
- Public progress projection contains only booleans and stage metadata, no raw client text, emotion diagnoses, personal photos, accounts or private facts.
- Pre-existing Telegram V3 consent, STOP, provider and transaction owner remain unchanged. Do not assume closed, unmerged #5012 is on LIVE; existing signed Telegram flows remain authoritative.

## Scope and production acceptance
1. Run `node --test tests/dialogue-director.test.mjs tests/ali-guided-intake.test.mjs tests/crm-wave-staged-dialogue.test.mjs tests/empathy-mind.test.mjs tests/consultant-mind.test.mjs` and required exact-HEAD Core, CRM, Public Services, Specialist, privacy and merge gates.
2. Independently verify actual RU/EN/ES mobile website and consented Telegram multi-turn journeys: corrections, no-advice, two published service options, client-reviewed summary, Send/Edit/Cancel and genuine CRM receipt. Verify no duplicate client, missed lead or invented appointment.
3. Distinguish `PR` → `MERGED` → served production alias SHA → live functional acceptance. Do not trigger additional Vercel builds; use existing hourly publisher only.
4. Independently evaluate 600+ **new** dialogues (including 8–12 turns), multilingual unfamiliar phrasings, factual interrupts, refusals, and service-fit outcomes before quoting real-world percentage gains.

Roll back by reverting this additive module and its small caller integrations; the original verified handoff and safety flows remain in place.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=bounded_pure_validation; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
