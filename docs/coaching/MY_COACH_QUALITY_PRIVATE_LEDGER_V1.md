# My Coach QA · private event ledger and owner observatory

## Scope and status (20 November 2026)

This is an **opt-in, server-authenticated foundation**, not a claim that live My Coach
currently instruments each session. New route `/api/app/my-coach/qa` accepts only
strictly typed lifecycle *intent* metadata after authenticated same-origin requests.
It records nothing until the first-party UI adds a clear, optional consent control
and owner explicitly enables `HH_MY_COACH_QA_ENABLED=true` after migration.

This is deliberately separate from independent, overlapping PRs #5191 (End/PDF),
#5201 (outcome evaluator), #5198 (method-specific field audit, merged), and
#4731/#4854 (server session authority). Do not edit their active code or claim
new LIVE status from the presence of this code.

## Security and data contract

- Client start `{ action:'start',sessionId,personaId,locale,consent:true,
  consentVersion:'hh-my-coach-qa-consent-v1' }`; method is derived from current
  six-method server registry, not browser input. Close events carry just `action`
  (`summary_opened`, `client_stopped`, or `technical_reported`) and `sessionId`.
  `revoke` deletes all stored metadata for the account/session, regardless of
  current collection flag. All actions require verified current Supabase Auth,
  same-origin writes, JSON limits and a shared DB throttle.
- Client-supplied percentage, information field statuses, reason codes,
  transcript, topic, prompt, voice clip, health context and LLM verdicts
  are rejected. `recordMyCoachServerAudit` is **not available over the API**.
  It accepts only validated, current-topic output from the existing server
  method-information audit; copies six controlled IDs/statuses and discards
  quotes and client content. Until a trusted server turn calls it, evidence is
  unknown, not zero.
- A server receiving a client's `summary_opened` event verifies that *the client
  requested review*, **not** that a PDF was downloaded, a goal reached, or all
  material was understood. `technical_reported` is a user's report, not an
  independently verified outage. Closing a browser tab, losing networking,
  or being idle is not marked 'abandoned' automatically.
- No anonymous guest tracking; privacy-capped account-owned metadata only,
  RLS + FORCE RLS + no grants to `anon`/`authenticated`/`hh_app_inbox`, with
  account erasure cascade. An owner-only server page needs a separately
  verified admin session to activate its transaction-scoped read predicate.
- Consent/start alone NEVER enters evaluation denominators. A record becomes
  eligible for the owner cohort only after an authenticated server call writes
  its six-field method audit, marking `verified_turn_observed=true`. This prevents
  one client from inflating ratings with repeated fabricated Start calls. Sessions
  stopped before the first verified coaching turn remain outside measured coverage;
  this limitation must be displayed, not hidden.
- Every group requires >=20 distinct consented, server-attested records before revealing
  detailed rates. The owner page never shows session IDs, account IDs,
  client words, even as part of the underlying data response.

## Rollout prerequisites — do not skip

1. Exact-head protected CI, Security/Privacy/RLS specialist, test and code review.
2. Apply the additive migration once via the existing reviewed Supabase migration
   procedure after source merge. Verify schema, grants and RLS with authenticated
   owner vs outsider DB role tests; never apply DDL unreviewed from a chat.
3. Reconcile PR #5191's End/PDF and #5201's model-specific evaluator.
4. Under the normal owner-approved UI screen, add explicit optional QA consent
   separate from provider speech/transcription consent. When enabled, invoke
   `start` on real user gesture and send `summary_opened` only when Summary
   actually opens; send `client_stopped` only on explicit stop, never inferred
   `beforeunload` or background connection loss.
5. Tie successive authenticated server-generated My Coach turns to the same
   account/session ID before invoking `recordMyCoachServerAudit`; never trust
   browser stage flags or returned model speech as confirmed answers.
6. Evaluate client review and PDF save as separate verified server events;
   only a true client-confirmed close-out can justify outcome completion.
7. Verify signed-in WebKit/iPhone EN/RU/ES flows with consent refusal, revocation,
   duplicate start, conflicting persona, cross-account access, 20-minute session,
   network drop, silent tab closure, interruption and corrected topic. Compare
   snapshot results against actual account-owned server events.
8. After gates, use the existing hourly publisher only. Check canonical LIVE
   alias, deployed SHA and live private admin access. No additional provider,
   scheduled workflow, CI fan-out, or Vercel manual deployment.

## Admin route

`/admin/coaching-quality` is login protected and `noindex`, with 30-day window.
The opt-in cohorts are provisional and intentionally use human-readable **intents**:
`Summary opened`, `client explicitly stopped`, `technical issue reported`,
`outcome not observed`. They are not clinical outcome scores or public coach rankings.

## Deferred / future analysis

PR #5201 contains trusted lifecycle/coverage calculations and root-cause codes.
Once its exact-HEAD checks and merge succeed, wire this ledger into the
same core without duplicating its algorithm, and include method-specific
reason breakdowns in the owner UI after privacy review. Never infer dropout
from timebox 20:00 or lack of further turns. Add review adjudication for
ambiguous evidence and monitor false-positive reasons before changing prompts.
