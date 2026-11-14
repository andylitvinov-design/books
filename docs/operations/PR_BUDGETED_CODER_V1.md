# Budgeted Qwen PR repair — first-party Agents Director / HH Repair Worker

Owner intent: repair eligible blocked PRs with a **maximum $5/month** of model inference while preserving current $0 deterministic/free worker, exact-HEAD gates, native merge and Vercel LIVE checks. Related [#4602](https://github.com/andylitvinov-design/books/issues/4602). This is a guarded, opt-in **single-file TypeScript pilot**, not proof that every stuck PR is auto-repairable.

## Already integrated (no new scheduler / service)

Existing event → classification → exact-HEAD worker claim → deterministic candidate → existing $0 model (if available) → optional budgeted Qwen → clean code verifier → guarded publisher → required Core/Specialist/Guard → existing native merge. Paid model is used **only** for an independently reproduced TypeScript compiler error in one allowlisted, non-sensitive source file after safe deterministic/free repair does not return a usable proposal.

`paid_fix` checks out **only trusted** `codex/bootstrap-books`, fetches permitted source as GitHub API **data**, and does not run PR code, npm, scripts, tests, or Git writes with the paid key. A model cannot publish: its single-line JSON proposal is rechecked by the existing independent verifier on the exact PR SHA. The existing protected publisher is the only writer.

## Opt-in setup (do not paste secrets into chat, GitHub issues, or source files)

1. In [OpenRouter](https://openrouter.ai/settings/keys), create a **dedicated inference key** for this worker (not a shared chat/free key) with `limit=4.50 USD`, `limit_reset=monthly`. Prefer a separate workspace guardrail of **$5/month**, restrict the allowlist to `qwen/qwen3-coder-next`, and disable auto top-up if avoiding additional credit purchases. OpenRouter account credits are charged independently of GitHub.
2. Put that key in **GitHub repository → Settings → Secrets and variables → Actions → Secrets** as `HH_PR_CODER_OPENROUTER_API_KEY`. Do not put it in Vercel client/Next.js env or export it to an untrusted PR checkout.
3. Only once the hard-cap key is set, add **Actions repository variable** `HH_PR_BUDGETED_CODER_ENABLED=true`. Omission or `false` is the immediate kill switch. No paid call is possible without the key's live verified monthly cap at or below $4.50, model catalog price cap, valid exact HEAD, signed claim and ledger reservation.
4. Make one observed canary on an eligible TS PR under the existing dispatcher; verify an actual signed `RESERVED` and `SETTLED` receipt in [issue #4602](https://github.com/andylitvinov-design/books/issues/4602), an independently verified source patch, new exact-HEAD CI and protected merge. Record Vercel alias + deployed SHA separately. Do not equate proposed / merged / Vercel READY with LIVE.

## Budget and failure policy

- Exact model: `qwen/qwen3-coder-next`; catalog max prices **$0.12/M input, $0.80/M output**, as verified against current provider metadata before each paid call.
- Client uses at most **512 output tokens**, a maximum 18 KB prompt, **$0.02 pessimistic reservation per attempt**, and **$4.50/month internal reservation cap** recorded on existing #4602. The provider enforces a **separate monthly key hard cap <= $4.50**. Both fail closed, no paid fallback.
- At most one paid attempt per PR+HEAD; no unchanged-HEAD retries, no source outside one strict allowlisted file, no secret-bearing source, no blanket semantic merge resolution. A settled result records actual provider usage cost if supplied. An ambiguous charged request retains its pessimistic reservation.
- If the model endpoint is unavailable, provider returns an unknown price/cost/model, provider key is not correctly capped, or the source/error cannot be bounded, status stays **BLOCKED**. Owner-visible evidence is the existing task/CI/PR record plus issue #4602 usage receipts. Never claim that a model response equals a published fix.
- Scope intentionally **does not auto-repair** multiple-file or sensitive source, TypeScript-independent CI failures, manual semantic conflicts, stale HEAD, approval or security gates, billing/provider failures or Vercel deploy problems. Extend only with focused tests and separate owner approval where required.

## Branch, cost and acceptance discipline

`codex/bootstrap-books` is the control-plane target, not the website production branch `codex/public-book-library`. Preserve [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md) and [HH canonical policy](PR_AUTOMATION_CANONICAL_V1.md). This change adds a conditional job to the **existing** HH PR Repair Worker, not an additional cron/workflow. Standard GitHub-hosted public runners remain the existing free tier; billing exposure from Vercel integrations, account credits and artifact storage must still be verified.

Rollout states: `CODE_STAGED` → `PR_CHECKED` → `MERGED_CONTROL_PLANE` → `KEY_GUARDRAIL_READY` → `CANARY_PAID_INFERENCE_VERIFIED` → `REPAIR_VERIFIED` → `LIVE_VERIFIED` (each requires independent receipts). In the absence of key/guardrail receipts this feature is **not ACTIVE**.
