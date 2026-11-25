# My Coach · same-call semantic hints and 10-turn voice contract

Date: 15 November 2026 · implementation record, not a claim of LIVE model/voice acceptance.

## Objective

Director v4 now has six distinct deterministic method workflows, but keyword-only
evidence can miss the client's own ordinary words. Reuse the EXISTING free,
account-ZDR gated Groq GPT-OSS response to propose one non-authoritative,
client-sourced semantic hint; never issue a second model request or retain audio.

## Schema and provenance

The existing strict Groq JSON Schema adds required `clientEvidence` with exactly
`{kind,quote}`. Use `{kind:"none",quote:""}` when not clear; no JSON extras.
Other three response strings (`message`, `planSuggestion`, `evidenceQuote`)
retain their original meaning and limits. Old OpenRouter or locally authored
responses without `clientEvidence` continue to parse with a null hint.

Only these soft kinds are allowed: `goal_focus`, `desired_outcome`,
`concrete_example`, `constraint`, `internal_obstacle`,
`past_exception`, `existing_strength`, `positive_experience`.
The server must verify the quote is a literal 10–180-character substring of the
LATEST client-authored message, not a model invention or assistant statement;
negated, hypothetical, ambiguous and question-like candidates are discarded.
The model's confidence and label are NOT proof that an assertion is true.

The browser holds at most three such checked hints in one React ref, sends them
back with its existing consented private dialogue request, and never saves them
in localStorage, database, report, analytics, log or a second AI prompt.
The server re-verifies each hint against the recent client-authored history,
after the most recent explicit topic shift/correction. Older or forged hints
not backed by that history do not count. Safety, refusal and explicit boundary
turns clear stored hints.

Only *non-authoritative exploration signals* may use those hints.
Notably: `goalConfirmed`, `clientActionApproved`, `timingSpecified`,
`feasibilityChecked`, `ifThenPlan`, `summaryReviewed`,
consent, payment and method selection remain **unchanged and exclusively
governed by existing protections**. A working focus may be explored after
a subsequent concrete client episode; this NEVER certifies a final goal.

## Voice and time

No changes to TTS providers, STT behavior, permission gating or transcript.
The previously existing genuine callback-based synthetic Safari harness now
tests ten consecutive turns, automatic microphone rearming, two provider
failures and no repeated Play. This is NOT real physical-iPhone acceptance.
The 20-minute local foreground focus timer additionally stops counting while
the explicit Pause control is engaged; client-provided time remains a hint,
not an authenticated server clock or paid session entitlement.

## Verification and release

Run `npm run test:coaching:release` including the existing session-director,
semantic evidence and 10-turn voice tests; `node --test` for the focused
suites; Core, applicable Specialist, `hh-merge-check`, then native protected
merge and the single scheduled hourly Vercel release. Confirm exact served
SHA + real signed-in Groq/TTS/STT on iPhone in RU/EN/ES before calling voice
E2E complete. Do not bypass the site's one-hour ordinary release policy.

## Not implemented here

A server-persisted, strictly monotonic session/revision/time ledger requires
separate owner-scoped encrypted/RLS review, and truthful report saving needs
explicit account/report consent using the existing canonical Report v2/My
Coaching Plan infrastructure. These are intentionally NOT represented as
completed by a client-side semantic hint. There are still no guarantees that
arbitrary model language is fully understood or follows every step.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial;
post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
