# Wave Empathy Mind v1 — shared conversational empathy

Owner requirement: https://github.com/andylitvinov-design/books/issues/4853
Production source: codex/public-book-library. This is a source-level implementation description, **not** evidence that Telegram Business, the opt-in V3 psychologist or the iPhone coaching UI is LIVE.

## Existing architecture, extended rather than duplicated

- Reaction Mind recognizes directly stated simple emotions; Judgment and Reasoning identify evidence and choose safe dialog intent. Both remain authoritative for their original functions.
- New empathy-mind.mjs is a **pure, no-network, no-storage advisory** to reflect an explicitly self-reported feeling, acknowledge contradictory wants and risks, and choose a gentle next move. Its authored response never authorizes advice, clinician work, booking, sales, action, memory or consent.
- Natural Dialogue consumes the same cues for permitted inference and provider-free fallback. Direct service/price intent always outranks an emotion-led response; distress never triggers an automatic catalogue recommendation.
- Wave Native calls the new planner only where v1 Reaction Mind has not already generated a simple acknowledgment, before the generic social/stage fallback. It remains useful with Qwen offline or OpenRouter unavailable.
- Existing My Coach Director receives an *advisory reflection* in the existing controlled prompt and provider-free offline response. The Director still owns method, allowed question, stage, progress signals, no-advice, user-owned action and veto.
- Secretary Psychologist implementation is being developed in PR #4844. **This v1 change does not override or claim to integrate its still-open Telegram V3/Business mode.** Future owner of #4844/#4845 must import the same planner after opt-in and owner-scoped consent verification; no alternative empathy engine.

## Evidence, uncertainty and boundaries

Only direct first-person self-reports in RU/EN/ES; guard negation, quoted/some hypothetical/third-party talk, medical/crisis phrases and direct media/order/service tasks. This is a limited, deterministic recognition baseline, **not** semantic or clinical emotion understanding. An unmatched message is normal: return null and let established conversation routing handle it. No confidences or percentages fabricated from keyword matches.

No-advice refusal remains in recent consented user turns until they explicitly request advice; only the host can authorize action. Questions are optional and at most one; do not ask the exact same question again if it appears in recent assistant turns. Corrected present statements take priority over old hypotheses. Do not keep raw user text in returned metadata or in QA logs.

## Tests and rollout

Pure offline regression: tests/empathy-mind.test.mjs (125 deterministic cases/assertions, RU/EN/ES, mixed feelings, stop, negation, no-advice, third-party, direct tasks, consent downgrade and overflow). Integration: tests/wave-empathy-integration.test.mjs. Existing emotional-reaction, natural-dialogue, Wave native and coach Director tests must remain green.

Do not introduce new DB, cost, model or scheduler. Prepare one atomic source PR following GLOBAL_PR_ONE_PUBLISH_V1. Required exact-HEAD Core/Specialist/Guard, protected merge and existing hourly Vercel Production channel apply. A green PR/merge/HTTP 200 is **not** evidence of actual source-sha LIVE, Telegram Business opt-in or real client delivery. Validate merged SHA on canonical alias, then guest browser RU/EN/ES and real authorized coach/provider E2E.
