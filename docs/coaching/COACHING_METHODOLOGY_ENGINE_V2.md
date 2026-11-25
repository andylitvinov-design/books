# Coaching Methodology Engine v2

Status: deterministic method-selection layer integrated into the existing guided-session follow-up path in this PR. Production status is pending CI, review, merge, Vercel exact-SHA verification and smoke tests.

## Runtime behaviour
- After a saved user answer, the existing authored follow-up selector evaluates the current task (overload, uncertainty, ambivalence, contradiction, advice request, etc.) and selects one localized question.
- Existing one-follow-up-per-stage and five-followups-per-session limits remain.
- Safety, stop and pause requests do not produce ordinary follow-up questions.
- Explicit method selection wins over heuristic routing.
- Deeper pattern/meaning exploration is held at task-level unless explicitly consented, relevant to the goal and safety-clear.
- The engine has no model/provider calls, storage, telemetry or private transcript persistence.
- It does not advance the authored course or change an approved action plan.

## Verification
Run `node --test tests/coaching-methodology.test.mjs tests/coaching-intelligence-offline.test.mjs`, then `npm run test:coaching:release`, scoped lint, typecheck and build.
