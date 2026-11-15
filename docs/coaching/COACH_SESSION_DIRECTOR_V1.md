# Coach Session Director v1 — controlled method, recognizable persona

**Owner scope:** existing authenticated `/{en,ru,es}/coaching/sessions` My Coach text/voice dialogue, not a second coach runner or new client database. This is a bounded source release, not proof of a completed longitudinal session controller or clinical benefit.

## Contract of one turn

1. Safety, explicit stop/skip and first-party Wisdom Library are handled **before any model request**, as before.
2. Validated server-owned persona ID resolves to its reviewed first primary method. No lexical suggestion from the client or model silently changes that method; the currently registered method IDs are `grow`, `tgrow`, `woop`, `oskar`, `solution_focused`, and `appreciative_inquiry`. The chosen persona and approved settings remain unchanged.
3. Existing Coaching Session Protocol and shared Coach Mind derive a **provisional** phase and conversational act from explicit client words. Existing Coaching Methodology stage readiness is consulted conservatively: unverified text and model guesses do not constitute confirmed progression. The current stage is not persisted in this stateless My Coach chat.
4. A single server-selected intervention goes to the **existing Groq (free+ZDR gated) / verified OpenRouter fallback** in the already validated, three-string JSON response contract. A longer reflective answer may be allowed; no forced question sequence, no additional model call.
5. The existing model parser still protects format, one-question maximum, coercion, repeated questions, unsupported goals and invented commitments. The new post-parse gate additionally rejects obvious early-stage commitments and suppresses unrequested `planSuggestion` / `evidenceQuote`. Failures remain authored offline rather than fabricating a usable answer or an action.
6. The existing iPhone microphone, full-spoken-answer, Fish/Chirp and replay paths are unchanged. Text is the authority for speech; no provider key or private dialogue is logged by this change.

## Method vs persona

The **method** determines which conceptual step may be explored. The **persona** determines cadence, directness, attention and vocabulary. Alex stays structured with TGROW; Mira begins with GROW, Sofia with Solution-focused, Lea and Ray with Appreciative Inquiry, Max with TGROW, Noah with WOOP, Iris with OSKAR. No persona may override risk/consent boundaries or claim a client's decision.

The current My Coach composer does **not** have a separate explicit method picker or an authoritative persisted method snapshot. The first registered method is therefore a stable per-persona default. An independently reviewed next stage would expose consented method selection and immutable session state in the existing encrypted personal coaching envelope rather than trusting client-supplied history. Do not describe this v1 as that full completion.

## Test / release gates

- Existing `test:coaching:release` now includes synthetic RU/EN/ES cases for all 8 personas, greeting, correction, topic change, no-advice, early-stage plan protection, and output safety.
- Exact-HEAD Core, relevant Specialist, `hh-merge-check`, protected merge and Vercel READY/production SHA remain mandatory.
- Real production acceptance remains independent: a consented `mode=ai` multi-turn session with Alex and Mira, audit method/style fidelity and a physical-iPhone text→voice parity check. Offline or mocked responses are not a substitute for `mode=ai`.
- Future hardening: server-authoritative encrypted phase snapshot + explicit stage transition evidence + comparative blinded expert ratings on 15 whole-session QA scenarios. Those are not claimed as delivered by this source patch.

No new DB, migration, cron, external provider, service, open-ended model retries, or paid capacity. Preserve current consent, ZDR/free limits and auth.
