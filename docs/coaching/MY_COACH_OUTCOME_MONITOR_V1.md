# My Coach — session completion and evidence coverage monitor (v1)

## Scope and delivery boundary

This adds a **pure, testable evaluator and anonymized cohort roll-up**, not a claim that My Coach currently saves all conversation events. The existing live dialogue remains ephemeral. PR #5198 owns the distinct six fields for every methodology; PR #5191 owns explicit client review, PDF and consented encrypted archive. Their protected merge and privacy-reviewed server wiring remain prerequisites for end-to-end metrics. No new service, provider call, cron, storage or tracking cookie. Do not show dummy numbers in the admin dashboard or call this a live verified metric before event ingestion and real-device E2E are proven.

Entrypoints:
- `evaluateCoachSessionOutcome`: one text-free, private, deterministic QA receipt for **one** authenticated and server-observed session.
- `aggregateCoachSessionOutcomes`: owner-only de-identified cohort report with denominators, stage field gaps, reasons, separate technical/client/safety outcomes and minimum comparable sample sizes.

## Individual coach protocol

For every persona, the primary method (and not the AI's guess) determines its own six information fields. They are intentionally distinct from method stage order and the cross-method generic six headings. Optional fields do **not** lower mandatory coverage. Version-map must be kept consistent with `lib/coaching/coach-information-coverage.mjs` after #5198 is safely merged; mismatches are build/review blockers, not silent fallbacks.

| Persona | Method | Mandatory fields | Optional fields |
|---|---|---|---|
| Mira | GROW | goal, situation, obstacles, options_action | motivation, resources |
| Max | TGROW | topic, goal, situation, obstacles, options, action | — |
| Sofia | Solution-focused | future, exceptions, strengths, experiment, review | motivation |
| Alex | TGROW | topic, goal, situation, obstacles, options, action | — |
| Merlin | Appreciative inquiry | discover, dream, design, deliver, review | values |
| Harry | OSKAR | outcome, scale, know_how, action, review | motivation |
| Noah (legacy) | WOOP | wish, outcome, obstacle, if_then, review | resources |
| Lea, Iris, Ray (legacy) | Registered method | Same method-specific schema, not a GROW assumption | Per method |

Every required field is one of `supported`, `partial`, `missing`, `declined`, `unknown`. An already supported field may be reported only from the server Director's **provisional client-authored evidence audit**; assistant text, time spent and model assertions cannot certify it. `supported` is **NOT client-confirmed**. Only an explicit trusted server `client_confirmed` event makes a field `clientConfirmed`. Corrections and topic changes must invalidate obsolete evidence before creating the final receipt.

## Measurements and denominator hygiene

For one session:
- `eligibleRequired` = `totalRequired - explicitlyDeclinedRequired` (only valid if audit present).
- `evidenceCoveragePercent` = 100 × `supportedRequired / eligibleRequired`.
- `partialEvidencePercent` = 100 × `partialRequired / eligibleRequired`.
- `confirmedPercent` = 100 × `clientConfirmedRequired / eligibleRequired`.
- All percentages are **null** when data, trusted final state or denominator is unavailable; NEVER replace null with 0 or 100. Keep the raw total + skip count visible to avoid gaming.

For cohorts:
- `eligibleTerminalCount` = trusted finished sessions **excluding** safety handoffs, pending sessions and unknown outcomes.
- `notFinishedPercent` = 100 × (`client_stopped + abandoned + technical_failure`) / `eligibleTerminalCount`: session **did not reach the recorded summary/closeout**. Explicit client stops and platform failures remain separate, not blame.
- `incompleteOutcomePercent` = 100 × (`completed_partial + client_stopped + abandoned + technical_failure`) / `eligibleTerminalCount`: a wider **no client-confirmed outcome** rate, including sessions that reached an honest partial Summary.
- `reachedCloseoutPercent` = 100 × (`completed_confirmed + completed_partial`) / `eligibleTerminalCount`: did reach Summary, whether or not the outcome was complete.
- `unexpectedExitPercent` = 100 × (`abandoned + technical_failure`) / `eligibleTerminalCount`. Client-chosen boundaries do not count as unexpected exits.
- Field coverage uses ONLY authenticated, trusted, terminal, non-safety session receipts and a **weighted field denominator** across uniquely identified sessions, not an average of rounded percentages; partial and supported always remain distinct.
- Breakdown: `completed_confirmed`, `completed_partial`, `client_stopped`, `abandoned`, `technical_failure`, `safety_handoff`, `paused`, `in_progress`, `unknown`.
- Report by persona, method, language and model/prompt version. For comparison or rankings require >=20 **distinct verified terminal** sessions AND >=20 auditable sessions in the same cohort; compare similar requests/traffic and periods. No public coach ratings.

No event means unknown, never abandoned. Infer `abandoned` only **on the trusted server** after documented reconnect/grace handling, not a tab closure or elapsed 20-minute checkpoint. `client_stopped` must reflect explicit client choice; `technical_failure` must reflect a proven ASR/network/server incident; `safety_handoff` is a successful boundary rather than a coaching failure. Session state must be idempotent and allow retries without double-counting.

## Failure analysis without inventing causes

For each required field that is `partial` or `missing`, store field ID, status, coded cause and coded action only. Supported codes:

| Reason | What can be asserted | Action for coach algorithm |
|---|---|---|
| `not_asked` | No trusted question event was recorded for that field | Check Director stage and missed opportunity |
| `asked_without_accepted_answer` | Question was sent, no accepted answer recorded | Review wording, timing, interruption |
| `insufficient_evidence` | Some relevant evidence, not enough to support completion | One contextual follow-up, not a questionnaire |
| `unverified_answer` | A turn was received but field cannot be verified | Human-review relevance or improve semantic checks |
| `needs_reconfirmation` | Client corrected or changed the answer | Respect correction, re-ask only if relevant |
| `client_declined` | Client skipped a question | Respect choice, no fault or pressure |
| `client_chose_to_stop` | Client explicitly ended | Respect end; never blame or force completion |
| `technical_interruption` | Server-confirmed technical exit | Fix microphone/reconnect/network path, not coaching prompts |
| `safety_handoff` | Safety takes priority | No further productivity pressure; refer appropriately |

These are **observed patterns / review hypotheses**, not claims about a client's motives. To investigate recurring failures: find cohort (coach + method + locale + prompt version), compare field missing rates, inspect permitted **synthetic** test scenarios, propose one versioned prompt change, A/B test against an equivalent cohort, and use qualified review before promoting it. This monitor never autonomously rewrites prompts or trains from private conversations.

## Integration wiring when dependencies merge

1. Use the authenticated **existing server Director** to generate signed lifecycle events and stable session IDs. Never trust browser-submitted lifecycle, field statuses or version strings. Pass source `trusted_server_event` only for server-owned receipts, not a client claim.
2. At every accepted turn, update the **existing** per-session state with method-specific evidence and opaque event IDs. Nothing is new opt-in analytics until valid client consent exists; the live ephemeral screen must continue to work without server storage.
3. At End / Summary or an explicit consented closure, create the QA receipt from that final, current-topic evidence snapshot. Store only controlled field/status/reason codes in authorized owner-only session/report metadata with privacy review, or compute on-demand on authenticated existing records. Keep transcript/audio/health details out of the QA ledger. Honor revocation and account deletion. Never persist sensitive client quotes inside QA.
4. An admin-only monitor may render the aggregated roll-up with `No data yet` / `unknown coverage` and exact denominators, field-by-field gap frequencies, technical vs voluntary exits, language/version cohort filters and reasons. Never expose session IDs or raw quotes in the aggregate JSON or public widget.
5. Before LIVE: atomic source PR + existing Core/Specialist/RLS/consent security gates; merge with PR #5198/#5191 once their exact-head protected state is safe, run signed-in RU/EN/ES real iPhone and session-stop/reconnect/PDF tests. Normal hourly protected Vercel publisher only. Verify canonical alias and deployed SHA before claiming LIVE.

## Completed local unit acceptance in this patch

- All six method-specific information schemas; all ten registered persona mappings.
- Complete/partial/missing/optional/explicit refusal; evidence vs confirmation.
- Technical failure vs stop vs safety vs incomplete closeout, missing audit unknown.
- Field-level reason code generation with client corrections / accepted answer events.
- Privacy: raw client quote/label excluded and private session IDs absent in aggregation.
- Idempotency: duplicate session receipt does not inflate denominator/comparison readiness.

Future E2E and stored analytics are explicitly **not** tested by this pure-module suite.
