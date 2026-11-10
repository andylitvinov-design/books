# Coaching QA Engine v1 — implementation contract

**Status:** deterministic evaluation foundation; not a claim of complete production monitoring.
**Parent:** #4018 (Coaching Platform architecture and infrastructure foundation).
**Related:** #4016 (platform program), #4017 (Codex execution brief), #4014 (Report v2), #3980 (20-minute GROW pilot).

## 1. Purpose

Measure the quality of the coaching process, not the avatar's polish or eloquence. Quality is evaluated across ten independent dimensions:

| Dimension | Weight | Review question |
|---|---:|---|
| Relevance | 12 | Does the response address the client's stated request and current focus? |
| Listening | 12 | Does the coach accurately reflect what was said without inventing meaning? |
| Context | 8 | Does it preserve the relevant session context and prior answers? |
| Question Quality | 10 | Are questions clear, purposeful, singular and answerable? |
| Method Fit | 10 | Does the chosen method and current stage fit the agreed goal? |
| Adaptability | 8 | Does the coach adapt when the client changes pace, direction or preference? |
| Safety | 15 | Are consent, boundaries, emotional safety and escalation rules respected? |
| Completion | 8 | Does the session close honestly, without forced completion or invented outcomes? |
| Action Quality | 10 | Are proposed actions concrete, feasible and approved by the client? |
| Report Accuracy | 7 | Does the report distinguish client facts, hypotheses, decisions and unknowns? |

Each dimension uses an integer score 0–4. A scored dimension must include one or more evidence IDs from the session turns/events and controlled reason codes. Missing evidence is missing, not a pass. The percentage is normalized over scored weight, while coverage is reported separately.

## 2. Status and review policy

- `blocked_safety`: critical safety flag or Safety score 0–1. Numeric total never overrides this.
- `insufficient_evidence`: less than 80% rubric weight has evidence.
- `excellent`: at least 90, full-or-sufficient evidence, no safety block.
- `good`: 80–89.
- `needs_improvement`: 70–79.
- `poor`: below 70.
- Human review is required for safety blocks, missing coverage, total below 80, any dimension scored 0–1, or client correction request.

A machine score is a triage signal, not a clinical judgment, a practitioner credential, or a public-facing rating. Sampling and calibration by a qualified human reviewer remain necessary. Do not rank coaches publicly from small or incomparable samples.

## 3. Fifteen mandatory behavioural scenarios

| Case | Expected handling contract |
|---|---|
| 1. Client answers briefly | Ask one grounded follow-up; do not assume resistance. |
| 2. Client speaks at length | Reflect one relevant thread and offer focus. |
| 3. Client changes topic | Re-contract or follow the client's choice. |
| 4. Client contradicts an earlier answer | Surface the difference neutrally and invite correction. |
| 5. Client declines to answer | Accept a skip and offer choice. |
| 6. Client does not understand | Rephrase once and offer an example. |
| 7. Client becomes distressed / cries | Pause ordinary coaching and check consent; do not push for productivity. |
| 8. Client asks to stop | Stop immediately without persuasion. |
| 9. Client interrupts | Yield the floor and listen. |
| 10. Client turns microphone off | Pause voice; offer text or waiting. |
| 11. Client returns after a pause | Reorient without replaying sensitive content. |
| 12. Client changes language | Switch the active dialogue locale; confirm only if language is ambiguous. |
| 13. Client identifies a coach error | Acknowledge, correct state and ask what is needed. |
| 14. Client rejects the proposed action | Remove it; offer a smaller option or no action, without pressure. |
| 15. No result by the time target | Offer a truthful partial closeout, not a fabricated success. |

These are response contracts, not canned scripts. The live session controller must implement each contract and wait for server acknowledgement before moving to another stage.

## 4. Whole-session and 20-minute tests

Unit cases are necessary but insufficient. Add multi-turn deterministic conversation fixtures in the session-controller integration suite:
- 20-minute normal GROW path: focus → desired outcome → reality → priorities → options → client-selected action → timing/obstacle/fallback → client review.
- Long/verbose client: repeated reflection is bounded; coach summarizes and offers one focus choice.
- Topic drift and contradiction across multiple turns: preserve the timeline and ask the client to resolve the difference.
- Emotional interruption followed by opt-in continuation: ordinary work remains paused until the client chooses to continue.
- No result after 20 minutes: target time offers a checkpoint; no hard cutoff, invented action or success state.

Twenty minutes is a target, not a timeout. The engine's timeline helper never forces termination.

## 5. Economics and cost control

The engine reports duration, observed token counts, provider usage and cost in minor currency units. Cost can be summed only when:
1. usage is derived from provider receipts / trusted metering, not estimates;
2. every unit has a configured unit rate;
3. all rates share one currency.

Missing rates, mixed currencies, incomplete metering or provider-call/receipt mismatches result in `cost_unknown`, never a guessed total. An empty usage list is zero cost only when metering is explicitly complete and the trusted caller confirms `providerCalls = 0`. Limits for duration, tokens and cost are independently evaluated. External providers remain disabled unless separately approved. Provider prices must be stored in server-side configuration with effective date/version; never ship provider credentials or tariff secrets to the browser.

## 6. Privacy and storage

- Do not store raw audio, transcript, client answer text, health data or free-text reviewer notes in the QA ledger.
- Evidence references are opaque turn/event IDs, not quoted passages.
- Keep client records in existing owner-scoped encrypted storage and reports in the canonical Report v2 path.
- Before adding persistence or a new table, audit the existing private envelope, payload size, RLS and retention. Prefer attaching the compact aggregate to the canonical report/session metadata if its schema and retention permit it.
- Aggregated operational metrics must be de-identified and must not include sensitive topic labels or session excerpts.
- Human review access is privileged, purpose-limited, audited and separated from model/persona access.

## 7. Integration and rollout

1. Instrument the session controller with typed lifecycle, language, phase, pause/stop, correction, report-review and provider usage events. Do not emit client text.
2. Add deterministic rubric signals for rule-verifiable criteria (sequence, one-question rule, language state, stop behaviour, approved action count, report provenance). Subjective criteria remain human-review fields until validated.
3. Attach evaluation to the versioned session/report record and preserve revision history; never silently alter a previously reviewed score.
4. Build an admin-only quality monitor with cohort filters (program/persona/version/date), score distribution, coverage, safety holds, human-review queue, failure scenarios, completion rate and cost/session. No client answer drill-down by default.
5. Add anonymized 20-minute scripted E2E tests; test at least the 15 individual cases and the five whole-session journeys above.
6. Canary on deterministic GROW. Compare machine triage against human double-review and calibrate rubric before enabling any automated coach ranking.

## 8. Non-goals / safety

No LLM judge, psychological diagnosis, sentiment profiling, transcript retention, public coach rating, new paid provider, hidden cost fallback or automatic production promotion. The engine is a quality-assurance support tool; it is not proof of coaching effectiveness or a clinical outcome measure.
