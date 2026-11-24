# Coaching Session Director v3 (2026-11-15)

**Scope:** existing authenticated My Coach chat, languages RU/EN/ES. No new
LLM, voice vendor, client database, telemetry or paid capacity.

The chosen coach's main method stays locked. Lexical stage candidates are
now capped by ordered evidence from *client-authored* turns: a stated goal,
confirmed goal plus example and constraints, explored alternatives, then a
client-chosen action with timing and feasibility. Completed-stage flags must
form an uninterrupted prefix; isolated action vocabulary cannot certify
earlier phases. A correction or topic shift in previous history also resets
old milestone evidence on subsequent turns. Submitted chat history remains
untrusted context, never authenticated consent or durable client state.

The post-generation validator now rejects recognizable prematurely proposed
options questions, early commitments and unverified completion claims.
Incompatible questions are removed in favor of a safe model-authored
reflection or a reviewed method-aligned question; free natural phrasing is
preserved. This is a bounded deterministic veto, **not** complete semantic
proof of arbitrary AI text.

At 17 minutes (active browser hint) the Director starts offering a
reflective close, while actual client questions, stop, correction, safety
and topic changes retain precedence. It does not forcibly stop a client
or claim that a plan was agreed. Browser time is untrusted; **hard
20-minute completion cannot be claimed** without a server-authoritative
session clock and a consented close/restart UX.

Run focused `node --test tests/coach-session-director.test.mjs`,
existing `test:coaching:release`, exact-HEAD Core/Specialist/
`hh-merge-check` and genuine RU/EN iPhone multi-turn text/voice QA.
No new provider calls, DB migrations, transcripts or secrets.
