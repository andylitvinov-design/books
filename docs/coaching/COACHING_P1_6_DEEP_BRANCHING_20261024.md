# Holistic House · Coaching Intelligence P1.6 · Deep offline branching

**Date:** 2026-10-24
**Epic:** [#1774](https://github.com/andylitvinov-design/books/issues/1774)
**Status:** proposed implementation on an isolated PR branch until CI, SHA and production E2E are verified.
**Cost:** €0 additional AI/provider spend. Rule-based, curated and fully local first-party client/server evaluation; NOT a generative AI coach.
**Reuse:** #1703 versioned DB model catalog, #1701 session runner/voice/owner-encrypted save, #1783 authored adaptive wording, #1787 opt-in micro-reflections and plan, #1795 continuation. No new DB schema, chat interface or second answer store.

## 1. Screen grammar

A single authored coaching question stays the focal point of each screen; the original published `questionId` and schema version never change.

1. Compact header: existing model/stage, progress, close/back; background photo from existing first-party artwork.
2. **Why this stage**: one short declarative sentence in EN/RU/ES, **not a second question**. The DB `key_question_i18n` was previously rendered as an extra question under the main one; replace its inline presentation with a purposeful statement. Legacy authored hint remains when supplied.
3. **One question**: the existing published question or already-shipped optional guided wording (with one-tap return to original); speaker speaks exactly that visible text.
4. **Response**: published 4–5 chips or self-rating 0–10, with optional editable text/opt-in mic. Never auto-save on selecting a chip. Standard answer persisted with its pinned question ID.
5. **Deep optional reflection slide** (max 2/session; max 1/category): one contextual authored question based on explicitly saved answers, four editable quick replies, own free text, Back / Save & Continue / Skip. Its answer is an optional client-authored *note*, not inferred by AI; after actual server save ACK the next original question opens.
6. **Completion**: existing evidence-only recap plus explicitly client-edited/confirmed action plan. Noncommittal `pause`, timing-only selections, or resources must not become fake commitments.

This is **not** a fixed psychological questionnaire: choices guide reflection and do not produce clinical scores or inferred traits. On 320–430px / iPhone Safari use 2×2 reply chips with minimum 44px targets and fixed footer; question area may scroll internally with the keyboard, never pushing navigation outside the viewport.

## 2. Verified model-specific attachment points

| Published scheme | Primary stages | Eligible deep reflection |
| --- | --- | --- |
| grow_quick_v1 | Goal → Reality → Options → Will | Reality; Options |
| grow_reflect_v1 | Frame → Goal → Reality → Options → Will → Review | Reality; Options |
| tgrow_compass_v1 | Topic → Goal → Reality → Options → Will | Reality; Options |
| woop_habit_v1 | Wish → Outcome → Obstacle → if–then Plan | Obstacle only; final authored if–then plan never rewritten |
| oskar_resources_v1 | Outcome → 0–10 Scaling → Know-how → Affirm → Review | Scaling; Know-how (at most one `reality` follow-up) |
| solution_focus_quick_v1 | Preferred → 0–10 Scale → Step | Scale |
| solution_focus_reflect_v1 | Preferred → Exceptions → Scale → Resources → Step | Exceptions; Scale or Resources (bounded to 2) |
| clear_dialogue_v1 | Contract → Listen → Explore → Action → Review | Listen / Explore (one `reality` slot) |
| fuel_development_v1 | Frame → Understand → Explore → Plan | Understand; Explore |
| appreciative_future_v1 | Define → Discover → Dream → Design → Destiny | Discover; Dream / Design |

The catalogue and official question/choice order are **not** mutated.

## 3. Explainable decision priority

Only user-affirmed data in the active owner session / guest tab can influence the decision, with at most the five preceding question answers considered. The selected question must be part of the pinned published scheme; for signed-in users the server recomputes the permitted pathway from the **stored** account-specific answers, never trusts a client-supplied template name or state.

1. Deny deep add-ons for empty answers, clear urgent-safety statements, absent verified question, unselected/pending original answers, two recorded reflections or another reflection in the same category.
2. An explicit 0–10 **subjective** choice leads to low 0–3 / middle 4–6 / upper 7–10 resource prompts, **not** a validated clinical interpretation. Unparsed text is never interpreted as the value zero.
3. Explicit `pause` → voluntary return marker; `ask` → user-selected question to a person (never automatic outreach); `learn` → missing fact; `reframe` → test a supposition, not insist on a correction.
4. Relevant **pairs of explicitly stated constraints**: limited time + uncertainty, limited time + hesitation, uncertainty + hesitation, limited time + feeling stuck. Suggest a small reversible experiment or fact check, never claim a cause, psychological trait or outcome.
5. One explicit cue: time, clarity, hesitation, stuck, resources or support; offer corresponding options.
6. Otherwise, use a neutral reality/option-specific question and editable options. The original published framework and all required answers remain intact.

Each micro-slide includes a grounded why-line, max four compact authored response suggestions and a typed/microphone answer; Quick Choice copies **editable human-readable text**, not a clinical category or promise. One-tap skip remains possible. There are 24+ localized versioned authored pathways; unknown responses do not trigger a fabricated interpretation.

## 4. Privacy, persistence and compatibility

- Guest: React memory only; no analytics/events, no CRM lead, no external call, no implicit Google save or account transfer. Explicit copying alone.
- Signed-in: existing `app_private.personal_coaching_sessions` sealed user payload via authenticated first-party API, account-scoped RLS and optimistic `revision`. The server verifies exact `questionId`, `followupKey` and persisted original answer; rejects forged or stale notes. On original-answer edit, invalidate its own dependent reflection.
- Historical v1 saved notes remain readable; pending v1 tabs may still save their previously offered v1 key. New v2 responses do not overwrite old sessions, adjust model versions or modify Egyptian/Greek courses.
- Safety: no diagnoses, homeopathy prescriptions, trauma assertions, unsolicited prompts outside one screen, SMS/Telegram/WhatsApp/push, background agent loops, provider or spending. Do not share questionnaire text with analytics/pixels. Mic/voice remains explicit opt-in browser feature.
- The existing editable action plan is not an auto-booking, lead, payment, reminder or contact permission.

## 5. Acceptance / QA

Focused tests: all 10 actual published scheme stage sequences, all three locales, v1 backward compatibility, four pair paths, five explicit choices (pause/ask/learn/reframe/plain), 0/3/5/8/10 score boundaries, forged key/stale answer rejection, optional note caps, direct owner-save transitions, no provider calls, JSX parse, 320/375/390/430 CSS. Run existing `npm run test:coaching:release`, `tests/public-coaching-discovery.test.mjs`, build/typecheck/lint, and relevant SQL/RLS read-only checks.

Merge only into live `codex/public-book-library` after reviewing intervening concurrent changes; Vercel READY on same exact SHA and canonical alias must be verified. Physical authenticated iPhone Safari save → reload/relogin → copy/export/delete and independent second-account negative E2E remain open until genuinely exercised. Production READY ≠ true client E2E.
