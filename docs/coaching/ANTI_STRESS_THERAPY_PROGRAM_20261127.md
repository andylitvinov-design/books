# Anti-Stress · Inner Balance / Антистресс · Внутренняя опора
Decision 27 November 2026. New independent My Coach program; not a rename of OPORA or old Clarity & Anti-stress. Source candidate, not a released clinical service.

## Program settings (authoritative catalogue)
Every program definition has type coaching or therapy, determined before the first greeting and not by coach persona, provider, or a model response. Existing Clarity/Clarity three-day, Goal, Business and standalone introductory/eight-session/Meaning Axes entries retain coaching behavior pending a separate owner reclassification. New Anti-Stress has type therapy. Unknown program types fail closed. This is an editorial classification decision for the new implementation, not a retroactive change to existing course runs.
Persist programId, programType, scenarioVersion and immutable run/session IDs in the authenticated course run at explicit start. A returning coach must use the same saved type, preferred name and previous protocol. Never infer treatment consent from selection; any future change of mode requires an explicit new choice and an independently versioned run, not reinterpretation of a previous protocol. Show the program type and scope before consent, including the AI limitations. Do not let query params, assistant claims or client messages override the server-owned program definition.
- Coaching: client-led goals, options, realistic next steps, respectful pacing.
- Therapy: self-regulation and emotional support; short warm reflections; longer natural silence; one gentle question or none; no push toward goals or positive outcome. Permission for every exercise, right to adapt or decline. The mode overrides persona/method/time pressure but never safety. AI is not a clinician and cannot diagnose, promise treatment or replace professional support.
- On immediate danger or urgent medical symptoms: existing safety path, not an exercise. On rising distress: stop exercise, orient to the present, offer human support. Never force breath, imagery, eyes closed, touch, disclosure or exposure; no trauma reliving or symptom interpretation.

## Course contract
Program ID anti-stress-three-session; 3 x 900 active seconds = 2700 seconds. Six progress bars, 15 minute dots per session; timing is not progress or proof. Before active timer: authenticate, restore matching prior protocol/name, introduce mode and scope, ask whether client wants to start or resume. Count only trusted connected/consented active time; pause, dropout and reconnect never close a logical session or reset time. Use the existing shared account/day free-slot policy if this program is later offered free; no price/free entitlement approved here. Never auto-enroll, auto-start, auto-charge or add homework after a disconnect.
All three sessions use the canonical scenario module (EN/RU/ES). Time windows: contact 0–2; observation 2–4; preparation 4–6; practice 6–11; reflection 11–13; integration 13–15. Mandatory consent and safety take priority; optional ratings and questions may remain blank. The practice stage contains several cues but the coach guides ONE at a time; leave silence, respond to the client, no checklist. If a client wants more time, skip optional prompts, close gently at the cap, never force completion.
Sources for general stress skills (not a clinical validation of this proprietary course): WHO Doing What Matters in Times of Stress https://www.who.int/publications/i/item/9789240003927 ; NHS Breathing exercises for stress https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/ .

## S1 · My Ground / Моя опора
Skill: orientation to present-day neutral support.
| Window | Coach action and sample RU | Protocol fields |
|---|---|---|
| 0–2 | «Как вам сейчас комфортнее устроиться?» Invite permission and orient to safe surroundings; no assumption of safety. | Existing opening + continuity |
| 2–4 | «По чему вы замечаете начало напряжения?» Optional current tension rating. | stress_before, early_signal |
| 4–6 | «Что комфортно замечать: стул, пол или что-то вокруг?» Ask permission for selected practice. | ground_anchor, practice_consent |
| 6–11 | Offer supported posture, eyes open; neutral object, sound, floor/chair contact separately. Wait 10–20 seconds or longer on request; repeat preferred cue only. | practice_status |
| 11–13 | «Что вы заметили, если что-то изменилось?» Optional tension re-rating without suggestion of improvement. | stress_after, ground_observation |
| 13–15 | «Когда вам было бы удобно снова заметить эту опору?» Confidence optional. | skill_confidence, ground_when |
Result: self-reported tension before/after; early cue; chosen anchor; actual practice status; own observation; confidence and optional carryover.

## S2 · My Calm / Моё спокойствие
Skill: gentle regulation, no forced relaxation.
| Window | Coach action and sample RU | Protocol fields |
|---|---|---|
| 0–2 | With permission summarize the actual previous cue. «Как вам сейчас?» | Existing opening + continuity |
| 2–4 | «Какой сигнал сейчас можно заметить без лишнего напряжения?» Optional rating. | stress_before, calm_signal |
| 4–6 | Offer natural breathing, gentle shoulder release if comfortable, or external focus. Ask permission for chosen practice. | calm_variant, practice_consent |
| 6–11 | One short round: ordinary unforced breath OR gentle shoulder release OR neutral external cue; pause. Ask whether repeat or stop. No holds, forced breathing, intense recall or uncomfortable body scan. | practice_status |
| 11–13 | «Что изменилось, осталось как было или стало некомфортно?» Optional same-scale re-rating. | stress_after, calm_observation |
| 13–15 | «В какой повседневный момент вам было бы удобно попробовать это?» Optional confidence. | skill_confidence, calm_when |
Result: actual regulation option and response, before/after tension, confidence, personal cue.

## S3 · My Resource / Мой ресурс
Skill: choosing accessible support and rehearsing its use.
| Window | Coach action and sample RU | Protocol fields |
|---|---|---|
| 0–2 | With consent recap confirmed previous practices; honor refusal. | Existing opening + continuity |
| 2–4 | «Какая поддержка сейчас была бы полезна?» Optional rating. | stress_before, resource_need |
| 4–6 | Choose neutral object, client's own supportive phrase, short rest or trusted person; ask permission to rehearse. | chosen_resource, practice_consent |
| 6–11 | Practice an if–then sequence for a mild ordinary situation without reliving it; use prior anchor only if wanted; offer fallback. | practice_status |
| 11–13 | «Что вы заметили, пробуя или рассматривая этот ресурс?» Optional rating. | stress_after, resource_observation |
| 13–15 | «Если заметите ранний сигнал стресса, какой небольшой шаг поддержки могли бы выбрать?» Optional confidence. | skill_confidence, resource_plan |
Result: support need, selected resource, actual response, optional if–then plan and confidence; three-session course report shows separately all verified session results.

## Three distinct private documents
1. Log: append-only dialogue and author/visit attribution, time segments and interruption events; consent and owner scope required for durable retention.
2. Protocol: exact session/run/version, program type, existing opening/consent/name/continuity, stable field ID, authored question, verified source evidence ID, review/confirmation, status (confirmed, skipped, not_explored, needs_confirmation), optional value, active seconds, stage, interruption, revision. Use a server-reviewed ledger; client-generated reviewed=true, provider text, and repeated/ambiguous rows are not authority. Persist partial drafts after each acknowledged turn even on interruption using the existing private infrastructure; no other run or account. A skipped question is an exercise of autonomy, not failure.
3. Session result: derive from only confirmed fields of matching version; no inference from dialogue, no fabricated scores. Include stress.before/after/change (after minus before; positive means more self-reported tension, not a failure), signalOrNeed, chosenResource, observation, carryover, practiceConsent, practiceStatus, confidence, partial, unresolved. Preserve 0 as real rating and null as unknown. Practice states attempted/adapted/stopped/declined/not_attempted; an attempt is not mastery. An attempt without recorded practice permission stays unconfirmed. A planned step is not an attempted practice. Result is editable only through reviewed corrections with provenance. No diagnosis, efficacy claim or cross-session average.
UI: two before/after bars on 0–10 scale with missing explicitly unmeasured, a skill confidence gauge, chosen anchor/resource and own words, actual practice status and optional next step. Course dashboard: three separate skill cards and paired session-level self-ratings only; no default scores or invented trend. Optional tap-first practice and reflection (one action per screen, no right/wrong) after consent, not assigned homework automatically.

## Implementation and activation gates
Implemented in this branch: two server-catalog mode profiles; existing shared text/Gemini prompt course entry includes mode instruction; no-course text falls back to coaching; new independent RU/EN/ES anti-stress scenario registry with six time windows, per-field questions, deterministic therapy Director seam, consent-gated reviewed result projection and course rollup, test suite registered in existing test:app. Existing Clarity runtime and transport veto untouched. No paid resources, production flag, database or deployment changes.
Not yet active: anti-stress is deliberately excluded from the active course-session normalizer until generic authenticated runner, explicit mode/consent preflight, exact courseRun/session binding, configurable trusted 900s clock + shared entitlement, safe reconnect/cross-coach restore, authenticated writer/RLS and private three-document UI consume the new contracts. Do not expose a working Start CTA or treat a prompt as clinical behavior. Wire actual text/voice Director to antiStressDirective and antiStressLiveInstruction without legacy GROW/20-minute overrides; verify pause/safety/decline, natural silence and exact question binding in real provider tests. The generic program-type persistence and UI onboarding are still integration tasks. Existing draft #5701 is upstream; no production activation until both verified, protected CI, authenticated iPhone end-to-end and approved release window. No unapproved free/payment policy.
Verification: four exact fetched regression bodies, 248 isolated JS assertions (assert shim; not native CI, DB or browser). Native tests: node --test tests/anti-stress-therapy-course.test.mjs. 
