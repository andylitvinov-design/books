# Coaching Session Director v4 · method-specific core (15 Nov 2026)

Status: implementation patch, NOT proof of LIVE provider conversations.

## Scope and compatibility

Existing authenticated My Coach endpoint, existing Groq GPT-OSS / approved free ZDR fallback,
existing persona registry, Fish/Chirp voice and mobile layout are unchanged. The public
pilot is Mira, Sofia, Max and Alex. Historical personas remain internally valid.
No new vendor, API key, DB table, stored transcript, paid call or browser control is added.

## What v4 changes

The director now computes a separately named method step before each generation,
not merely the common GROW-like phase:

- GROW: goal, reality, options, way_forward, review
- TGROW: topic, goal, reality, options, way_forward, review
- WOOP: wish, outcome, internal_obstacle, if_then, review
- OSKAR: outcome, scaling, know_how, affirm_action, review
- Solution-focused: preferred_future, exceptions, strengths, experiment, review
- Appreciative Inquiry: discover, dream, design, deliver, review

Method steps have specific missing-evidence requirements and intervention IDs.
A goal self-stated by the client and followed by a concrete client-authored
example forms only a **working focus**. It allows non-robotic exploration
without inventing explicit final goal confirmation. Correction/topic change
invalidates that working focus. It never constitutes plan consent.

The next step is the first incomplete step; old confirmed flags do not allow
skipping earlier gates. Client correction/topic changes reset earlier evidence
via the existing `director-evidence.mjs` window. Method-specific questions are
localized in RU/EN/ES for both generation prompts and provider-free fallback.

The checked text still flows through `enforceCoachSessionDirective` before
existing TTS. New high-confidence vetoes include premature action/option
questions, WOOP internal obstacle before wish/outcome, and OSKAR scaling
before its outcome. Safe free-form reflections survive; unsafe claims,
pressured advice and invented plans remain rejected.

The four publicly selected personas preserve their registered primary method;
neither client keywords nor the voice engine can override it. Direct requests,
correction, refusal, no-advice, safety and an optional 17-minute close retain
their current priority. An explicit WOOP if/then choice can be recognized
without forcing a generic GROW two-options requirement, but it is never
created from assistant speech, a bare yes, a hypothetical or negated client turn.

## Validation

Run `node --test tests/coach-session-director.test.mjs`, then the existing
`npm run test:coaching:release`, scoped lint/TypeScript/Next, exact-head Core,
required Specialist and `hh-merge-check`.
Focused tests cover each method's real step ID, ordered gates, client corrections,
localized method questions and method-specific semantic vetoes. Test on a physical
iPhone RU/EN/ES with 10 consecutive naturally spoken client/coach exchanges.

## Known limitations / next acceptance gates

This is a **conservative rule-based method engine**, not a fully calibrated
semantic interpreter. User-provided recent chat history remains untrusted and
bounded; no server-authoritative encrypted session snapshot or durable stage
ledger exists in My Coach. The browser-provided time hint is not a trusted
server stopwatch, and 20-minute completion is voluntary, not guaranteed.

The project already has Report v2 / My Coaching Plan contracts, but this patch
does not claim to implement new My Coach report storage or consented import.
A later audited release must integrate the existing account-encrypted report
path and separate user save/continuity consent. Never use raw browser history,
assistant-generated text or heuristic step flags as authorized commitments.

A merged PR, Vercel READY or source-only tests alone do not demonstrate
live Groq correctness, actual iPhone microphone availability or natural audible TTS.
Keep those as distinct acceptance gates. Do not enable billing or weaken privacy
to satisfy test coverage.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
