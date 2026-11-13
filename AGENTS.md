# AGENTS.md — Holistic House / Books

**Vercel Sandbox cost guard (2026-11-13):** Before any Sandbox creation or agent test, apply the [cross-project sandbox discipline](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/agent-rules.md#vercel-sandbox-cost-guard--2026-11-13). Prefer GitHub/Vercel read-only connectors and existing CI, reuse at most one short-lived 1-vCPU/2-GB session per task, cap idle time, stop sessions in cleanup, and avoid repeated Playwright/OS dependency installation. Never bypass required tests or protected merge to reduce usage.

## Required cross-project CI wave policy

Before any ChatGPT, Codex, Claude, Hermes or GitHub agent creates/updates a PR, **first read** the global [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md).

**Local, stricter authority:** [Current Holistic House PR automation canon](docs/operations/PR_AUTOMATION_CANONICAL_V1.md). Keep the correct `codex/bootstrap-books` control vs `codex/public-book-library` production branch routing, existing Task leases, exact-HEAD Core/Specialist/Guard, branch protection, and separate verified Vercel LIVE. No financial additions.

**PR and first-remote-push admission:** prepare a coherent source/tests/docs patch **before opening PR**, validate the smallest relevant local checks, publish **one complete HEAD**, open one PR, then freeze HEAD while mandatory checks run. Only a verified required-check failure or urgent security/correctness issue authorizes a new complete repair HEAD, which must be rechecked. Do not publish per-file intermediate commits into an open PR, push no-op commits, retry valid CI merely for status, or rewrite PR title/body for progress (an `edited` event can re-trigger Core). Use comments or existing issue ledgers for progress.

**One root → one PR:** Before any remote publication, compare the verified failure/issue/HH_OPT_ACTION, owner lease, target base and proposed changed paths with bounded existing open and directly superseded/merged PRs. Reuse/handoff matching active work; skip already merged fixes; if ambiguous, HOLD_DUPLICATE_UNVERIFIED (file overlap alone is not proof). Do not open a second PR just to race CI. [Decision tree](docs/operations/PR_REMOTE_ONE_PUBLISH_V1.md#one-root--one-pr-duplicate-admission-before-any-remote-write).

**Pre-push cost/CI guard:** A remote branch push can start CI and a Vercel preview **before** PR opening. Prepare every source/test/doc file locally or in memory; for connector writes use blobs/tree/commit and exactly one branch `update_ref` after verifying the current SHA. See [PR_REMOTE_ONE_PUBLISH_V1](docs/operations/PR_REMOTE_ONE_PUBLISH_V1.md). If remote triggers or extra-cost exposure are unverified, stop with `HOLD_COST_UNVERIFIED` without pushing. Do not repeat an open PR's HEAD while mandatory checks are active.

**Safety:** Never disable/skip required gates, merge stale HEAD, invent timings, introduce new scheduled CI, Vercel preview/build, token/provider or paid service. For non-PR work mark this policy N/A; retain normal product scope and privacy controls.
